/**
 * 项目 AI 主理人测试（V1.5）：认知档案 + 记忆持久化 + 系统提示。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { buildCognition, buildAgentSystemPrompt } from "../cognition";
import { ProjectMemoryStore } from "../store";
import { emptyMemory } from "../types";
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
  assert.ok(c.aiIdentity.includes("商业主理人"));
  assert.ok(c.currentGoal.includes("测款"));
  assert.ok(c.coreJudgment.includes("验证需求与竞争"));
  assert.ok(c.mainRisks.some((r) => r.includes("季节")));
  assert.ok(c.keyFacts.some((f) => f.includes("AI 商业雷达")));
  assert.ok(c.keyFacts.some((f) => f.includes("6.8")));
});

test("ProjectMemoryStore：写入/读取持久化（跨实例）", () => {
  const store = new ProjectMemoryStore();
  const mem = emptyMemory("opp-a");
  mem.facts = ["目标市场：美国", "预算：5000美元"];
  mem.userDecisions = ["先测试 TikTok Shop"];
  store.save(mem);
  const fresh = new ProjectMemoryStore();
  const got = fresh.get("opp-a");
  assert.deepEqual(got.facts, ["目标市场：美国", "预算：5000美元"]);
  assert.equal(got.userDecisions[0], "先测试 TikTok Shop");
});

test("buildAgentSystemPrompt：注入认知+记忆+模式", () => {
  const c = buildCognition(opp, run, []);
  const mem = emptyMemory("opp-a");
  mem.facts = ["预算 5000 美元"];
  const p = buildAgentSystemPrompt(c, mem, run, "investor");
  assert.ok(p.includes("投资人模式"));
  assert.ok(p.includes("万圣节海外社交媒体电商"));
  assert.ok(p.includes("预算 5000 美元"));
  assert.ok(p.includes("研究报告要点"));
});
