import { test } from "node:test";
import assert from "node:assert/strict";
import { createDecisionService, createReviewRunAi, makeResearchRun } from "./helpers";

async function setupDecision(service: ReturnType<typeof createDecisionService>["service"], opportunityId: string) {
  const { decision } = await service.createDecision({
    opportunityId,
    decision: "validate",
    differentFromAi: false,
    judgment: { why: "w", coreJudgment: "c", keyEvidence: "e", biggestRisk: "r", mostImportantAssumption: "a", expectedOutcome: "o" },
  });
  return decision;
}

/** 5. Validation 创建 */
test("创建验证计划：任务包含全部字段", async () => {
  const { service, researchRepo } = createDecisionService();
  await makeResearchRun(researchRepo, "opp-v1");
  const decision = await setupDecision(service, "opp-v1");

  const plan = await service.createValidationPlan({
    decisionId: decision.id,
    opportunityId: "opp-v1",
    tasks: [
      {
        assumption: "用户愿意为自动化付费",
        hypothesis: "≥7/10 访谈用户愿意按月付费",
        method: "访谈 + 定价测试",
        sampleSize: "10 位目标用户",
        successCriteria: "≥7 人愿意付费",
        failureCriteria: "<4 人愿意付费",
        deadline: "2026-09-30",
        costEstimate: "¥500",
        owner: "周天伦",
        relatedDimension: "willingnessToPay",
      },
    ],
  });

  assert.ok(plan.id);
  assert.equal(plan.decisionId, decision.id);
  assert.equal(plan.tasks.length, 1);
  const task = plan.tasks[0];
  assert.equal(task.status, "pending");
  assert.equal(task.assumption, "用户愿意为自动化付费");
  assert.equal(task.relatedDimension, "willingnessToPay");
  assert.equal(task.method, "访谈 + 定价测试");
  assert.ok(task.successCriteria && task.failureCriteria && task.deadline && task.costEstimate && task.owner);
});

/** 6. Validation 状态流转 */
test("验证任务状态流转：pending → running → completed", async () => {
  const { service, researchRepo } = createDecisionService();
  await makeResearchRun(researchRepo, "opp-v2");
  const decision = await setupDecision(service, "opp-v2");
  const plan = await service.createValidationPlan({
    decisionId: decision.id,
    opportunityId: "opp-v2",
    tasks: [{ assumption: "a", hypothesis: "h", method: "m", sampleSize: "s", successCriteria: "sc", failureCriteria: "fc", deadline: "d", costEstimate: "c", owner: "o" }],
  });
  const taskId = plan.tasks[0].id;

  let task = await service.updateTaskStatus(taskId, "running");
  assert.equal(task.status, "running");
  task = await service.updateTaskStatus(taskId, "completed");
  assert.equal(task.status, "completed");
  const plan2 = await service.getPlan(decision.id);
  assert.equal(plan2?.tasks[0].status, "completed");
});

/** 7. Validation Result 保存（真实数据） */
test("提交验证结果：保存实际样本/结果/转化率/收入/成本", async () => {
  const { service, researchRepo } = createDecisionService();
  await makeResearchRun(researchRepo, "opp-v3");
  const decision = await setupDecision(service, "opp-v3");
  const plan = await service.createValidationPlan({
    decisionId: decision.id,
    opportunityId: "opp-v3",
    tasks: [{ assumption: "a", hypothesis: "h", method: "m", sampleSize: "s", successCriteria: "sc", failureCriteria: "fc", deadline: "d", costEstimate: "c", owner: "o" }],
  });
  const taskId = plan.tasks[0].id;

  const { result } = await service.submitValidationResult({
    taskId,
    actualSample: "12 位用户",
    actualResult: "9 人愿意按月付费 99 元",
    userFeedback: "价格 99 元可接受",
    actualConversionRate: 0.75,
    actualRevenue: 891,
    actualCost: 500,
    otherEvidence: "问卷截图",
    outcome: "confirmed",
    submittedBy: "test-user",
  });

  assert.equal(result.actualSample, "12 位用户");
  assert.equal(result.actualConversionRate, 0.75);
  assert.equal(result.actualRevenue, 891);
  assert.equal(result.outcome, "confirmed");
  assert.equal(result.submittedBy, "test-user");

  const results = await service.listResults(plan.id);
  assert.equal(results.length, 1);
});

/** 11. AI 不能伪造 Validation Result */
test("AI 不能伪造验证结果：即使 runAi 抛错，验证结果仍可正常保存", async () => {
  const throwingRunAi = createReviewRunAi({ contentFor: () => undefined }); // 永远抛错
  const { service, researchRepo } = createDecisionService({ runAi: throwingRunAi });
  await makeResearchRun(researchRepo, "opp-v4");
  const decision = await setupDecision(service, "opp-v4");
  const plan = await service.createValidationPlan({
    decisionId: decision.id,
    opportunityId: "opp-v4",
    tasks: [{ assumption: "a", hypothesis: "h", method: "m", sampleSize: "s", successCriteria: "sc", failureCriteria: "fc", deadline: "d", costEstimate: "c", owner: "o" }],
  });

  const { result } = await service.submitValidationResult({
    taskId: plan.tasks[0].id,
    actualSample: "8 位",
    actualResult: "仅 2 人愿意付费",
    userFeedback: "价格过高",
    outcome: "rejected",
    submittedBy: "test-user",
  });
  assert.equal(result.outcome, "rejected");
  assert.equal(throwingRunAi.calls.length, 0, "验证结果路径绝不调用 AI");
});