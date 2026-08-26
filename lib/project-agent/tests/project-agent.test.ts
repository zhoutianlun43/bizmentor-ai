/**
 * 项目 AI 主理人测试（V1.5；V1.9：战略状态/成功指标/商业数据库/决策闭环/每日简报）。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { buildCognition, buildAgentSystemPrompt } from "../cognition";
import { buildDailyBrief } from "../brief";
import { ProjectMemoryStore } from "../store";
import { emptyMemory, toBusinessFact } from "../types";
import type { ResearchRun } from "../../research/types";
import type { Opportunity as Opp } from "../../types/opportunity";

const tmp = path.join(os.tmpdir(), "bizmentor-agent-test-" + Date.now());
process.env.AI_USAGE_FILE = path.join(tmp, "usage.jsonl");

const opp: Opp = {
  id: "opp-a", name: "万圣节海外社交媒体电商", description: "海外卖万圣节产品",
  source: "ai", status: "discovered", createdAt: "2026-08-25T00:00:00.000Z",
  notes: "[AI雷达] 电商 · 评分 82 · 值得研究 · scanId=scan-1 · oppStatus=discovered",
  sourceType: "ai_radar", scanId: "scan-1", opportunityStatus: "discovered",
};

const run: ResearchRun = {
  runId: "run-1", opportunityId: "opp-a", status: "completed", createdAt: "now", updatedAt: "now",
  stages: [], findings: [], scoreHistory: [],
  sourceDocuments: [],
  report: {
    opportunityId: "opp-a", opportunityName: "万圣节海外社交媒体电商", executiveSummary: "季节性强，测款窗口短。",
    sections: [], score: { version: 1, overall_score: 6.8, confidence: 0.6, score_breakdown: [], evidence: [], assumptions: [], unknowns: [], validation_required: [], createdAt: "now" },
    validationPlan: [], nextActions: [], sources: [{ id: "d1", title: "市场报告", sourceType: "EXTERNAL_WEB", content: "", url: "https://x.com", createdAt: "now" }],
    conflicts: [], crossValidatedAreas: [], insufficientEvidence: ["需求待验证"], competitors: [],
    judgment: { id: "j1", opportunityId: "opp-a", runId: "run-1", version: 1, recommendation: "conditional_enter", oneLineJudgment: "存在机会但需验证需求与竞争", biggestOpportunity: "社媒流量低成本测款", biggestRisk: "季节窗口短", suggestedAction: "先小批量测款", entryDirection: "TikTok Shop 测款", notDoList: [], day90Plan: [], firstCustomers: { targetSegment: "US", channels: [], offer: "", firstBatchGoal: "", steps: [] }, confidence: 0.6, createdAt: "now" },
    meta: { degraded: false, externalEvidenceAvailable: true, notice: "", generatedAt: "now", providers: {} },
  },
};

test("buildCognition：读取商机+研究+判断 → 认知档案（身份/目标/判断/风险/事实）", () => {
  const c = buildCognition(opp, run, []);
  assert.ok(c.aiIdentity.includes("主理人"));
  assert.ok(c.currentGoal.includes("测款"));
  assert.ok(c.currentPhase.length > 0, "认知卡含当前阶段");
  assert.ok(c.nextAction.length > 0, "认知卡含下一步动作");
  assert.ok(c.coreAssumption.length > 0, "认知卡含核心假设");
  assert.ok(c.coreJudgment.includes("验证需求与竞争"));
  assert.ok(c.mainRisks.some((r) => r.includes("季节")));
  assert.ok(c.keyFacts.some((f) => f.includes("AI 商业雷达")));
  assert.ok(c.keyFacts.some((f) => f.includes("6.8")));
});

test("V1.9 buildCognition：战略状态 + 成功指标自动生成", () => {
  const c = buildCognition(opp, run, []);
  assert.ok(c.strategyStatus.currentStatus.length > 0, "含当前战略状态");
  assert.ok(c.strategyStatus.coreQuestion.length > 0, "含核心问题");
  assert.ok(Array.isArray(c.strategyStatus.forbiddenActions), "含禁止事项");
  assert.ok(c.projectMetrics.northStarMetric.length > 0, "含北极星指标");
  assert.ok(c.projectMetrics.keyMetrics.length >= 1, "含关键指标");
  assert.ok(c.projectMetrics.keyMetrics[0].name.length > 0, "指标含名称");
  assert.ok("current" in c.projectMetrics.keyMetrics[0], "指标含当前值");
  assert.ok("target" in c.projectMetrics.keyMetrics[0], "指标含目标值");
});

test("V1.9 buildCognition：记忆覆盖战略状态与指标", () => {
  const mem = emptyMemory("opp-a");
  mem.strategy = { currentStatus: "等待首批用户访谈", coreQuestion: "用户是否愿意付费99元/月", forbiddenActions: ["暂不投放广告"] };
  mem.metrics = { northStarMetric: "30天50个付费用户", keyMetrics: [{ name: "付费转化率", current: "1%", target: "5%" }] };
  const c = buildCognition(opp, run, [], mem);
  assert.equal(c.strategyStatus.currentStatus, "等待首批用户访谈");
  assert.equal(c.strategyStatus.coreQuestion, "用户是否愿意付费99元/月");
  assert.deepEqual(c.strategyStatus.forbiddenActions, ["暂不投放广告"]);
  assert.equal(c.projectMetrics.northStarMetric, "30天50个付费用户");
  assert.equal(c.projectMetrics.keyMetrics[0].name, "付费转化率");
});

test("V1.9 toBusinessFact：字符串与结构化归一化", () => {
  const a = toBusinessFact("供应商报价 8 美元");
  assert.equal(a.type, "FACT");
  assert.ok(a.id.length > 0);
  const b = toBusinessFact({ content: "转化率可能提升", type: "INFERENCE", source: "AI 推断", confidence: 70, impact: "转化" });
  assert.equal(b.type, "INFERENCE");
  assert.equal(b.source, "AI 推断");
  assert.equal(b.confidence, 70);
  assert.equal(b.impact, "转化");
  const c = toBusinessFact({ content: "假设用户愿意付费", type: "ASSUMPTION" });
  assert.equal(c.type, "ASSUMPTION");
});

test("V1.9 buildDailyBrief：每日 CEO 简报聚合", () => {
  const mem = emptyMemory("opp-a");
  mem.facts = [toBusinessFact("转化率 2%"), toBusinessFact({ content: "成本可能上涨", type: "INFERENCE", source: "AI" })];
  mem.decisionLog = [{ id: "d1", time: "2026-08-26T00:00:00Z", decision: "选择低价路线", reason: "用户价格敏感", status: "executing" }];
  mem.lessonsLearned = ["降低价格权重"];
  const c = buildCognition(opp, run, [], mem);
  const b = buildDailyBrief(c, mem, new Date("2026-08-26T12:00:00Z"));
  assert.equal(b.date, "2026-08-26");
  assert.equal(b.projectName, "万圣节海外社交媒体电商");
  assert.equal(b.openDecisions, 1);
  assert.ok(b.northStar.length > 0);
  assert.ok(b.aiAdvice.includes("回填"), "有执行中决策时建议优先回填结果");
  assert.ok(b.keyFactsToday.length >= 1, "包含最新事实");
});

test("V1.9 buildAgentSystemPrompt：注入战略状态/指标/商业数据库/经验", () => {
  const c = buildCognition(opp, run, []);
  const mem = emptyMemory("opp-a");
  mem.facts = [toBusinessFact({ content: "预算 5000 美元", type: "FACT", source: "用户", confidence: 90 })];
  mem.lessonsLearned = ["降低价格权重"];
  const p = buildAgentSystemPrompt(c, mem, run, "investor");
  assert.ok(p.includes("投资人模式"));
  assert.ok(p.includes("当前战略状态"));
  assert.ok(p.includes("北极星指标"));
  assert.ok(p.includes("[FACT] 预算 5000 美元"));
  assert.ok(p.includes("经验沉淀"));
});

test("ProjectMemoryStore：写入/读取持久化（跨实例）+ 旧数据迁移", () => {
  const store = new ProjectMemoryStore();
  const mem = emptyMemory("opp-a");
  mem.facts = [toBusinessFact("目标市场：美国"), toBusinessFact("预算：5000美元")];
  mem.userDecisions = ["先测试 TikTok Shop"];
  mem.decisionLog = [{ id: "d1", time: "now", decision: "选择低价", reason: "用户敏感", status: "executing" }];
  store.save(mem);
  const fresh = new ProjectMemoryStore();
  const got = fresh.get("opp-a");
  assert.equal(got.facts.length, 2);
  assert.equal(got.facts[0].content, "目标市场：美国");
  assert.equal(got.facts[0].type, "FACT");
  assert.equal(got.userDecisions[0], "先测试 TikTok Shop");
  assert.equal(got.decisionLog[0].id, "d1");
  assert.ok(Array.isArray(got.lessonsLearned), "新字段默认数组");
});
