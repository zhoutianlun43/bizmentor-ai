/**
 * Skill System 测试（V0.4.2 Phase 9B-3）。
 * 覆盖：Registry / 技能调用 / product_selection / competitor_analysis / Memory 注入 / AgentRuntime 调用技能。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { SkillRegistry } from "../registry";
import { createProductSelectionSkill } from "../product-selection";
import { createCompetitorAnalysisSkill } from "../competitor-analysis";
import { researchToSkillResult } from "../research-adapter";
import { LocalMemoryRepository, createMemoryMemoryStorage } from "../../memory/repository";
import { MemoryEngine } from "../../memory/service";
import { LocalDecisionRepository, createMemoryDecisionStorage } from "../../decision/repository";
import { buildDecisionMemory } from "../../memory/builder";
import { AgentRuntime } from "../../agent/runtime";
import { createSkillTool } from "../../agent/tools/skill";
import { createMemoryAgentRunStorage, LocalAgentRunRepository } from "../../agent/runs";
import type { AgentContext } from "../../agent/types";
import type { BizSkill, SkillDeps, SkillResearchResult } from "../types";
import type { UserDecision } from "../../decision/types";

const NOW = "2026-08-24T00:00:00.000Z";

function makeContext(): AgentContext {
  return {
    userId: "test-user",
    identity: { userId: "test-user", source: "fixed" },
    memoryPatterns: [],
    recentEvents: [],
    createdAt: NOW,
  };
}

/** 造一份技能研究结果（含市场/竞争/痛点/风险/商业模式节） */
function fakeResearch(): SkillResearchResult {
  return {
    sections: [
      { area: "market", content: "女装细分市场规模可观，增速 10%，价格带 100-200 元竞争适中。" },
      { area: "competition", content: "头部 3 家品牌，差异化不足，小卖家有机会。" },
      { area: "painPoint", content: "用户痛点：版型不合身、上新慢。" },
      { area: "risk", content: "库存风险高；价格战风险中等。" },
      { area: "businessModel", content: "DTC + 直播带货组合，毛利 55%。" },
    ],
    sources: [{ id: "doc-1", title: "女装市场报告", sourceType: "EXTERNAL_WEB", content: "x", url: "https://example.com/market", publisher: "example.com", retrievedAt: NOW, createdAt: NOW }],
    score: { overall_score: 7.2, confidence: 0.6 },
  };
}

async function seedMemoryRecords(): Promise<MemoryEngine> {
  const base: UserDecision = {
    id: "d", opportunityId: "o", decision: "validate", differentFromAi: false,
    judgment: { why: "w", coreJudgment: "测款", keyEvidence: "e", biggestRisk: "r", mostImportantAssumption: "a", expectedOutcome: "o" },
    aiScoreSnapshot: { version: 1, overall_score: 6, confidence: 0.5 },
    createdAt: NOW, updatedAt: NOW,
  };
  const repo = new LocalMemoryRepository(createMemoryMemoryStorage());
  const engine = new MemoryEngine({ memoryRepository: repo, decisionRepository: new LocalDecisionRepository(createMemoryDecisionStorage()) });
  const rec1 = buildDecisionMemory({ decision: { ...base, id: "d1" }, results: [{ id: "r1", taskId: "t", planId: "p", decisionId: "d1", opportunityId: "o", actualSample: "s", actualResult: "ok", userFeedback: "f", outcome: "confirmed", submittedBy: "me", submittedAt: NOW }], domain: "ecommerce", opportunityName: "女装针织衫" });
  const rec2 = buildDecisionMemory({ decision: { ...base, id: "d2", decision: "proceed" }, results: [{ id: "r2", taskId: "t", planId: "p", decisionId: "d2", opportunityId: "o", actualSample: "s", actualResult: "no", userFeedback: "f", outcome: "rejected", submittedBy: "me", submittedAt: NOW }], domain: "ecommerce", opportunityName: "女装连衣裙" });
  await repo.saveRecords([rec1, rec2]);
  return engine;
}

// ---------- 1. Registry ----------
test("SkillRegistry：注册/查找/列举/重复报错/调用", async () => {
  const registry = new SkillRegistry();
  const skill: BizSkill = {
    id: "test_skill", name: "测试", description: "d", domain: "ecommerce", requiredTools: [],
    run: async () => ({ summary: "ok", structured: {}, actions: [], evidence: [], createdAt: NOW }),
  };
  registry.registerSkill(skill);
  assert.equal(registry.getSkill("test_skill"), skill);
  assert.equal(registry.has("test_skill"), true);
  assert.equal(registry.listSkills().length, 1);
  assert.throws(() => registry.registerSkill(skill), /已注册/);
  const out = await registry.invokeSkill("test_skill", makeContext(), {});
  assert.equal(out.summary, "ok");
  await assert.rejects(() => registry.invokeSkill("nope", makeContext(), {}), /未知技能/);
});

