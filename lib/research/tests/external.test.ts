import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDuckDuckGoHtml } from "../external/duckduckgo";
import { readWebPage } from "../external/http-reader";
import { computeSourceCredibility } from "../external/credibility";
import { detectConflicts } from "../external/conflicts";
import { bindAndEnforce } from "../evidence";
import { runResearchPipeline } from "../pipeline";
import {
  createFakeRunAi,
  createHappyRunAi,
  happyContentFor,
  makeOptions,
  sampleInput,
} from "./helpers";
import type { EvidenceItem, ResearchFinding, SourceDocument } from "../types";

const DOCS: SourceDocument[] = [
  {
    id: "doc-market",
    title: "市场报告",
    sourceType: "EXTERNAL_WEB",
    content: "市场规模 100 亿",
    url: "https://example.com/market",
    publisher: "example.com",
    retrievedAt: "2026-08-23T00:00:00.000Z",
    createdAt: "2026-08-23T00:00:00.000Z",
  },
  {
    id: "doc-competition",
    title: "竞品分析",
    sourceType: "EXTERNAL_WEB",
    content: "头部玩家 3 家",
    url: "https://example.com/competition",
    publisher: "example.com",
    retrievedAt: "2026-08-23T00:00:00.000Z",
    createdAt: "2026-08-23T00:00:00.000Z",
  },
];

/** 1. 搜索成功：DDG HTML 解析 */
test("搜索成功：解析 DuckDuckGo HTML 结果为结构化结果", () => {
  const html = `
    <div class="result results_links results_links_deep web-result">
      <h2 class="result__title"><a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fmarket&amp;rut=abc">宠物洗护 市场规模</a></h2>
      <a class="result__snippet" href="//duckduckgo.com/l/?uddg=1">市场规模约 100 亿元，年增长率 15%。</a>
      <a class="result__url" href="//duckduckgo.com/l/?uddg=2">example.com</a>
    </div>
    <div class="result results_links results_links_deep web-result">
      <h2 class="result__title"><a class="result__a" href="https://other.com/page">另一来源</a></h2>
      <a class="result__snippet" href="x">内容</a>
    </div>`;
  const results = parseDuckDuckGoHtml(html);
  assert.equal(results.length, 2);
  assert.equal(results[0].title, "宠物洗护 市场规模");
  assert.equal(results[0].url, "https://example.com/market");
  assert.equal(results[0].snippet.includes("100 亿元"), true);
  assert.equal(results[0].publisher, "example.com");
  assert.ok(results[0].retrievedAt);
});

/** 2. 网页读取成功 */
test("网页读取成功：提取标题/正文/发布者/抓取时间", async () => {
  const html = `<html><head><title>市场规模报告</title><meta property="og:title" content="市场规模报告"></head><body><p>市场规模约 100 亿元，年增长率 15%。</p><script>var x=1;</script></body></html>`;
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(html, { status: 200, headers: { "Content-Type": "text/html" } })) as typeof fetch;
  try {
    const doc = await readWebPage("https://example.com/market", { timeoutMs: 5000 });
    assert.equal(doc.title, "市场规模报告");
    assert.equal(doc.content.includes("100 亿元"), true);
    assert.equal(doc.content.includes("var x=1"), false, "脚本应被剔除");
    assert.equal(doc.publisher, "example.com");
    assert.ok(doc.retrievedAt);
    assert.equal(doc.sourceType, "EXTERNAL_WEB");
  } finally {
    globalThis.fetch = original;
  }
});

/** 3+11. Source 保存 + 报告显示来源 */
test("研究报告正确显示真实来源（url/title/publisher/retrievedAt）", async () => {
  const run = await runResearchPipeline(sampleInput, makeOptions(createHappyRunAi()));
  assert.ok(run.report);
  assert.ok(run.sourceDocuments.some((d) => d.sourceType === "EXTERNAL_WEB"));
  const external = run.sourceDocuments.filter((d) => d.sourceType === "EXTERNAL_WEB");
  assert.ok(external.length > 0);
  for (const d of external) {
    assert.ok(d.url && d.title && d.publisher && d.retrievedAt, "来源元数据必须完整");
  }
  assert.equal(run.report.sources.length, run.sourceDocuments.length);
});

/** 4. Evidence 绑定 Source */
test("Evidence 绑定 Source：真实来源元数据写入 sourceRef", async () => {
  const run = await runResearchPipeline(sampleInput, makeOptions(createHappyRunAi()));
  const fact = run.findings.flatMap((f) => f.evidence).find((e) => e.evidenceClass === "FACT");
  assert.ok(fact, "应存在 FACT 证据");
  assert.equal(fact.sourceRef?.sourceId, "doc-market");
  assert.equal(fact.sourceRef?.url, "https://example.com/market");
  assert.equal(fact.sourceRef?.publisher, "example.com");
  assert.ok(fact.sourceRef?.credibility);
});

