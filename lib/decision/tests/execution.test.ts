/**
 * Validation Execution Engine 测试（V0.4.1 Phase 7B-2）。
 * 覆盖：状态机 / 生命周期（含 actor）/ 超期 / 计划派生状态与进度 / Result 约束与回写 /
 * priority / 学习事件接口 / 执行摘要。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyTaskTransition,
  buildExecutionSummary,
  canTransition,
  computeProgress,
  derivePlanStatus,
  isOverdue,
  isTerminal,
  listOverdueTasks,
  ValidationExecutionError,
} from "../execution";
import { createExecutionLearningEvents } from "../learning";
import { createDecisionService, makeResearchRun } from "./helpers";
import type { ValidationPlan, ValidationTask } from "../types";

function makeTask(overrides: Partial<ValidationTask> = {}): ValidationTask {
  return {
    id: "t1",
    planId: "p1",
    assumption: "10 月话题热度达峰值",
    hypothesis: "峰值 ≥ 2 倍",
    method: "Google Trends",
    sampleSize: "建议 20-50",
    successCriteria: "峰值 ≥ 2 倍",
    failureCriteria: "未达标",
    deadline: "2026-09-30",
    costEstimate: "待估算",
    owner: "本人",
    priority: "medium",
    status: "pending",
    createdAt: "2026-08-24T00:00:00.000Z",
    updatedAt: "2026-08-24T00:00:00.000Z",
    ...overrides,
  };
}

// ---------- 1. 状态机 ----------
test("状态机：合法/非法转移、终态", () => {
  assert.equal(canTransition("pending", "running"), true);
  assert.equal(canTransition("running", "completed"), true);
  assert.equal(canTransition("failed", "running"), true);
  assert.equal(canTransition("completed", "pending"), true, "允许 reopen");
  assert.equal(canTransition("completed", "running"), false, "completed 不能直接 running");
  assert.equal(canTransition("cancelled", "completed"), false);
  assert.equal(isTerminal("completed"), true);
  assert.equal(isTerminal("cancelled"), true);
  assert.equal(isTerminal("running"), false);
});

test("applyTaskTransition：合法转移记录 stateHistory（含 actor/note）+ startedAt/completedAt", () => {
  const running = applyTaskTransition(makeTask(), "running", { actor: "alice", note: "开始执行" });
  assert.equal(running.status, "running");
  assert.equal(running.startedAt, running.stateHistory?.[0].at);
  assert.equal(running.stateHistory?.[0].actor, "alice");
  assert.equal(running.stateHistory?.[0].note, "开始执行");

  const done = applyTaskTransition(running, "completed", { actor: "alice" });
  assert.equal(done.status, "completed");
  assert.ok(done.completedAt);
  assert.equal(done.stateHistory?.length, 2);
  assert.equal(done.stateHistory?.[1].from, "running");
  assert.equal(done.stateHistory?.[1].to, "completed");
});

test("applyTaskTransition：非法转移抛 ValidationExecutionError；同状态 no-op", () => {
  assert.throws(() => applyTaskTransition(makeTask({ status: "completed" }), "running"), ValidationExecutionError);
  const t = makeTask({ status: "pending" });
  assert.equal(applyTaskTransition(t, "pending"), t, "同状态返回原对象");
});

// ---------- 2. 超期 / 计划状态 / 进度 ----------
test("isOverdue：未完成且 deadline 已过 → true；completed 不算超期", () => {
  const past = makeTask({ deadline: "2020-01-01" });
  assert.equal(isOverdue(past, new Date("2026-01-01")), true);
  assert.equal(isOverdue(makeTask({ deadline: "2020-01-01", status: "completed" }), new Date("2026-01-01")), false);
  assert.equal(isOverdue(makeTask({ deadline: "2030-01-01" }), new Date("2026-01-01")), false);
});

test("derivePlanStatus / computeProgress", () => {
  assert.equal(derivePlanStatus([]), "not_started");
  assert.equal(derivePlanStatus([makeTask(), makeTask({ id: "t2" })]), "not_started");
  assert.equal(derivePlanStatus([makeTask({ status: "running" })]), "in_progress");
  assert.equal(derivePlanStatus([makeTask({ status: "completed" }), makeTask({ status: "running" })]), "in_progress");
  assert.equal(derivePlanStatus([makeTask({ status: "completed" }), makeTask({ id: "t2", status: "completed" })]), "completed");
  assert.equal(derivePlanStatus([makeTask({ status: "failed" }), makeTask({ id: "t2", status: "running" })]), "blocked");

  const progress = computeProgress([
    makeTask({ status: "completed" }),
    makeTask({ id: "t2", status: "running", deadline: "2020-01-01" }),
    makeTask({ id: "t3", status: "pending", deadline: "2020-01-01" }),
    makeTask({ id: "t4", status: "cancelled" }),
  ], new Date("2026-01-01"));
  assert.equal(progress.done, 1);
  assert.equal(progress.cancelled, 1);
  assert.equal(progress.total, 4);
  assert.equal(progress.percent, 33);
  assert.equal(progress.overdue, 2);
});

test("listOverdueTasks：只返回超期未完成", () => {
  const tasks = [
    makeTask({ deadline: "2020-01-01" }),
    makeTask({ id: "t2", deadline: "2020-01-01", status: "completed" }),
    makeTask({ id: "t3", deadline: "2030-01-01" }),
  ];
  const overdue = listOverdueTasks(tasks, new Date("2026-01-01"));
  assert.equal(overdue.length, 1);
  assert.equal(overdue[0].id, "t1");
});

// ---------- 3. Service 集成 ----------
test("service：生命周期 start → fail → retry → complete（记录 actor）", async () => {
  const { service, researchRepo } = createDecisionService();
  await makeResearchRun(researchRepo, "opp-ex1");
  const { decision } = await service.createDecision({
    opportunityId: "opp-ex1", decision: "validate", differentFromAi: false,
    judgment: { why: "w", coreJudgment: "c", keyEvidence: "e", biggestRisk: "r", mostImportantAssumption: "a", expectedOutcome: "o" },
  });
  const plan = await service.createValidationPlan({
    decisionId: decision.id, opportunityId: "opp-ex1",
    tasks: [{ assumption: "a", hypothesis: "h", method: "m", sampleSize: "s", successCriteria: "sc", failureCriteria: "fc", deadline: "2030-01-01", costEstimate: "c", owner: "me", priority: "high" }],
  });
  const taskId = plan.tasks[0].id;

  const running = await service.startTask(taskId, { actor: "bob" });
  assert.equal(running.status, "running");
  assert.equal(running.priority, "high", "priority 应持久化");

  const failed = await service.failTask(taskId, "数据不足", { actor: "bob" });
  assert.equal(failed.status, "failed");

  const retried = await service.retryTask(taskId, { actor: "bob" });
  assert.equal(retried.status, "running");

  const done = await service.completeTask(taskId, { actor: "bob" });
  assert.equal(done.status, "completed");
  assert.ok(done.completedAt);
  assert.equal(done.stateHistory?.length, 4);
});

test("service：submitValidationResult 状态约束 + 任务回写 + 执行事件", async () => {
  const { service, researchRepo } = createDecisionService();
  await makeResearchRun(researchRepo, "opp-ex2");
  const { decision } = await service.createDecision({
    opportunityId: "opp-ex2", decision: "validate", differentFromAi: false,
    judgment: { why: "w", coreJudgment: "c", keyEvidence: "e", biggestRisk: "r", mostImportantAssumption: "a", expectedOutcome: "o" },
  });
  const plan = await service.createValidationPlan({
    decisionId: decision.id, opportunityId: "opp-ex2",
    tasks: [{ assumption: "a", hypothesis: "h", method: "m", sampleSize: "s", successCriteria: "sc", failureCriteria: "fc", deadline: "2030-01-01", costEstimate: "c", owner: "me" }],
  });
  const taskId = plan.tasks[0].id;

  // pending 提交 = 自动完成（向后兼容旧流程）
  const autoDone = await service.submitValidationResult(
    { taskId, actualSample: "10", actualResult: "首次结果", userFeedback: "f", outcome: "confirmed", submittedBy: "me" },
    { actor: "alice" },
  );
  assert.equal(autoDone.result.outcome, "confirmed");
  const afterAuto = await service.getExecutionSummary(decision.id);
  assert.equal(afterAuto.tasks[0].status, "completed", "pending 提交结果应自动完成");
  assert.equal(afterAuto.tasks[0].lastTransition?.to, "completed");
  assert.equal(afterAuto.tasks[0].lastTransition?.actor, "alice");

  // 重新创建第二个计划用于 cancelled 约束测试
  const plan2 = await service.createValidationPlan({
    decisionId: decision.id, opportunityId: "opp-ex2",
    tasks: [{ assumption: "a2", hypothesis: "h", method: "m", sampleSize: "s", successCriteria: "sc", failureCriteria: "fc", deadline: "2030-01-01", costEstimate: "c", owner: "me" }],
  });
  const task2Id = plan2.tasks[0].id;
  await service.cancelTask(task2Id, "放弃", { actor: "bob" });
  await assert.rejects(
    () => service.submitValidationResult({ taskId: task2Id, actualSample: "10", actualResult: "r", userFeedback: "f", outcome: "confirmed", submittedBy: "me" }),
    /cancelled 不允许提交结果/,
  );

  const { result } = await service.submitValidationResult(
    { taskId, actualSample: "20", actualResult: "转化率 3%", userFeedback: "好", actualConversionRate: 3, outcome: "confirmed", submittedBy: "me" },
    { actor: "bob" },
  );
  assert.equal(result.outcome, "confirmed");

  const summary = await service.getExecutionSummary(decision.id);
  assert.equal(summary.status, "completed");
  assert.equal(summary.progress.done, 1);
  const task = summary.tasks[0];
  assert.equal(task.status, "completed");
  assert.equal(task.resultId, result.id);
  assert.equal(task.outcome, "confirmed");
  assert.ok(task.completedAt);

  // 学习事件应包含 result_submitted 的 validation 事件
  const events = await service.listEvents("opp-ex2");
  assert.ok(events.some((e) => e.skill === "validation" && e.signal === "positive"), "应生成验证学习事件");
});

test("service：getExecutionSummary 超期标记 / listOverdueTasks", async () => {
  const { service, researchRepo } = createDecisionService();
  await makeResearchRun(researchRepo, "opp-ex3");
  const { decision } = await service.createDecision({
    opportunityId: "opp-ex3", decision: "validate", differentFromAi: false,
    judgment: { why: "w", coreJudgment: "c", keyEvidence: "e", biggestRisk: "r", mostImportantAssumption: "a", expectedOutcome: "o" },
  });
  await service.createValidationPlan({
    decisionId: decision.id, opportunityId: "opp-ex3",
    tasks: [{ assumption: "a", hypothesis: "h", method: "m", sampleSize: "s", successCriteria: "sc", failureCriteria: "fc", deadline: "2020-01-01", costEstimate: "c", owner: "me" }],
  });
  const overdue = await service.listOverdueTasks(decision.id);
  assert.equal(overdue.length, 1);
});

// ---------- 4. 学习事件接口 ----------
test("createExecutionLearningEvents：动作 → skill/signal 确定性映射", () => {
  const task = makeTask();
  const base = { userId: "u", opportunityId: "o", decisionId: "d", task };
  const started = createExecutionLearningEvents({ ...base, action: "task_started", actor: "bob" });
  assert.equal(started[0].skill, "validation");
  assert.equal(started[0].signal, "neutral");

  const done = createExecutionLearningEvents({ ...base, action: "task_completed", task: { ...task, outcome: "confirmed" } });
  assert.equal(done[0].signal, "positive");

  const rejected = createExecutionLearningEvents({ ...base, action: "result_submitted", result: { id: "r1", taskId: "t1", planId: "p1", decisionId: "d", opportunityId: "o", actualSample: "s", actualResult: "r", userFeedback: "f", outcome: "rejected", submittedBy: "me", submittedAt: "now" } });
  assert.equal(rejected[0].signal, "positive", "证伪也是学习");
});

// ---------- 5. 执行摘要 ----------
test("buildExecutionSummary：含每任务状态/结果/上次转移", () => {
  const task = applyTaskTransition(makeTask(), "running", { actor: "a" });
  const plan: ValidationPlan = {
    id: "p1", decisionId: "d1", opportunityId: "o1", tasks: [task], createdAt: "now", updatedAt: "now",
  };
  const summary = buildExecutionSummary(plan, []);
  assert.equal(summary.status, "in_progress");
  assert.equal(summary.tasks[0].lastTransition?.to, "running");
  assert.equal(summary.tasks[0].lastTransition?.actor, "a");
});