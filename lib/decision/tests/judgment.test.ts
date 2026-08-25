/**
 * AI 商业判断测试（V0.9）。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateBusinessJudgment } from "../judgment";
import { createDecisionService, createReviewRunAi, makeResearchRun } from "./helpers";
import type { RunAiFn } from "../../research/ai-call";

const JUDGMENT_JSON = () =>
  JSON.stringify({
    recommendation: "conditional_enter",
    oneLineJudgment: "条件进入：先验证中腰部创作者付费意愿再放量",
    biggestOpportunity: "中腰部创作者私信自动化需求最迫切",
    biggestRisk: "平台政策可能限制 AI 分身直播",
    suggestedAction: "先做 30 个深度访谈验证付费意愿",
    entryDirection: "从粉丝私信自动回复切入，再扩展多语言",
    notDoList: ["不要一开始做直播带货", "不要面向长尾创作者推月费制"],
    strategyChoice: "先做垂直单点（私信托管）再扩展平台",
    mvpPlan: "两周内做出私信自动回复 + 多语言翻译最小产品",
    productDesign: "SaaS 后台 + 移动端提示 + 数据看板",
    acquisitionChannels: ["小红书内容营销", "Discord 创作者社群", "转介绍激励"],
    contentPlan: "每周 3 条「创作者效率」主题短视频",
    headlineExamples: ["把私信回复时间从 3 小时降到 10 分钟", "AI 分身帮你 24 小时回粉丝"],
    adStrategy: "先投小红书信息流测试，CPA 目标 < ¥50",
    salesPlan: "设计合伙人模式：首批 10 个 MCN 免费 2 周",
    riskControl: "平台政策红线提前调研，保留人工介入兜底",
    day90Plan: [
      { phase: "阶段1 市场验证", title: "市场验证", goal: "验证市场规模与需求强度", aiActions: ["自动抓取 Google Trends 趋势", "收集行业报告数据"], userActions: ["确认关键假设", "参与访谈"], successMetric: "≥70% 受访者确认痛点", risk: "市场数据不足" },
      { phase: "阶段2 产品验证", title: "产品验证", goal: "验证 MVP 核心功能", aiActions: ["生成原型说明", "分析用户反馈"], userActions: ["试用原型", "反馈意见"], successMetric: "≥10 人试用", risk: "功能偏差" },
      { phase: "阶段3 商业验证", title: "商业验证", goal: "验证付费意愿", aiActions: ["设计 A/B 测试", "数据分析"], userActions: ["确认定价", "首批付费"], successMetric: "≥20 个付费用户", risk: "付费转化低" },
    ],
    firstCustomers: {
      targetSegment: "粉丝 1-50 万的中腰部创作者",
      channels: ["小红书", "Discord", "创作者社群"],
      offer: "首月免费试用",
      firstBatchGoal: "20 个付费用户",
      steps: ["内容营销", "社区投放", "转介绍激励"],
    },
    confidence: 0.55,
  });

function fakeJudgmentRunAi(contentFor: () => string): RunAiFn {
  return createReviewRunAi({ contentFor: () => contentFor() }) as RunAiFn;
}

test("AI 商业判断：合法输出 → 生成完整判断（含推荐/方向/90天/首批客户）", async () => {
  const judgment = await generateBusinessJudgment({
    runAi: fakeJudgmentRunAi(JUDGMENT_JSON),
    report: {
      opportunityId: "opp-j1",
      opportunityName: "AI 数字分身托管服务",
      executiveSummary: "面向创作者经济，中腰部需求最迫切，付费意愿待验证。",
      sections: [],
      score: { version: 1, overall_score: 5.1, confidence: 0.45, score_breakdown: [], evidence: [], assumptions: [], unknowns: [], validation_required: [], createdAt: "now" },
      validationPlan: [{ assumption: "中腰部付费意愿", method: "深度访谈", successCriteria: "≥70%", effort: "medium" }],
      nextActions: ["访谈 10-20 名创作者"],
      sources: [],
      conflicts: [],
      crossValidatedAreas: [],
      insufficientEvidence: [],
      competitors: [],
      meta: { degraded: false, externalEvidenceAvailable: false, notice: "", generatedAt: "now", providers: {} },
    },
    runId: "run-j1",
    opportunity: { id: "opp-j1", name: "AI 数字分身托管服务" },
  });
  assert.ok(judgment.id.startsWith("judgment-"));
  assert.equal(judgment.opportunityId, "opp-j1");
  assert.equal(judgment.recommendation, "conditional_enter");
  assert.ok(judgment.oneLineJudgment.length > 0);
  assert.ok(judgment.notDoList.length >= 1);
  assert.ok((judgment.strategyChoice ?? "").length > 0, "商业战略选择");
  assert.ok((judgment.mvpPlan ?? "").length > 0, "MVP 方案");
  assert.ok((judgment.acquisitionChannels ?? []).length >= 1, "获客渠道");
  assert.ok((judgment.headlineExamples ?? []).length >= 1, "标题案例");
  assert.ok((judgment.riskControl ?? "").length > 0, "风险控制");
  assert.equal(judgment.version, 1, "首次生成版本为 1");
  assert.equal(judgment.day90Plan.length, 3);
  assert.equal(judgment.day90Plan[0].phase, "阶段1 市场验证");
  assert.ok((judgment.day90Plan[0].goal ?? "").length > 0, "路线图阶段目标");
  assert.ok((judgment.day90Plan[0].aiActions ?? []).length >= 1, "AI 自动动作");
  assert.ok((judgment.day90Plan[0].userActions ?? []).length >= 1, "用户动作");
  assert.ok((judgment.day90Plan[0].risk ?? "").length > 0, "阶段风险");
  assert.ok(judgment.firstCustomers.channels.length >= 1);
  assert.equal(judgment.confidence, 0.55);
});

test("AI 商业判断：第一次非法第二次合法 → 重试成功", async () => {
  let calls = 0;
  const judgment = await generateBusinessJudgment({
    runAi: fakeJudgmentRunAi(() => (++calls === 1 ? "坏 JSON" : JUDGMENT_JSON())),
    report: {
      opportunityId: "opp-j2",
      opportunityName: "n",
      executiveSummary: "s",
      sections: [],
      score: { version: 1, overall_score: 5, confidence: 0.5, score_breakdown: [], evidence: [], assumptions: [], unknowns: [], validation_required: [], createdAt: "now" },
      validationPlan: [],
      nextActions: [],
      sources: [],
      conflicts: [],
      crossValidatedAreas: [],
      insufficientEvidence: [],
      competitors: [],
      meta: { degraded: false, externalEvidenceAvailable: false, notice: "", generatedAt: "now", providers: {} },
    },
    runId: "run-j2",
    opportunity: { id: "opp-j2", name: "n" },
  });
  assert.ok(judgment.oneLineJudgment);
  assert.equal(calls, 2);
});

test("AI 商业判断：两次失败 → 抛错，不伪造", async () => {
  await assert.rejects(
    generateBusinessJudgment({
      runAi: fakeJudgmentRunAi(() => "坏 JSON"),
      report: {
        opportunityId: "opp-j3",
        opportunityName: "n",
        executiveSummary: "s",
        sections: [],
        score: { version: 1, overall_score: 5, confidence: 0.5, score_breakdown: [], evidence: [], assumptions: [], unknowns: [], validation_required: [], createdAt: "now" },
        validationPlan: [],
        nextActions: [],
        sources: [],
        conflicts: [],
        crossValidatedAreas: [],
        insufficientEvidence: [],
        competitors: [],
        meta: { degraded: false, externalEvidenceAvailable: false, notice: "", generatedAt: "now", providers: {} },
      },
      runId: "run-j3",
      opportunity: { id: "opp-j3", name: "n" },
    }),
    /两次/,
  );
});

test("DecisionService.generateJudgment：保存到研究报告（report.judgment）", async () => {
  const { service, researchRepo } = createDecisionService({ runAi: fakeJudgmentRunAi(JUDGMENT_JSON) });
  await makeResearchRun(researchRepo, "opp-j4");
  const judgment = await service.generateJudgment("opp-j4");
  assert.ok(judgment.id);
  const run = await researchRepo.getRun("opp-j4");
  assert.equal(run?.report?.judgment?.id, judgment.id);
  assert.equal(run?.report?.judgment?.recommendation, "conditional_enter");
});

test("DecisionService.generateJudgment：重复生成版本递增（v1 → v2）", async () => {
  const { service, researchRepo } = createDecisionService({ runAi: fakeJudgmentRunAi(JUDGMENT_JSON) });
  await makeResearchRun(researchRepo, "opp-j5");
  const v1 = await service.generateJudgment("opp-j5");
  assert.equal(v1.version, 1);
  const v2 = await service.generateJudgment("opp-j5");
  assert.equal(v2.version, 2);
  const run = await researchRepo.getRun("opp-j5");
  assert.equal(run?.report?.judgment?.version, 2);
});
