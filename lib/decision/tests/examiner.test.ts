import { test } from "node:test";
import assert from "node:assert/strict";
import { createDecisionService, createReviewRunAi, makeResearchRun, REVIEW_JSON } from "./helpers";

/** 3. Examiner 结构化输出 */
test("AI Examiner：结构化评审输出（弱点分类/能力信号/字段完整）", async () => {
  const { service, researchRepo } = createDecisionService();
  await makeResearchRun(researchRepo, "opp-ex1");
  const { decision } = await service.createDecision({
    opportunityId: "opp-ex1",
    decision: "validate",
    differentFromAi: false,
    judgment: { why: "w", coreJudgment: "c", keyEvidence: "e", biggestRisk: "r", mostImportantAssumption: "a", expectedOutcome: "o" },
  });

  const { review } = await service.reviewDecision(decision.id, { name: "商机X", description: "描述" });

  assert.equal(review.decisionId, decision.id);
  assert.equal(review.score, 7.5);
  assert.ok(review.strengths.length >= 1);
  assert.ok(review.weaknesses.length >= 2, "弱点应为结构化数组");
  assert.equal(review.weaknesses[0].category, "over_optimism");
  assert.ok(review.reasoningGaps.length >= 1);
  assert.ok(review.missingEvidence.length >= 1);
  assert.ok(review.recommendedActions.length >= 1);
  assert.ok(review.abilitySignals.length >= 2);
  assert.equal(review.abilitySignals[0].skill, "strategic_judgment");
  assert.ok(review.provider);
  assert.equal(review.provider_degraded, false);

  const loaded = await service.getReview(decision.id);
  assert.equal(loaded?.score, 7.5);
});

/** 3b. Examiner 非法 JSON → 重试一次后成功 */
test("AI Examiner：第一次非法第二次合法 → 自动重试成功", async () => {
  let calls = 0;
  const runAi = createReviewRunAi({
    contentFor: () => {
      calls += 1;
      return calls === 1 ? "不是 JSON" : REVIEW_JSON();
    },
  });
  const { service, researchRepo } = createDecisionService({ runAi });
  await makeResearchRun(researchRepo, "opp-ex2");
  const { decision } = await service.createDecision({
    opportunityId: "opp-ex2",
    decision: "pause",
    differentFromAi: false,
    judgment: { why: "w", coreJudgment: "c", keyEvidence: "e", biggestRisk: "r", mostImportantAssumption: "a", expectedOutcome: "o" },
  });
  const { review } = await service.reviewDecision(decision.id, { name: "n", description: "d" });
  assert.equal(review.score, 7.5);
  assert.equal(calls, 2);
});

/** 4. Examiner 失败 */
test("AI Examiner：两次失败 → 抛出错误，不伪造评审", async () => {
  const runAi = createReviewRunAi({ contentFor: () => "坏 JSON" });
  const { service, researchRepo } = createDecisionService({ runAi });
  await makeResearchRun(researchRepo, "opp-ex3");
  const { decision } = await service.createDecision({
    opportunityId: "opp-ex3",
    decision: "abandon",
    differentFromAi: true,
    judgment: { why: "w", coreJudgment: "c", keyEvidence: "e", biggestRisk: "r", mostImportantAssumption: "a", expectedOutcome: "o" },
  });
  await assert.rejects(() => service.reviewDecision(decision.id, { name: "n", description: "d" }), /两次/);
  const review = await service.getReview(decision.id);
  assert.equal(review, undefined, "失败时不应保存评审");
});