/** 5. 无来源结论被标记 */
test("无来源结论保持 NEEDS_VALIDATION / AI_INFERENCE，不会伪装成 FACT", () => {
  const items: EvidenceItem[] = [
    { claim: "无来源的事实", evidenceClass: "FACT", confidence: 0.9 },
    { claim: "推断", evidenceClass: "AI_INFERENCE", confidence: 0.5 },
    { claim: "需验证", evidenceClass: "NEEDS_VALIDATION", confidence: 0.4 },
  ];
  const enforced = bindAndEnforce(items, DOCS);
  assert.equal(enforced[0].evidenceClass, "AI_INFERENCE");
  assert.equal(enforced[1].evidenceClass, "AI_INFERENCE");
  assert.equal(enforced[2].evidenceClass, "NEEDS_VALIDATION");
});

/** 6. 多来源一致 → 交叉验证覆盖 */
test("多来源一致：交叉验证覆盖该领域，无冲突", () => {
  const findings: ResearchFinding[] = [
    {
      taskId: "t1",
      area: "market",
      summary: "s",
      confidence: 0.5,
      unknowns: [],
      evidence: [
        { claim: "市场规模 100 亿元", evidenceClass: "FACT", confidence: 0.7, sourceRef: { sourceType: "EXTERNAL_WEB", sourceId: "doc-market" } },
        { claim: "市场规模 100 亿元", evidenceClass: "FACT", confidence: 0.7, sourceRef: { sourceType: "EXTERNAL_WEB", sourceId: "doc-competition" } },
      ],
    },
  ];
  const result = detectConflicts(findings);
  assert.ok(result.crossValidatedAreas.includes("market"));
  assert.equal(result.conflicts.length, 0);
});

/** 7. 多来源冲突 → 数值冲突被检测 */
test("多来源冲突：同一指标数值不一致 → 显式冲突", () => {
  const findings: ResearchFinding[] = [
    {
      taskId: "t1",
      area: "market",
      summary: "s",
      confidence: 0.5,
      unknowns: [],
      evidence: [
        { claim: "市场规模 100 亿元", evidenceClass: "FACT", confidence: 0.7, sourceRef: { sourceType: "EXTERNAL_WEB", sourceId: "doc-market" } },
        { claim: "市场规模 300 亿元", evidenceClass: "FACT", confidence: 0.7, sourceRef: { sourceType: "EXTERNAL_WEB", sourceId: "doc-competition" } },
      ],
    },
  ];
  const result = detectConflicts(findings);
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.conflicts[0].type, "numeric");
  assert.ok(result.conflicts[0].claims.length >= 2);
});

/** 8. AI 无法伪造 FACT：引用不存在的来源 → 降级 + 移除引用 */
test("AI 无法伪造 FACT：伪造 sourceId/URL → 降级 NEEDS_VALIDATION 并移除引用", () => {
  const items: EvidenceItem[] = [
    {
      claim: "AI 编造的市场规模 9999 亿元",
      evidenceClass: "FACT",
      confidence: 0.9,
      sourceRef: { sourceType: "EXTERNAL_WEB", sourceId: "doc-does-not-exist", url: "https://fake.invalid/x" },
    },
  ];
  const enforced = bindAndEnforce(items, DOCS);
  assert.equal(enforced[0].evidenceClass, "NEEDS_VALIDATION");
  assert.equal(enforced[0].sourceRef, undefined, "伪造来源引用必须被移除");
  assert.ok(enforced[0].note?.includes("不存在的来源"));
});

/** 9. OpenAI 失败降级（research 阶段 → DeepSeek，显式标记） */
test("OpenAI 失败 → 研究阶段降级 DeepSeek 且显式标记 degraded", async () => {
  const runAi = createFakeRunAi({
    contentFor: (task) => happyContentFor(task),
    providerFor: () => "deepseek",
    degradedFor: (task) => task.capability !== "simple",
  });
  const run = await runResearchPipeline(sampleInput, makeOptions(runAi));
  assert.equal(run.status, "degraded");
  assert.equal(run.report?.meta.degraded, true);
  assert.ok(run.stages.some((s) => s.provider_degraded && s.provider === "deepseek"));
});

/** 10. 成本记录 */
test("成本记录：AI 阶段 cost>0，external 阶段 cost=0，总成本可汇总", async () => {
  const run = await runResearchPipeline(sampleInput, makeOptions(createHappyRunAi()));
  const external = run.stages.find((s) => s.stage === "external-research");
  assert.equal(external?.estimatedCost, 0);
  const aiStages = run.stages.filter((s) => s.stage !== "external-research" && s.stage !== "evidence-validation");
  assert.ok(aiStages.every((s) => s.estimatedCost > 0), "AI 阶段应记录成本");
});

/** 来源可信度：官方 > 一般网站 */
test("来源可信度：官方来源 > 一般网站", () => {
  assert.equal(computeSourceCredibility({ sourceType: "OFFICIAL_SOURCE", url: "https://gov.cn/x" }).score, 0.9);
  const web = computeSourceCredibility({ sourceType: "EXTERNAL_WEB", url: "https://example.com/x" });
  assert.ok(web.score < 0.9);
  assert.equal(web.level, "medium");
});