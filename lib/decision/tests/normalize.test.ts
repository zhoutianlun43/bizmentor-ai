/**
 * AI Examiner 输出规范化测试（V0.4.1 Phase 7A 修复）。
 * 覆盖：枚举模糊匹配 / 数值 clamp / 缺失字段 / 端到端（非法枚举不再硬失败）。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeAbilitySkill, normalizeDecisionReviewOutput, normalizeSignal, normalizeWeaknessCategory } from "../normalize";
import { createDecisionService, createReviewRunAi, makeResearchRun } from "./helpers";

test("normalizeWeaknessCategory：模糊匹配合法枚举", () => {
  assert.equal(normalizeWeaknessCategory("willingness to pay misjudgment"), "willingness_to_pay_misjudgment");
  assert.equal(normalizeWeaknessCategory("OVER-OPTIMISM"), "over_optimism");
  assert.equal(normalizeWeaknessCategory("business_model_issue"), "business_model_issue");
  assert.equal(normalizeWeaknessCategory("risk underestimation"), "risk_underestimation");
});

test("normalizeWeaknessCategory：无法匹配 → 默认 logic_gap", () => {
  assert.equal(normalizeWeaknessCategory("market timing"), "logic_gap");
  assert.equal(normalizeWeaknessCategory(undefined), "logic_gap");
});

test("normalizeAbilitySkill / normalizeSignal", () => {
  assert.equal(normalizeAbilitySkill("market analysis"), "market_analysis");
  assert.equal(normalizeAbilitySkill("customer_acquisition"), "customer_acquisition");
  assert.equal(normalizeAbilitySkill("zzz"), "strategic_judgment");
  assert.equal(normalizeSignal("positive"), "positive");
  assert.equal(normalizeSignal("pos"), "positive");
  assert.equal(normalizeSignal("neg"), "negative");
  assert.equal(normalizeSignal("weird"), "neutral");
});

test("normalizeDecisionReviewOutput：非法枚举/越界数值 → 规范化", () => {
  const normalized = normalizeDecisionReviewOutput({
    score: 99,
    strengths: ["s"],
    weaknesses: [
      { category: "willingness to pay misjudgment", description: "付费误判", severity: 5 },
      { category: "market timing", description: "时机", severity: 0.5 },
    ],
    reasoning_gaps: ["r"],
    missing_evidence: ["m"],
    recommended_actions: ["a"],
    ability_signals: [{ skill: "market analysis", signal: "positive", severity: 0.4, evidence: "e" }],
  }) as {
    score: number;
    weaknesses: Array<{ category: string; severity: number }>;
    ability_signals: Array<{ skill: string }>;
  };
  assert.equal(normalized.score, 10);
  assert.equal(normalized.weaknesses[0].category, "willingness_to_pay_misjudgment");
  assert.equal(normalized.weaknesses[0].severity, 1, "severity 越界应 clamp 到 1");
  assert.equal(normalized.weaknesses[1].category, "logic_gap", "无法匹配 → 默认");
  assert.equal(normalized.ability_signals[0].skill, "market_analysis");
});

test("端到端：Examiner 收到非法枚举 → 规范化后成功，不再硬失败", async () => {
  const INVALID_ENUM_JSON = () =>
    JSON.stringify({
      score: 7.5,
      strengths: ["判断具体"],
      weaknesses: [
        { category: "willingness to pay misjudgment", description: "付费意愿误判", severity: 0.5 },
        { category: "market timing", description: "时机判断", severity: 0.4 },
      ],
      reasoning_gaps: ["假设来源未说明"],
      missing_evidence: ["竞品定价"],
      recommended_actions: ["先访谈 10 人"],
      ability_signals: [{ skill: "market analysis", signal: "positive", severity: 0.4, evidence: "结构清晰" }],
    });
  const { service, researchRepo } = createDecisionService({ runAi: createReviewRunAi({ contentFor: () => INVALID_ENUM_JSON() }) });
  await makeResearchRun(researchRepo, "opp-n1");
  const { decision } = await service.createDecision({
    opportunityId: "opp-n1",
    decision: "validate",
    differentFromAi: false,
    judgment: { why: "w", coreJudgment: "c", keyEvidence: "e", biggestRisk: "r", mostImportantAssumption: "a", expectedOutcome: "o" },
  });
  const { review } = await service.reviewDecision(decision.id, { name: "n", description: "d" });
  assert.equal(review.weaknesses[0].category, "willingness_to_pay_misjudgment");
  assert.equal(review.weaknesses[1].category, "logic_gap");
  assert.equal(review.abilitySignals[0].skill, "market_analysis");
  assert.equal(review.score, 7.5);
});