import { test } from "node:test";
import assert from "node:assert/strict";
import { generateLearningEvents } from "../learning";
import type { UserDecision, UserDecisionReview } from "../types";

/** 10. LearningEvent 生成 */
test("LearningEvent：决策/评审能力信号/验证结果 → 事件", () => {
  const decision: UserDecision = {
    id: "d1",
    opportunityId: "o1",
    decision: "validate",
    differentFromAi: true,
    judgment: { why: "w", coreJudgment: "c", keyEvidence: "e", biggestRisk: "r", mostImportantAssumption: "a", expectedOutcome: "o" },
    createdAt: "now",
    updatedAt: "now",
  };
  const review: UserDecisionReview = {
    id: "rv1",
    decisionId: "d1",
    score: 7.5,
    strengths: [],
    weaknesses: [],
    reasoningGaps: [],
    missingEvidence: [],
    recommendedActions: [],
    abilitySignals: [
      { skill: "strategic_judgment", signal: "positive", severity: 0.4, evidence: "结构清晰" },
      { skill: "risk_analysis", signal: "negative", severity: 0.5, evidence: "风险估计不足" },
    ],
    provider: "deepseek",
    provider_degraded: false,
    createdAt: "now",
  };

  const events = generateLearningEvents({
    userId: "u1",
    opportunityId: "o1",
    decision,
    review,
    results: [
      {
        id: "res1", taskId: "t1", planId: "p", decisionId: "d1", opportunityId: "o1",
        actualSample: "10", actualResult: "9 人付费", userFeedback: "", actualRevenue: 891, outcome: "confirmed",
        submittedBy: "u", submittedAt: "now",
      },
    ],
  });

  const skills = events.map((e) => e.skill);
  assert.ok(skills.includes("strategic_judgment"), "决策 → 战略判断事件");
  assert.ok(skills.includes("risk_analysis"), "评审能力信号 → 事件");
  assert.ok(skills.includes("validation"), "验证结果 → validation 事件");
  assert.ok(skills.includes("unit_economics"), "实际收入 → unit_economics 事件");
  assert.ok(skills.includes("review"), "评审/评分 → review 事件");
  assert.ok(events.every((e) => e.userId === "u1" && e.opportunityId === "o1"));
  assert.ok(events.every((e) => e.severity >= 0 && e.severity <= 1));
});

test("LearningEvent：DecisionService 持久化事件", async () => {
  const { createDecisionService, makeResearchRun } = await import("./helpers");
  const { service, researchRepo } = createDecisionService();
  await makeResearchRun(researchRepo, "opp-l1");
  await service.createDecision({
    opportunityId: "opp-l1",
    decision: "proceed",
    differentFromAi: false,
    judgment: { why: "w", coreJudgment: "c", keyEvidence: "e", biggestRisk: "r", mostImportantAssumption: "a", expectedOutcome: "o" },
  });
  const events = await service.listEvents("opp-l1");
  assert.ok(events.length >= 1);
  assert.ok(events.some((e) => e.skill === "strategic_judgment"));
});