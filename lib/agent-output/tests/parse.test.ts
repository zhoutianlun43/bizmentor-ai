/**
 * 结构化输出解析器测试（V1.6）。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseStructuredOutput, deriveKnowledgeDelta } from "../parse";

test("解析：summary + table + risk blocks", () => {
  const out = parseStructuredOutput({
    format: "report",
    title: "万圣节海外电商分析",
    blocks: [
      { type: "summary", title: "核心判断", conclusion: "机会存在但需验证", confidence: 0.6, basis: ["社媒流量可低成本测款"] },
      { type: "table", title: "竞品分析", headers: ["产品", "价格"], rows: [["LED南瓜灯", "$15"], ["蜘蛛网", "$8"]] },
      { type: "risk", title: "风险矩阵", items: [{ risk: "季节窗口短", impact: "高", probability: "中", mitigation: "提前测款" }] },
    ],
  }, "fallback");
  assert.equal(out.format, "report");
  assert.equal(out.blocks.length, 3);
  assert.equal(out.blocks[0].type, "summary");
  assert.equal(out.blocks[1].type, "table");
  assert.equal((out.blocks[1] as { rows: string[][] }).rows.length, 2);
  assert.equal((out.blocks[2] as { items: unknown[] }).items.length, 1);
});

test("解析：非法 JSON → 降级为文本", () => {
  const out = parseStructuredOutput(null, "这是原始回答");
  assert.equal(out.format, "answer");
  assert.equal(out.blocks.length, 1);
  assert.equal(out.blocks[0].type, "text");
  assert.equal((out.blocks[0] as { paragraphs: string[] }).paragraphs[0], "这是原始回答");
});

test("解析：脏块被跳过", () => {
  const out = parseStructuredOutput({ format: "table", title: "t", blocks: [{ type: "summary" }, { type: "table", headers: [], rows: [] }, { type: "text", paragraphs: ["ok"] }] }, "f");
  assert.equal(out.blocks.length, 1, "只有合法 text 块");
  assert.equal(out.blocks[0].type, "text");
});

test("知识沉淀：summary+swot→新观点；table/financial→新数据；risk→新风险；timeline/content→新决策", () => {
  const k1 = deriveKnowledgeDelta({ format: "report", title: "t", blocks: [{ type: "summary", conclusion: "c", basis: [] }, { type: "risk", items: [] }] });
  assert.equal(k1.newViews, true);
  assert.equal(k1.newRisks, true);
  const k2 = deriveKnowledgeDelta({ format: "report", title: "t", blocks: [{ type: "table", headers: ["a"], rows: [] }, { type: "timeline", phases: [] }] });
  assert.equal(k2.newData, true);
  assert.equal(k2.newDecisions, true);
});
