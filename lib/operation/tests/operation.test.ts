/**
 * 商业操盘手报告测试（V1.2）。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateOperationPlan, collectOperationSources } from "../pipeline";
import type { RunAiFn } from "../../research/ai-call";
import type { ExternalResearchFn } from "../../research/external/types";
import type { ResearchReport } from "../../research/types";

const contentItems = () =>
  Array.from({ length: 30 }, (_, i) => ({
    day: "Day" + (i + 1),
    title: "标题" + (i + 1),
    structure: "结构",
    hook: "Hook",
    filming: "拍摄",
    productDisplay: "展示",
    cta: "CTA",
    targetMetric: "指标",
  }));

const A_JSON = () => JSON.stringify({
  marketValidation: { summary: "市场存在真实需求", rows: Array.from({ length: 8 }, (_, i) => ({ keyword: "kw" + i, platform: "Google Trends", trend: "上升", source: "有来源", businessMeaning: "意义", sourceRequired: true })) },
  productMatrix: { summary: "筛选 8 个候选", candidates: Array.from({ length: 8 }, (_, i) => ({ name: "产品" + i, supplySource: "1688", referenceLink: "https://x.com/" + i, targetMarket: "US", demand: "中", competitionCount: "10", price: "$20", purchaseCost: "$5", grossMargin: "60%", logisticsCost: "$4", estimatedProfit: "$8", competitionDifficulty: 5, score: 70 + i, recommendation: "consider" as const, why: "需求存在", whyNot: "竞争中等", sourceRequired: true })) },
  supplyChain: { channels: ["1688", "Alibaba"], priceRange: "$3-8", moq: "100", productionCycle: "15天", logistics: "空运", estimatedCost: "$4", verified: false, note: "需要进一步验证" },
});

const B_JSON = () => JSON.stringify({
  competitorAnalysis: { summary: "竞品打法总结", competitors: Array.from({ length: 5 }, (_, i) => ({ brand: "竞品" + i, website: "https://c" + i + ".com", platform: "Amazon", product: "产品", price: "$25", sales: "1k", reviews: "4.2", adMaterials: "图+视频", trafficSource: "广告", coreSellingPoint: "卖点", userReviews: "好评", negativeReviews: "差评", opportunity: "机会", sourceRequired: true })) },
  pricing: { purchaseCost: "$5", logistics: "$4", platformFee: "15%", adCost: "$5", labor: "$1", totalCost: "$16", sellingPrice: "$25", grossMargin: "36%", netProfit: "$9", breakevenAdCost: "$8", targetROI: "2.5", sourceRequired: true },
});

const C_JSON = () => JSON.stringify({
  pageOptimization: { titles: Array.from({ length: 10 }, (_, i) => "标题" + i), mainImages: Array.from({ length: 3 }, (_, i) => ({ slot: "第" + (i + 1) + "张", purpose: "吸引", visual: "场景", text: "文字" })), description: { painPoints: "痛点", solution: "方案", trust: "信任", cta: "CTA" }, seoKeywords: Array.from({ length: 5 }, (_, i) => ({ keyword: "kw" + i, searchVolume: "1k", competition: "中" })) },
  contentPlan: contentItems(),
  adPlan: { stages: Array.from({ length: 2 }, (_, i) => ({ stage: "阶段" + (i + 1), budget: "$300", materials: "10", goal: "测试", metrics: "CTR/CPA", eliminateRule: "CTR<1%淘汰", scaleRule: "ROAS>2放量" })) },
  ninetyDayPlan: { phases: Array.from({ length: 3 }, (_, i) => ({ phase: "阶段" + (i + 1), goal: "目标", aiResponsible: "AI负责", userResponsible: "用户负责", tools: "工具", output: "输出", successCriteria: "成功标准" })) },
  investmentJudgment: { recommendation: "validate" as const, reasons: { market: "有需求", competition: "中等", supplyChain: "待验证", profit: "毛利36%", growth: "中", risk: "合规" }, biggestUnknown: "付费意愿", nextExperiment: { experiment: "访谈30人", budget: "$200", cycle: "2周", successCriteria: "70%愿意", failureCriteria: "<40%" } },
});

function fakeRunAi(): RunAiFn {
  return async (task) => {
    const content = task.task.includes("前三部分")
      ? A_JSON()
      : task.task.includes("竞品与定价")
        ? B_JSON()
        : C_JSON();
    return {
      content,
      provider: "deepseek",
      model: "deepseek-chat",
      provider_degraded: false,
      usage: { provider: "deepseek", model: "deepseek-chat", task: "t", agent: "a", inputTokens: 10, outputTokens: 5, estimatedCost: 0.001, durationMs: 5, success: true, createdAt: new Date().toISOString() },
    };
  };
}

const fakeExternal: ExternalResearchFn = async (input) => {
  return {
    searches: [{ taskId: "", area: input.area, query: input.query, results: [], documents: [] }],
    documents: [
      { id: "d1", title: "市场报告", url: "https://example.com/market", sourceType: "EXTERNAL_WEB", content: "市场数据", publisher: "example.com", retrievedAt: new Date().toISOString(), createdAt: new Date().toISOString() },
    ],
  };
};

function makeReport(): ResearchReport {
  return {
    opportunityId: "opp-op1",
    opportunityName: "万圣节海外社交媒体卖产品",
    executiveSummary: "季节性电商机会。",
    sections: [],
    score: { version: 1, overall_score: 5.5, confidence: 0.5, score_breakdown: [], evidence: [], assumptions: [], unknowns: [], validation_required: [], createdAt: "now" },
    validationPlan: [],
    nextActions: [],
    sources: [],
    conflicts: [],
    crossValidatedAreas: [],
    insufficientEvidence: [],
    competitors: [],
    meta: { degraded: false, externalEvidenceAvailable: false, notice: "", generatedAt: "now", providers: {} },
  };
}

test("collectOperationSources：外部研究文档进入数据来源", async () => {
  const sources = await collectOperationSources(fakeExternal, { name: "万圣节产品" });
  assert.ok(sources.length >= 1);
  assert.ok(sources[0].url === "https://example.com/market");
});

test("generateOperationPlan：10 部分完整 + 版本 + 数据来源", async () => {
  const plan = await generateOperationPlan({
    runAi: fakeRunAi(),
    externalResearch: fakeExternal,
    report: makeReport(),
    runId: "run-op1",
    opportunity: { id: "opp-op1", name: "万圣节产品", description: "卖万圣节产品" },
  });
  assert.ok(plan.id.startsWith("oplan-"));
  assert.equal(plan.version, 1);
  assert.equal(plan.marketValidation.rows.length, 8);
  assert.equal(plan.productMatrix.candidates.length, 8);
  assert.equal(plan.competitorAnalysis.competitors.length, 5);
  assert.equal(plan.contentPlan.length, 30);
  assert.equal(plan.ninetyDayPlan.length, 3);
  assert.equal(plan.investmentJudgment.recommendation, "validate");
  assert.equal(plan.recommendation, "conditional_enter");
  assert.ok(plan.sources.length >= 1);
  assert.ok(plan.pricing.totalCost.length > 0);
});

test("generateOperationPlan：重新生成版本递增", async () => {
  const report = makeReport();
  const base = {
    runAi: fakeRunAi(),
    externalResearch: fakeExternal,
    runId: "run-op2",
    opportunity: { id: "opp-op2", name: "n", description: "d" },
  };
  const v1 = await generateOperationPlan({ ...base, report, previousVersion: undefined });
  assert.equal(v1.version, 1);
  const v2 = await generateOperationPlan({ ...base, report: { ...report, operationPlan: v1 }, previousVersion: v1.version });
  assert.equal(v2.version, 2);
});
