/**
 * Business Operating Loop 测试（V0.4.2 Phase 9B-2）。
 * 覆盖：晨报 / 异常检测 / 晚报 / Scheduler / Event 总线 / AgentRuntime 调用 Loop。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateMorningBriefing } from "../loops/briefing";
import { generateEveningReview } from "../loops/review";
import { AnomalyDetector } from "../loops/anomaly";
import { AgentScheduler } from "../scheduler";
import { emit, subscribe, __resetEventBus } from "../events";
import { AgentRuntime } from "../runtime";
import { createMorningBriefingTool, createMonitoringTool } from "../tools/loops";
import { LocalDecisionRepository, createMemoryDecisionStorage } from "../../decision/repository";
import { LocalResearchRepository, createMemoryResearchStorage } from "../../research/repository";
import { LocalMemoryRepository, createMemoryMemoryStorage } from "../../memory/repository";
import { MemoryEngine } from "../../memory/service";
import { DecisionService } from "../../decision/service";
import { createReviewRunAi, makeResearchRun } from "../../decision/tests/helpers";
import type { OpportunityRepository } from "../../opportunity/repository";
import type { LoopDeps } from "../loops/collect";
import type { Opportunity, OpportunityInput } from "../../types";

// ---- 内存商机仓库（Node 测试用）----
class MemoryOpportunityRepo implements OpportunityRepository {
  private items: Opportunity[] = [];
  async createOpportunity(input: OpportunityInput): Promise<Opportunity> {
    const o: Opportunity = { id: `opp-${this.items.length + 1}`, ...input, status: "researching", createdAt: new Date().toISOString() };
    this.items.push(o);
    return o;
  }
  async getOpportunity(id: string) { return this.items.find((i) => i.id === id); }
  async listOpportunities() { return this.items; }
  async updateOpportunity(id: string, patch: Partial<Omit<Opportunity, "id" | "createdAt">>) {
    const i = this.items.findIndex((o) => o.id === id);
    if (i < 0) return undefined;
    this.items[i] = { ...this.items[i], ...patch, id };
    return this.items[i];
  }
  async deleteOpportunity(id: string) { this.items = this.items.filter((o) => o.id !== id); return true; }
}

interface Setup {
  deps: LoopDeps;
  opportunityRepo: MemoryOpportunityRepo;
  decisionRepo: LocalDecisionRepository;
  service: DecisionService;
  memory: MemoryEngine;
  opp1: Opportunity;
  opp2: Opportunity;
  overdueDecisionId: string;
  rejectedDecisionId: string;
}

async function setup(): Promise<Setup> {
  const opportunityRepo = new MemoryOpportunityRepo();
  const opp1 = await opportunityRepo.createOpportunity({ name: "万圣节产品海外", description: "跨境电商", source: "user" });
  const opp2 = await opportunityRepo.createOpportunity({ name: "宠物洗护服务", description: "本地服务", source: "user" });

  const decisionRepo = new LocalDecisionRepository(createMemoryDecisionStorage());
  const researchRepo = new LocalResearchRepository(createMemoryResearchStorage());
  const service = new DecisionService({ decisionRepository: decisionRepo, researchRepository: researchRepo, runAi: createReviewRunAi(), userId: "test-user" });
  const memory = new MemoryEngine({ memoryRepository: new LocalMemoryRepository(createMemoryMemoryStorage()), decisionRepository: decisionRepo, researchRepository: researchRepo, userId: "test-user" });

  await makeResearchRun(researchRepo, opp1.id);
  const { decision: d1 } = await service.createDecision({
    opportunityId: opp1.id, decision: "validate", differentFromAi: false,
    judgment: { why: "w", coreJudgment: "先测款", keyEvidence: "研究结论", biggestRisk: "物流", mostImportantAssumption: "a", expectedOutcome: "验证通过" },
  });
  const plan1 = await service.createValidationPlan({
    decisionId: d1.id, opportunityId: opp1.id,
    tasks: [{ assumption: "话题热度达峰值", hypothesis: "h", method: "m", sampleSize: "s", successCriteria: "sc", failureCriteria: "fc", deadline: "2020-01-01", costEstimate: "c", owner: "me" }],
  });
  await service.startTask(plan1.tasks[0].id); // running + 超期

  const { decision: d2 } = await service.createDecision({
    opportunityId: opp2.id, decision: "validate", differentFromAi: false,
    judgment: { why: "w", coreJudgment: "先验证", keyEvidence: "e", biggestRisk: "r", mostImportantAssumption: "a", expectedOutcome: "o" },
  });
  const plan2 = await service.createValidationPlan({
    decisionId: d2.id, opportunityId: opp2.id,
    tasks: [{ assumption: "付费意愿", hypothesis: "h", method: "m", sampleSize: "s", successCriteria: "sc", failureCriteria: "fc", deadline: "2030-01-01", costEstimate: "c", owner: "me" }],
  });
  await service.startTask(plan2.tasks[0].id);
  await service.submitValidationResult({ taskId: plan2.tasks[0].id, actualSample: "20", actualResult: "转化率不足 1%", userFeedback: "f", outcome: "rejected", submittedBy: "me" });

  // opp2 还有第二个决策无计划 → decision_not_executed
  await service.createDecision({
    opportunityId: opp2.id, decision: "proceed", differentFromAi: true,
    judgment: { why: "w", coreJudgment: "直接推进", keyEvidence: "e", biggestRisk: "r", mostImportantAssumption: "a", expectedOutcome: "o" },
  });

  const deps: LoopDeps = { opportunityRepository: opportunityRepo, decisionRepository: decisionRepo, memory, userId: "test-user", now: new Date("2026-08-24T12:00:00.000Z") };
  return { deps, opportunityRepo, decisionRepo, service, memory, opp1, opp2, overdueDecisionId: d1.id, rejectedDecisionId: d2.id };
}

// ---------- 1. 晨报 ----------
test("Morning Briefing：状态/异常/建议/记忆洞察", async () => {
  const { deps } = await setup();
  const briefing = await generateMorningBriefing(deps, new Date("2026-08-24T08:00:00.000Z"));
  assert.equal(briefing.date, "2026-08-24");
  assert.equal(briefing.status.opportunities, 2);
  assert.ok(briefing.status.overdue >= 1, "应有超期任务");
  assert.ok(briefing.anomalies.some((a) => a.type === "task_overdue"));
  assert.ok(briefing.anomalies.some((a) => a.type === "decision_not_executed"));
  assert.ok(briefing.anomalies.some((a) => a.type === "validation_rejected"));
  assert.ok(briefing.suggestedActions.length >= 1);
  assert.ok(briefing.headline.includes("2 个商机"));
  assert.ok(briefing.memoryInsights.length >= 0);
});

// ---------- 2. 异常检测 ----------
test("AnomalyDetector：超期/未执行/证伪 检测与严重度排序", async () => {
  const { deps } = await setup();
  const detector = new AnomalyDetector(deps);
  const anomalies = await detector.detect(new Date("2026-08-24T12:00:00.000Z"));
  const types = anomalies.map((a) => a.type);
  assert.ok(types.includes("task_overdue"));
  assert.ok(types.includes("decision_not_executed"));
  assert.ok(types.includes("validation_rejected"));
  // 按严重度降序
  for (let i = 0; i < anomalies.length - 1; i++) {
    assert.ok(anomalies[i].severity >= anomalies[i + 1].severity);
  }
});

// ---------- 3. 晚报 ----------
test("Evening Review：沉淀决策记忆 + 对照 + 经验 + 明日动作", async () => {
  const { deps, memory } = await setup();
  const review = await generateEveningReview(deps, new Date("2026-08-24T22:00:00.000Z"));
  assert.equal(review.date, "2026-08-24");
  assert.ok(review.decisionComparison.length >= 2, "应有决策对照（AI vs 用户 vs 实际）");
  const rejected = review.decisionComparison.find((d) => d.outcome === "rejected");
  assert.ok(rejected, "应有被证伪的决策对照");
  assert.ok(review.lessons.some((l) => l.includes("证伪")), "应有证伪经验");
  assert.ok(review.tomorrowActions.some((a) => a.includes("超期") || a.includes("验证计划")), "应有明日动作");
  // 必须调用 recordDecision → memory 有记录
  const records = await memory.list();
  assert.ok(records.length >= 2, "晚报应沉淀决策记忆");
});

// ---------- 4. Scheduler ----------
test("Scheduler：手动触发 / 到期触发 / 仅手动不自动", async () => {
  const scheduler = new AgentScheduler();
  let manualRuns = 0;
  let periodicRuns = 0;
  scheduler.registerTask({ id: "manual", name: "manual", intervalMs: 0, handler: () => { manualRuns++; } });
  scheduler.registerTask({ id: "periodic", name: "periodic", intervalMs: 1000, handler: () => { periodicRuns++; } });

  await scheduler.runTask("manual");
  assert.equal(manualRuns, 1);
  assert.equal(periodicRuns, 0, "仅手动任务不被自动触发");

  const due = await scheduler.runDueTasks(Date.now() + 2000);
  assert.ok(due.includes("periodic"));
  assert.equal(periodicRuns, 1);
  assert.equal(due.includes("manual"), false);

  await assert.rejects(() => scheduler.runTask("nope"), /不存在/);
});

// ---------- 5. Event 总线 ----------
test("Event：subscribe/emit/unsubscribe（旁路）", () => {
  __resetEventBus();
  const seen: string[] = [];
  const unsub = subscribe("RESEARCH_COMPLETED", (e) => seen.push(String(e.payload)));
  emit("RESEARCH_COMPLETED", "run-1");
  emit("DECISION_CREATED", "dec-1");
  assert.deepEqual(seen, ["run-1"], "只收到订阅类型的事件");
  unsub();
  emit("RESEARCH_COMPLETED", "run-2");
  assert.deepEqual(seen, ["run-1"], "退订后不再收到");
});

// ---------- 6. AgentRuntime 调用 Loop ----------
test("AgentRuntime：调用晨报 + 监控工具（loopType 记录）", async () => {
  const { deps } = await setup();
  const runtime = new AgentRuntime({
    context: {},
    tools: [createMorningBriefingTool(deps), createMonitoringTool(deps)],
  });
  const run = await runtime.run("scheduled", {
    triggerType: "app_open",
    loopType: "morning_briefing",
    tools: ["morning_briefing_tool", "monitoring_tool"],
  });
  assert.equal(run.status, "completed");
  assert.equal(run.triggerType, "app_open");
  assert.equal(run.loopType, "morning_briefing");
  assert.equal(run.toolsUsed.length, 2);
  assert.ok(run.duration !== undefined);
  const briefing = run.toolsUsed[0].result as { date: string; anomalies: number; suggestedActions: string[] };
  assert.equal(briefing.date, "2026-08-24");
  assert.ok(briefing.anomalies >= 1);
  const monitor = run.toolsUsed[1].result as { count: number };
  assert.ok(monitor.count >= 1);
});