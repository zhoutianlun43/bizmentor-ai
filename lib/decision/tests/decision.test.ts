import { test } from "node:test";
import assert from "node:assert/strict";
import { createDecisionService, makeResearchRun } from "./helpers";

/** 1+2. Decision 创建 + User Judgment 保存（含 AI 当时判断快照） */
test("创建决策：保存决策、用户判断与 AI 评分快照", async () => {
  const { service, researchRepo } = createDecisionService();
  await makeResearchRun(researchRepo, "opp-d1");

  const { decision } = await service.createDecision({
    opportunityId: "opp-d1",
    decision: "proceed",
    differentFromAi: true,
    judgment: {
      why: "用户痛点真实存在",
      coreJudgment: "值得验证",
      keyEvidence: "身边 5 位卖家有同类需求",
      biggestRisk: "获客成本高",
      mostImportantAssumption: "愿意为自动化付费",
      expectedOutcome: "6 个月内验证付费转化",
      differentJudgment: "我认为市场比 AI 判断更大",
    },
  });

  assert.equal(decision.decision, "proceed");
  assert.equal(decision.differentFromAi, true);
  assert.equal(decision.judgment.coreJudgment, "值得验证");
  assert.equal(decision.judgment.differentJudgment, "我认为市场比 AI 判断更大");
  assert.ok(decision.aiScoreSnapshot, "应记录 AI 当时的评分");
  assert.equal(decision.aiScoreSnapshot?.version, 1);
  assert.ok(decision.aiScoreSnapshot?.overall_score > 0);

  const loaded = await service.getDecision(decision.id);
  assert.equal(loaded?.judgment.keyEvidence, "身边 5 位卖家有同类需求");
});