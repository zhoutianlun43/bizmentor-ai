/**
 * Business Memory Engine 测试（V0.4.1 Phase 8A）。
 * 覆盖：Decision Memory 构建 / 归档去重 / 聚合 / 模式检索 / 相似检索 / MemoryEngine 集成。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDecisionMemory, upsertDecisionMemory } from "../builder";
import { aggregateLearningEvents, archiveLearningEvents, mergeArchivedEvents } from "../archive";
import { findSimilarDecisions, nameOverlap, retrievePatterns } from "../retrieval";
import { LocalMemoryRepository, createMemoryMemoryStorage } from "../repository";
import { MemoryEngine } from "../service";
import { DecisionService } from "../../decision/service";
import { LocalDecisionRepository, createMemoryDecisionStorage } from "../../decision/repository";
import { LocalResearchRepository, createMemoryResearchStorage } from "../../research/repository";
import { createReviewRunAi, makeResearchRun } from "../../decision/tests/helpers";
import type { DecisionMemoryRecord, MemoryQuery } from "../types";
import type { UserDecision } from "../../decision/types";

const NOW = "2026-08-24T00:00:00.000Z";

function makeDecision(overrides: Partial<UserDecision> = {}): UserDecision {
  return {
    id: "dec-1",
    opportunityId: "opp-1",
    decision: "validate",
    differentFromAi: false,
    judgment: { why: "w", coreJudgment: "先小批量测款", keyEvidence: "研究报告需求明确", biggestRisk: "物流", mostImportantAssumption: "a", expectedOutcome: "验证通过则上架" },
    aiScoreSnapshot: { version: 1, overall_score: 5.7, confidence: 0.65 },
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

// ---------- 1. Decision Memory 构建 ----------
test("buildDecisionMemory：AI/用户判断 + 实际结果 + 评分变化 + 能力信号", () => {
  const record = buildDecisionMemory({
    decision: makeDecision(),
    review: {
      id: "rv-1", decisionId: "dec-1", score: 7, strengths: ["s"], weaknesses: [], reasoningGaps: [], missingEvidence: [], recommendedActions: [], abilitySignals: [{ skill: "validation", signal: "positive", severity: 0.5, evidence: "e" }], provider: "deepseek", provider_degraded: false, createdAt: NOW,
    },
    results: [{ id: "res-1", taskId: "t1", planId: "p1", decisionId: "dec-1", opportunityId: "opp-1", actualSample: "20", actualResult: "转化率 3%", userFeedback: "好", actualConversionRate: 3, outcome: "confirmed", submittedBy: "me", submittedAt: NOW }],
    scoreUpdate: {
      decisionId: "dec-1", fromVersion: 1, toVersion: 2,
      before: { version: 1, overall_score: 5.7, confidence: 0.65, score_breakdown: [], assumptions: [], unknowns: [], validation_required: [], createdAt: NOW },
      after: { version: 2, overall_score: 6.8, confidence: 0.7, score_breakdown: [], assumptions: [], unknowns: [], validation_required: [], createdAt: NOW },
      reason: "验证通过", newEvidence: [], validationResults: [], createdAt: NOW,
    },
    domain: "ecommerce",
    opportunityName: "万圣节产品海外社交媒体",
  });
  assert.equal(record.outcome, "confirmed");
  assert.equal(record.aiPrediction?.score, 5.7);
  assert.equal(record.userPrediction?.coreJudgment, "先小批量测款");
  assert.deepEqual(record.scoreDelta, { from: 5.7, to: 6.8 });
  assert.equal(record.skills[0].skill, "validation");
  assert.ok(record.lesson.includes("被验证成功"));
  assert.ok(record.tags.includes("ecommerce"));
  assert.ok(record.tags.includes("confirmed"));
});

test("upsertDecisionMemory：按 decisionId 覆盖", () => {
  const a = buildDecisionMemory({ decision: makeDecision({ id: "dec-1" }), results: [], domain: "ecommerce", opportunityName: "n" });
  const b = buildDecisionMemory({ decision: makeDecision({ id: "dec-1", decision: "proceed" }), results: [], domain: "ecommerce", opportunityName: "n" });
  const merged = upsertDecisionMemory([a], [b]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].decision, "proceed");
});

// ---------- 2. 归档 ----------
test("archiveLearningEvents / mergeArchivedEvents：归一化 + 去重", () => {
  const ev = (id: string, skill: "validation") => ({ id, userId: "u", opportunityId: "opp-1", skill, signal: "positive" as const, severity: 0.5, evidence: "e", createdAt: NOW });
  const archived = archiveLearningEvents([ev("e1", "validation"), ev("e2", "validation")], new Map([["opp-1", "ecommerce"]]));
  assert.equal(archived[0].domain, "ecommerce");
  const merged = mergeArchivedEvents(archived, [archived[0], ev("e3", "validation") as never]);
  assert.equal(merged.length, 3, "e1 应去重");
});

test("aggregateLearningEvents：按 skill 聚合正/负/中性", () => {
  const events = [
    { id: "1", skill: "validation" as const, signal: "positive" as const, severity: 0.5, evidence: "e", opportunityId: "o", createdAt: NOW },
    { id: "2", skill: "validation" as const, signal: "negative" as const, severity: 0.4, evidence: "e", opportunityId: "o", createdAt: NOW },
    { id: "3", skill: "validation" as const, signal: "neutral" as const, severity: 0.2, evidence: "e", opportunityId: "o", createdAt: NOW },
  ];
  const agg = aggregateLearningEvents(events);
  assert.equal(agg[0].total, 3);
  assert.equal(agg[0].positive, 1);
  assert.equal(agg[0].negative, 1);
  assert.equal(agg[0].neutral, 1);
});

// ---------- 3. 模式检索 ----------
test("retrievePatterns：按领域/决策分组 + 验证率 + 高频经验", () => {
  const base = makeDecision();
  const records: DecisionMemoryRecord[] = [
    buildDecisionMemory({ decision: { ...base, id: "d1" }, results: [{ id: "r", taskId: "t", planId: "p", decisionId: "d1", opportunityId: "o", actualSample: "s", actualResult: "ok", userFeedback: "f", outcome: "confirmed", submittedBy: "me", submittedAt: NOW }], domain: "ecommerce", opportunityName: "万圣节产品" }),
    buildDecisionMemory({ decision: { ...base, id: "d2" }, results: [{ id: "r2", taskId: "t", planId: "p", decisionId: "d2", opportunityId: "o", actualSample: "s", actualResult: "no", userFeedback: "f", outcome: "rejected", submittedBy: "me", submittedAt: NOW }], domain: "ecommerce", opportunityName: "圣诞产品" }),
    buildDecisionMemory({ decision: { ...base, id: "d3", decision: "proceed" }, results: [], domain: "saas", opportunityName: "企业软件" }),
  ];
  const query: MemoryQuery = { domain: "ecommerce" };
  const patterns = retrievePatterns(records, query);
  assert.equal(patterns.length, 1, "只有 ecommerce+validate 一组");
  assert.equal(patterns[0].count, 2);
  assert.equal(patterns[0].confirmRate, 0.5);
  assert.ok(patterns[0].commonLessons.length >= 1);
});

test("findSimilarDecisions / nameOverlap：领域 + 名称相似", () => {
  assert.equal(nameOverlap("万圣节产品海外", "万圣节产品海外"), 1);
  assert.ok(nameOverlap("万圣节产品", "圣诞产品") > 0);
  const records: DecisionMemoryRecord[] = [
    buildDecisionMemory({ decision: makeDecision({ id: "d1" }), results: [], domain: "ecommerce", opportunityName: "万圣节产品海外社交媒体" }),
    buildDecisionMemory({ decision: makeDecision({ id: "d2" }), results: [], domain: "saas", opportunityName: "企业软件工具" }),
  ];
  const similar = findSimilarDecisions(records, { domain: "ecommerce", name: "万圣节产品海外社交媒体" });
  assert.equal(similar.length, 1);
  assert.equal(similar[0].decisionId, "d1");
});

// ---------- 4. MemoryEngine 集成 ----------
test("MemoryEngine：recordDecision 全链路（决策→评审→结果→评分→记忆）", async () => {
  const decisionRepo = new LocalDecisionRepository(createMemoryDecisionStorage());
  const researchRepo = new LocalResearchRepository(createMemoryResearchStorage());
  const service = new DecisionService({
    decisionRepository: decisionRepo,
    researchRepository: researchRepo,
    runAi: createReviewRunAi(),
    userId: "test-user",
  });
  const memory = new MemoryEngine({
    memoryRepository: new LocalMemoryRepository(createMemoryMemoryStorage()),
    decisionRepository: decisionRepo,
    researchRepository: researchRepo,
    userId: "test-user",
  });

  await makeResearchRun(researchRepo, "opp-mem1");
  const { decision } = await service.createDecision({
    opportunityId: "opp-mem1", decision: "validate", differentFromAi: false,
    judgment: { why: "w", coreJudgment: "先测款", keyEvidence: "研究结论", biggestRisk: "物流", mostImportantAssumption: "a", expectedOutcome: "验证通过则上架" },
  });
  await service.reviewDecision(decision.id, { name: "万圣节产品", description: "d" });
  const plan = await service.createValidationPlan({
    decisionId: decision.id, opportunityId: "opp-mem1",
    tasks: [{ assumption: "a", hypothesis: "h", method: "m", sampleSize: "s", successCriteria: "sc", failureCriteria: "fc", deadline: "2030-01-01", costEstimate: "c", owner: "me" }],
  });
  const taskId = plan.tasks[0].id;
  await service.startTask(taskId);
  await service.submitValidationResult({ taskId, actualSample: "20", actualResult: "转化率 3%", userFeedback: "好", actualConversionRate: 3, outcome: "confirmed", submittedBy: "me" });
  await service.applyValidationToScore(decision.id);

  const record = await memory.recordDecision(decision.id);
  assert.equal(record.outcome, "confirmed");
  assert.equal(record.decisionId, decision.id);
  assert.ok(record.scoreDelta, "应记录 v1→v2");
  assert.ok(record.skills.length >= 1, "应从 Examiner 提取能力信号");
  assert.equal(record.domain, undefined, "makeResearchRun 无 domain → undefined");

  // 重复 record → 覆盖（仍 1 条）
  await memory.recordDecision(decision.id);
  assert.equal(memory.list().length, 1);

  // 模式检索命中
  const patterns = memory.retrieve({ decision: "validate" });
  assert.ok(patterns.length >= 1);
  const similar = memory.similar({ name: "本地宠物洗护到家服务" });
  assert.ok(similar.length >= 1);
});

test("MemoryEngine：archiveEvents + aggregates", async () => {
  const decisionRepo = new LocalDecisionRepository(createMemoryDecisionStorage());
  const memory = new MemoryEngine({ decisionRepository: decisionRepo, userId: "test-user", memoryRepository: new LocalMemoryRepository(createMemoryMemoryStorage()) });
  const count = await memory.archiveEvents([
    { id: "e1", userId: "u", opportunityId: "o", skill: "validation", signal: "positive", severity: 0.5, evidence: "e", createdAt: NOW },
    { id: "e2", userId: "u", opportunityId: "o", skill: "validation", signal: "negative", severity: 0.4, evidence: "e", createdAt: NOW },
  ], new Map([["o", "ecommerce"]]));
  assert.equal(count, 2);
  const archived = memory.listArchived("validation");
  assert.equal(archived.length, 2);
  assert.equal(archived[0].domain, "ecommerce");
  const agg = memory.aggregates();
  assert.equal(agg[0].positive, 1);
  assert.equal(agg[0].negative, 1);
});