/**
 * Investment Thesis 测试（V0.4.1 Phase 7A）。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateInvestmentThesis } from "../thesis";
import { createDecisionService, createReviewRunAi, makeResearchRun } from "./helpers";
import type { RunAiFn } from "../../research/ai-call";
import type { ResearchReport } from "../../research/types";

const THESIS_JSON = () =>
  JSON.stringify({
    coreHypothesis: "万圣节海外社交电商具备 2 个月窗口内的测款机会",
    logicChain: ["季节性需求明确", "社媒流量可低成本测试", "测款通过后可放大"],
    keyAssumptions: [{ claim: "年轻用户愿意在社媒直接下单", evidenceClass: "NEEDS_VALIDATION" }],
    invalidators: ["测款转化率低于 1%", "物流赶不上 10/31"],
    expectedUpside: "单款爆品可覆盖全部测款成本",
    decisionGate: "测款转化率 ≥ 2% 且 ROI ≥ 2 即 proceed",
    confidence: 0.6,
  });

function fakeThesisRunAi(contentFor: () => string): RunAiFn {
  const runAi = createReviewRunAi({ contentFor: () => contentFor() });
  return runAi as RunAiFn;
}

function makeReport(): ResearchReport {
  return {
    opportunityId: "opp-t1",
    opportunityName: "万圣节产品海外社交媒体",
    executiveSummary: "万圣节是强季节性电商窗口，社媒流量可低成本测款。",
    sections: [],
    score: { version: 1, overall_score: 5.7, confidence: 0.65, score_breakdown: [], evidence: [], assumptions: [], unknowns: [], validation_required: [], createdAt: "now" },
    validationPlan: [],
    nextActions: ["用 Google Trends 验证热度", "小批量测款"],
    sources: [],
    conflicts: [],
    crossValidatedAreas: [],
    insufficientEvidence: [],
    competitors: [],
    meta: { degraded: false, externalEvidenceAvailable: false, notice: "", generatedAt: "now", providers: {} },
  };
}

test("Investment Thesis：合法输出 → 生成完整论点（含绑定）", async () => {
  const thesis = await generateInvestmentThesis({
    runAi: fakeThesisRunAi(THESIS_JSON),
    report: makeReport(),
    runId: "run-t1",
    opportunity: { id: "opp-t1", name: "万圣节产品海外社交媒体" },
  });
  assert.ok(thesis.id.startsWith("thesis-"));
  assert.equal(thesis.opportunityId, "opp-t1");
  assert.equal(thesis.runId, "run-t1");
  assert.equal(thesis.coreHypothesis.includes("测款"), true);
  assert.ok(thesis.logicChain.length >= 2);
  assert.ok(thesis.invalidators.length >= 1);
  assert.ok(thesis.decisionGate.length > 0);
  assert.equal(thesis.confidence, 0.6);
});

test("Investment Thesis：第一次非法第二次合法 → 重试成功", async () => {
  let calls = 0;
  const thesis = await generateInvestmentThesis({
    runAi: fakeThesisRunAi(() => (++calls === 1 ? "坏 JSON" : THESIS_JSON())),
    report: makeReport(),
    runId: "run-t2",
    opportunity: { id: "opp-t2", name: "n" },
  });
  assert.ok(thesis.coreHypothesis);
  assert.equal(calls, 2);
});

test("Investment Thesis：两次失败 → 抛错，不伪造", async () => {
  await assert.rejects(
    generateInvestmentThesis({
      runAi: fakeThesisRunAi(() => "坏 JSON"),
      report: makeReport(),
      runId: "run-t3",
      opportunity: { id: "opp-t3", name: "n" },
    }),
    /两次/,
  );
});

test("DecisionService.generateInvestmentThesis：保存到研究报告（report.thesis）", async () => {
  const { service, researchRepo } = createDecisionService({ runAi: fakeThesisRunAi(THESIS_JSON) });
  await makeResearchRun(researchRepo, "opp-t4");
  const thesis = await service.generateInvestmentThesis("opp-t4");
  assert.ok(thesis.id);
  const run = await researchRepo.getRun("opp-t4");
  assert.equal(run?.report?.thesis?.id, thesis.id);
});