// ---------- 2. product_selection ----------
test("product_selection：调用 Research + Memory，输出结构化结果与历史案例", async () => {
  const memory = await seedMemoryRecords();
  const deps: SkillDeps = {
    runResearch: async () => fakeResearch(),
    memory,
  };
  const skill = createProductSelectionSkill(deps);
  const out = await skill.run(makeContext(), { productIdea: "法式针织开衫", category: "女装", priceRange: "100-200", targetUser: "25-35 岁女性" });
  const structured = out.structured as { marketOpportunity: string; competition: string; risks: string[]; historicalCases: unknown[] };
  assert.ok(structured.marketOpportunity.includes("女装细分市场"));
  assert.ok(structured.competition.includes("头部 3 家"));
  assert.ok(structured.risks.length >= 1);
  assert.ok(structured.historicalCases.length >= 1, "应注入历史类似案例（Memory.similar）");
  assert.ok(out.evidence.some((e) => e.label.startsWith("来源")));
  assert.ok(out.summary.includes("参考历史案例"));
  // researchToSkillResult 适配
  assert.equal(researchToSkillResult({ runId: "r", opportunityId: "o", status: "completed", createdAt: NOW, updatedAt: NOW, stages: [], findings: [], scoreHistory: [], sourceDocuments: [], report: { opportunityId: "o", opportunityName: "n", executiveSummary: "s", sections: [{ area: "market", title: "t", content: "内容", confidence: 0.5, evidence: [] }], score: { version: 1, overall_score: 7, confidence: 0.5, score_breakdown: [], evidence: [], assumptions: [], unknowns: [], validation_required: [], createdAt: NOW }, validationPlan: [], nextActions: [], sources: [], conflicts: [], crossValidatedAreas: [], insufficientEvidence: [], competitors: [], meta: { degraded: false, externalEvidenceAvailable: false, notice: "", generatedAt: NOW, providers: {} } } }).sections.length, 1);
});

test("product_selection：未注入 research → 诚实标记需研究验证", async () => {
  const skill = createProductSelectionSkill({});
  const out = await skill.run(makeContext(), { productIdea: "碎花连衣裙" });
  const structured = out.structured as { marketOpportunity: string };
  assert.ok(structured.marketOpportunity.includes("需研究验证"));
  assert.ok(out.evidence.length === 0 || out.evidence.every((e) => !e.label.startsWith("来源")), "无来源时不应伪造来源");
});

// ---------- 3. competitor_analysis ----------
test("competitor_analysis：定位/定价/内容/流量/优势弱点/可复制策略 + Memory 模式", async () => {
  const memory = await seedMemoryRecords();
  const deps: SkillDeps = { runResearch: async () => fakeResearch(), memory };
  const skill = createCompetitorAnalysisSkill(deps);
  const out = await skill.run(makeContext(), { competitor: "某头部女装品牌", category: "女装", platform: "抖音" });
  const s = out.structured as { positioning: string; pricing: string; contentStrategy: string; trafficStrategy: string; strengths: string[]; weaknesses: string[]; replicableStrategies: string[]; memoryPatterns: unknown[] };
  assert.ok(s.positioning.includes("头部 3 家"));
  assert.ok(s.pricing.includes("付费意愿") || s.pricing.includes("需研究验证"));
  assert.ok(s.strengths.length >= 1, "应有优势（商业模式/壁垒）");
  assert.ok(s.weaknesses.length >= 1, "应有弱点（风险）");
  assert.ok(s.replicableStrategies.length >= 1, "应有可复制策略");
  assert.ok(s.memoryPatterns.length >= 1, "应结合历史 Memory 模式");
  assert.ok(out.evidence.some((e) => e.label.startsWith("历史模式")));
});

// ---------- 4. AgentRuntime 调用技能 ----------
test("AgentRuntime：skill 便捷调用 → skillsUsed/skillResults 记录", async () => {
  const registry = new SkillRegistry();
  registry.registerSkills([
    createProductSelectionSkill({ runResearch: async () => fakeResearch() }),
    createCompetitorAnalysisSkill({}),
  ]);
  const runtime = new AgentRuntime({
    context: {},
    runs: new LocalAgentRunRepository(createMemoryAgentRunStorage()),
    tools: [createSkillTool(registry)],
  });
  const run = await runtime.run("skill", {
    skill: "product_selection",
    skillInput: { productIdea: "法式针织开衫", category: "女装" },
  });
  assert.equal(run.status, "completed");
  assert.deepEqual(run.skillsUsed, ["product_selection"]);
  assert.equal(run.skillResults?.[0].skillId, "product_selection");
  assert.ok(run.skillResults?.[0].summary.length > 0);
  assert.equal(run.toolsUsed[0].toolId, "skill_tool");
});

test("AgentRuntime：未知技能 → failed", async () => {
  const registry = new SkillRegistry();
  const runtime = new AgentRuntime({ context: {}, tools: [createSkillTool(registry)] });
  const run = await runtime.run("skill", { skill: "nope", skillInput: {} });
  assert.equal(run.status, "failed");
  assert.ok(run.error?.includes("未知技能"));
});