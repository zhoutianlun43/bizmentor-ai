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

test("projectUpdate：解析 新事实/新风险/判断变化/决策", () => {
  const raw = {
    format: "report", title: "t",
    projectUpdate: {
      newFacts: ["供应商A成本 8 美元", "售价 19.99"],
      newRisks: ["成本上涨"],
      newJudgments: [{ before: "6.5", after: "7.5", reason: "需求验证增强" }],
      planChanges: ["改为轻资产模式"],
      decision: { decision: "选择轻资产", reason: "降低库存风险", basis: "用户验证不足" },
    },
    blocks: [{ type: "text", paragraphs: ["ok"] }],
  };
  const out = parseStructuredOutput(raw, "f");
  assert.equal(out.projectUpdate?.newFacts?.length, 2);
  assert.equal(out.projectUpdate?.newJudgments?.[0].after, "7.5");
  assert.equal(out.projectUpdate?.decision?.decision, "选择轻资产");
  assert.ok(out.projectUpdate?.newRisks?.includes("成本上涨"));
});

test("projectUpdate：缺失 → undefined", () => {
  const out = parseStructuredOutput({ format: "report", title: "t", blocks: [{ type: "text", paragraphs: ["ok"] }] }, "f");
  assert.equal(out.projectUpdate, undefined);
});

test("V1.9 projectUpdate：结构化事实 + 战略/指标更新", () => {
  const raw = {
    format: "report", title: "t",
    projectUpdate: {
      newFacts: [
        { content: "供应商报价 8 美元", type: "FACT", source: "供应商", confidence: 95, impact: "成本" },
        { content: "转化率可能提升", type: "INFERENCE", source: "AI", confidence: 60 },
        "用户反馈价格偏高",
      ],
      strategyUpdate: { currentStatus: "等待用户需求验证", coreQuestion: "是否有人愿意付费", forbiddenActions: ["暂不扩大库存", "暂不扩大团队"] },
      metricsUpdate: { northStarMetric: "30天100个客户", keyMetrics: [{ name: "转化率", current: "2%", target: "5%" }] },
    },
    blocks: [{ type: "text", paragraphs: ["ok"] }],
  };
  const out = parseStructuredOutput(raw, "f");
  const pu = out.projectUpdate!;
  assert.equal(pu.newFacts?.length, 3);
  const f0 = pu.newFacts![0] as { content: string; type: string; source?: string; confidence?: number; impact?: string };
  assert.equal(f0.content, "供应商报价 8 美元");
  assert.equal(f0.type, "FACT");
  assert.equal(f0.source, "供应商");
  assert.equal(f0.confidence, 95);
  assert.equal(pu.strategyUpdate?.currentStatus, "等待用户需求验证");
  assert.deepEqual(pu.strategyUpdate?.forbiddenActions, ["暂不扩大库存", "暂不扩大团队"]);
  assert.equal(pu.metricsUpdate?.northStarMetric, "30天100个客户");
  assert.equal(pu.metricsUpdate?.keyMetrics?.[0].target, "5%");
});

test("V1.9 projectUpdate：仅战略更新时非 undefined", () => {
  const out = parseStructuredOutput({ format: "report", title: "t", projectUpdate: { strategyUpdate: { currentStatus: "已验证" } }, blocks: [{ type: "text", paragraphs: ["ok"] }] }, "f");
  assert.ok(out.projectUpdate);
  assert.equal(out.projectUpdate!.strategyUpdate?.currentStatus, "已验证");
});
