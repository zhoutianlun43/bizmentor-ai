/**
 * Output Intelligence 测试（V1.7）：意图分析 / 模板路由 / 质量审核 / 制品。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeIntent } from "../output/intent-analyzer";
import { getTemplate, templateInstruction } from "../output/output-router";
import { checkOutputQuality } from "../output/output-quality-checker";
import { buildArtifacts } from "../artifacts/builder";
import type { StructuredOutput } from "../../agent-output/types";

test("Intent Analyzer：意图分类", () => {
  assert.equal(analyzeIntent("这个项目值得做吗"), "business_judgment");
  assert.equal(analyzeIntent("帮我分析竞品"), "competitor");
  assert.equal(analyzeIntent("帮我制定执行方案"), "execution_plan");
  assert.equal(analyzeIntent("帮我选品"), "product_selection");
  assert.equal(analyzeIntent("市场怎么样"), "market");
  assert.equal(analyzeIntent("你好"), "general");
});

test("Output Router：意图 → 模板（blocks + 质量规则）", () => {
  const tpl = getTemplate("competitor");
  assert.equal(tpl.id, "competitor-analysis");
  assert.ok(tpl.blocks.includes("table") && tpl.blocks.includes("swot"));
  assert.ok(templateInstruction(tpl).includes("竞品必须≥3个"));
  const bj = getTemplate("business_judgment");
  assert.ok(bj.blocks.includes("risk"));
});

test("Quality Checker：空泛建议 / 无依据判断 / 缺执行细节", () => {
  const vague: StructuredOutput = { format: "answer", title: "t", blocks: [{ type: "text", paragraphs: ["要做好社交媒体营销，努力提升销量"] }] };
  assert.ok(checkOutputQuality(vague).some((q) => q.type === "vague"));

  const ungrounded: StructuredOutput = { format: "answer", title: "t", blocks: [{ type: "text", paragraphs: ["市场巨大，前景广阔"] }] };
  assert.ok(checkOutputQuality(ungrounded).some((q) => q.type === "ungrounded"));

  const products: StructuredOutput = { format: "report", title: "t", blocks: [{ type: "products", items: [{ name: "A" }] }] };
  assert.ok(checkOutputQuality(products).some((q) => q.type === "missing_detail"));

  const good: StructuredOutput = { format: "answer", title: "t", blocks: [{ type: "text", paragraphs: ["市场 2025 年约 100 亿美元（来源：报告）"] }] };
  assert.equal(checkOutputQuality(good).length, 0);
});

test("Artifact System：text/table/report ready，slides/image/video coming_soon", () => {
  const out: StructuredOutput = { format: "report", title: "万圣节分析", blocks: [{ type: "table", headers: ["产品", "价格"], rows: [["A", "$15"]] }, { type: "text", paragraphs: ["结论"] }] };
  const arts = buildArtifacts(out);
  const ready = arts.filter((a) => a.status === "ready").map((a) => a.type);
  assert.ok(ready.includes("text") && ready.includes("table") && ready.includes("report"));
  const coming = arts.filter((a) => a.type === "image" || a.type === "video" || a.type === "slides");
  assert.ok(coming.every((a) => a.status === "coming_soon"));
});
