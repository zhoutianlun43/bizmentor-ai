/**
 * Business Model Analyzer：单位经济模型测试（V0.4.1 Phase 7A）。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeUnitEconomics, generateUnitEconomics } from "../unit-economics";
import type { RunAiFn } from "../../research/ai-call";
import type { ResearchReport } from "../../research/types";

const EC_JSON = () =>
  JSON.stringify({
    inputs: { aov: 30, cogsRate: 0.4, shippingPerOrder: 5, platformFeeRate: 0.15, cac: 12, avgOrdersPerCustomer: 1.5 },
    assumptions: ["商品成本率按 40% 估算"],
    confidence: 0.6,
  });

function makeEcommerceReport(): ResearchReport {
  return {
    opportunityId: "opp-ue1",
    opportunityName: "万圣节产品海外社交媒体",
    executiveSummary: "电商模式，客单价约 30 美元。",
    sections: [],
    score: { version: 1, overall_score: 5.7, confidence: 0.65, score_breakdown: [], evidence: [], assumptions: [], unknowns: [], validation_required: [], createdAt: "now" },
    validationPlan: [],
    nextActions: [],
    sources: [],
    conflicts: [],
    crossValidatedAreas: [],
    insufficientEvidence: [],
    competitors: [],
    meta: { degraded: false, externalEvidenceAvailable: false, notice: "", generatedAt: "now", providers: {}, domain: { id: "ecommerce", label: "电商", confidence: 0.9 } },
  };
}

test("computeUnitEconomics：电商确定性计算（毛利/贡献/回本/LTV）", () => {
  const d = computeUnitEconomics("ecommerce", { aov: 30, cogsRate: 0.4, shippingPerOrder: 5, platformFeeRate: 0.15, cac: 12, avgOrdersPerCustomer: 1.5 });
  assert.equal(d.grossMarginRate, 0.6);
  assert.equal(d.contributionPerUnit, 8.5); // 18 - 5 - 4.5
  assert.equal(d.contributionRate, 0.28);
  assert.equal(d.paybackUnits, 1.41); // 12 / 8.5
  assert.equal(d.ltv, 12.75); // 8.5 * 1.5
  assert.equal(d.ltvCac, 1.06);
});

test("computeUnitEconomics：SaaS 确定性计算", () => {
  const d = computeUnitEconomics("saas", { acvPerMonth: 100, grossMarginRate: 0.8, churnRate: 0.05, cac: 500 });
  assert.equal(d.contributionPerUnit, 80);
  assert.equal(d.paybackUnits, 6.25);
  assert.equal(d.ltv, 1600);
  assert.equal(d.ltvCac, 3.2);
});

test("computeUnitEconomics：通用兜底（revenue/cost）", () => {
  const d = computeUnitEconomics("unknown", { revenuePerUnit: 50, costPerUnit: 20, cac: 30, avgTransactionsPerCustomer: 2 });
  assert.equal(d.grossMarginRate, 0.6);
  assert.equal(d.contributionPerUnit, 30);
  assert.equal(d.ltv, 60);
  assert.equal(d.ltvCac, 2);
});

test("generateUnitEconomics：AI 提案输入 → 确定性推导 + 领域读取", async () => {
  const runAi: RunAiFn = async () => ({
    content: EC_JSON(),
    provider: "deepseek",
    model: "deepseek-chat",
    provider_degraded: false,
    usage: { provider: "deepseek", model: "deepseek-chat", task: "unit_economics", agent: "test", inputTokens: 1, outputTokens: 1, estimatedCost: 0, durationMs: 1, success: true, createdAt: "now" },
  });
  const model = await generateUnitEconomics({ runAi, report: makeEcommerceReport(), runId: "run-ue1", opportunity: { id: "opp-ue1", name: "n" } });
  assert.equal(model.domain, "ecommerce");
  assert.equal(model.inputs.aov, 30);
  assert.equal(model.derived.contributionPerUnit, 8.5);
  assert.equal(model.derived.ltvCac, 1.06);
  assert.ok(model.assumptions.length >= 1);
});

test("generateUnitEconomics：输入校验失败 → 抛错（不伪造）", async () => {
  const runAi: RunAiFn = async () => ({
    content: JSON.stringify({ inputs: { aov: -1, cogsRate: 5 }, assumptions: [] }),
    provider: "deepseek",
    model: "deepseek-chat",
    provider_degraded: false,
    usage: { provider: "deepseek", model: "deepseek-chat", task: "unit_economics", agent: "test", inputTokens: 1, outputTokens: 1, estimatedCost: 0, durationMs: 1, success: true, createdAt: "now" },
  });
  await assert.rejects(
    generateUnitEconomics({ runAi, report: makeEcommerceReport(), runId: "r", opportunity: { id: "o", name: "n" } }),
    /两次/,
  );
});