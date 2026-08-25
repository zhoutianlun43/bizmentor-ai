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
    day90Plan: [
      { phase: "第1-2周", title: "用户访谈", actions: ["招募 10 名中腰部创作者", "深度访谈痛点"], successMetric: "≥70% 表示有明确痛点" },
      { phase: "第3-6周", title: "MVP 测试", actions: ["做私信自动回复原型", "邀请 10 人试用"], successMetric: "≥10 个付费试用" },
      { phase: "第7-12周", title: "首单验证", actions: ["小批量售卖"], successMetric: "转化率 ≥5%" },
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
  assert.equal(judgment.day90Plan.length, 3);
  assert.equal(judgment.day90Plan[0].phase, "第1-2周");
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
