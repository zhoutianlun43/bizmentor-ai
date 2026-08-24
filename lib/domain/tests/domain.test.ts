/**
 * Business Domain Layer 测试（V0.4.1 Phase 6.1B）。
 * 覆盖：规则检测 / AI 检测 / registry / research 上下文注入 / scoring 权重 / decision 检查清单注入。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { BUILTIN_DOMAINS, detectDomain, detectDomainByRules, getDomainProfile } from "../index";
import { domainHintsText } from "../hints";
import { computeOverallScore, mergeScoreWeights } from "../../research/scoring";
import { runResearchPipeline } from "../../research/pipeline";
import { createFakeExternalResearch, createHappyRunAi, makeOptions, sampleInput } from "../../research/tests/helpers";
import { examinerPrompt } from "../../decision/prompts";
import type { RunAiFn } from "../../research/ai-call";
import type { AiTask } from "../../ai/types";
import type { ScoreProposal } from "../../research/types";
import type { UserJudgment } from "../../decision/types";

function makeFakeRunAi(content: string): RunAiFn {
  return async (task: AiTask) => ({
    content,
    provider: "deepseek" as const,
    model: "deepseek-chat",
    provider_degraded: false,
    usage: {
      provider: "deepseek" as const,
      model: "deepseek-chat",
      task: task.type ?? task.capability,
      agent: task.agent ?? "test",
      inputTokens: 1,
      outputTokens: 1,
      estimatedCost: 0,
      durationMs: 1,
      success: true,
      createdAt: new Date().toISOString(),
    },
  });
}

// ---------- 1. 规则检测 ----------
test("detectDomainByRules：电商关键词 → ecommerce（rules）", () => {
  const r = detectDomainByRules({ name: "万圣节跨境电商", description: "在海外卖万圣节商品，独立站 + TikTok 引流" });
  assert.ok(r);
  assert.equal(r!.domain, "ecommerce");
  assert.equal(r!.method, "rules");
  assert.ok(r!.confidence >= 0.7);
});

test("detectDomainByRules：SaaS 关键词 → saas", () => {
  const r = detectDomainByRules({ name: "企业订阅软件", description: "面向中小企业的 SaaS 工具，按月订阅" });
  assert.equal(r?.domain, "saas");
});

test("detectDomainByRules：无匹配 → null", () => {
  assert.equal(detectDomainByRules({ name: "某项目", description: "随便一个描述" }), null);
});

// ---------- 2. 检测总入口 ----------
test("detectDomain：规则命中时不调用 AI", async () => {
  let called = false;
  const runAi: RunAiFn = async () => {
    called = true;
    throw new Error("不应调用");
  };
  const d = await detectDomain({ name: "跨境电商独立站", description: "卖货" }, { runAi });
  assert.equal(d.domain, "ecommerce");
  assert.equal(d.method, "rules");
  assert.equal(called, false);
});

test("detectDomain：规则未命中 + AI 返回合法 → ai", async () => {
  const d = await detectDomain({ name: "X 项目", description: "无关键词的模糊描述" }, { runAi: makeFakeRunAi('{"domain":"saas"}') });
  assert.equal(d.domain, "saas");
  assert.equal(d.method, "ai");
});

test("detectDomain：AI 返回非法 → unknown（不阻断）", async () => {
  const d = await detectDomain({ name: "X", description: "模糊" }, { runAi: makeFakeRunAi("不是 JSON") });
  assert.equal(d.domain, "unknown");
  assert.equal(d.method, "unknown");
});

test("detectDomain：无 runAi 且规则未命中 → unknown", async () => {
  const d = await detectDomain({ name: "X", description: "模糊" });
  assert.equal(d.domain, "unknown");
});

// ---------- 3. registry ----------
test("registry：包含全部 8 个领域；unknown 无领域注入", () => {
  assert.equal(Object.keys(BUILTIN_DOMAINS).length, 8);
  assert.equal(BUILTIN_DOMAINS.unknown.researchHints, undefined);
  assert.equal(getDomainProfile("unknown").label, "通用");
});

test("registry：ecommerce 画像含研究提示/决策清单/指标集", () => {
  const p = BUILTIN_DOMAINS.ecommerce;
  assert.ok(p.researchHints && p.researchHints.includes("电商"));
  assert.ok(p.decisionChecklist && p.decisionChecklist.length > 0);
  assert.ok(p.metricSet && p.metricSet.length > 0);
});

test("domainHintsText：unknown/undefined → 空串；ecommerce → 含领域标签", () => {
  assert.equal(domainHintsText(undefined), "");
  assert.equal(domainHintsText({ domain: "unknown", confidence: 0, method: "unknown" }), "");
  const t = domainHintsText({ domain: "ecommerce", confidence: 0.9, method: "rules" });
  assert.ok(t.includes("【领域：电商】"));
  assert.ok(t.includes("物流时效"));
});

// ---------- 4. research 上下文注入 ----------
test("research：传入 domain → report.meta.domain 写入", async () => {
  const run = await runResearchPipeline(sampleInput, {
    ...makeOptions(createHappyRunAi(), createFakeExternalResearch()),
    domain: { domain: "ecommerce", confidence: 0.9, method: "rules" },
  });
  assert.ok(run.report);
  assert.equal(run.report!.meta.domain?.id, "ecommerce");
  assert.equal(run.report!.meta.domain?.label, "电商");
});

test("research：不传 domain → meta.domain 为 undefined（向后兼容）", async () => {
  const run = await runResearchPipeline(sampleInput, makeOptions(createHappyRunAi(), createFakeExternalResearch()));
  assert.ok(run.report);
  assert.equal(run.report!.meta.domain, undefined);
});

test("research：领域提示注入 planner prompt（user 含【领域：电商】）", async () => {
  const log: string[] = [];
  const base = createHappyRunAi();
  const runAi: RunAiFn = async (task: AiTask) => {
    log.push(task.task);
    return base(task);
  };
  const run = await runResearchPipeline(sampleInput, {
    runAi,
    externalResearch: createFakeExternalResearch(),
    domain: { domain: "ecommerce", confidence: 0.9, method: "rules" },
  });
  assert.ok(run.report);
  assert.ok(log.some((u) => u.includes("【领域：电商】")), "planner prompt 应包含领域提示");
});

// ---------- 5. scoring 权重 ----------
test("scoring：领域权重覆盖改变 overall（确定性可复算）", () => {
  const dimensions: ScoreProposal["dimensions"] = [
    { dimension: "demand", score: 8, confidence: 0.6, rationale: "r", evidence: [] },
    { dimension: "market", score: 7, confidence: 0.6, rationale: "r", evidence: [] },
    { dimension: "competition", score: 5, confidence: 0.6, rationale: "r", evidence: [] },
    { dimension: "willingnessToPay", score: 8, confidence: 0.6, rationale: "r", evidence: [] },
    { dimension: "moat", score: 4, confidence: 0.6, rationale: "r", evidence: [] },
    { dimension: "customerAcquisition", score: 5, confidence: 0.6, rationale: "r", evidence: [] },
    { dimension: "risk", score: 4, confidence: 0.6, rationale: "r", evidence: [] },
  ];
  const proposal: ScoreProposal = { dimensions };
  const base = computeOverallScore(proposal);
  const over = mergeScoreWeights({ demand: 0.5, market: 0.05 });
  const weighted = computeOverallScore(proposal, over);
  assert.notEqual(base, weighted);
  assert.equal(computeOverallScore(proposal, over), weighted, "相同输入两次结果一致");
});

// ---------- 6. decision 上下文注入 ----------
test("decision：examinerPrompt 传入 domain → system 含领域检查清单；未传 → 不含", () => {
  const judgment: UserJudgment = {
    why: "w", coreJudgment: "c", keyEvidence: "e", biggestRisk: "r", mostImportantAssumption: "a", expectedOutcome: "o",
  };
  const base = { opportunity: { name: "x", description: "y" }, decision: "validate" as const, judgment };
  const withDomain = examinerPrompt({ ...base, domain: { id: "ecommerce", label: "电商" } });
  assert.ok(withDomain.system.includes("领域检查清单"));
  assert.ok(withDomain.system.includes("测款转化率是否达标"));
  const without = examinerPrompt(base);
  assert.equal(without.system.includes("领域检查清单"), false);
});