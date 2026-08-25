/**
 * Evidence Score 测试（V0.9.1）。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateEvidenceScore, computeEvidenceCoverage } from "../evidence-score";
import { createDecisionService, createReviewRunAi, makeResearchRun } from "./helpers";
import type { RunAiFn } from "../../research/ai-call";
import type { ResearchReport } from "../../research/types";

const ESCORE_JSON = () =>
  JSON.stringify({
    dimensions: [
      { dimension: "market_opportunity", label: "市场机会", weight: 0.2, score: 6.5, confidence: 0.6, rationale: "创作者经济规模大", evidence: [{ claim: "全球创作者经济数百亿美元", evidenceClass: "NEEDS_VALIDATION", confidence: 0.4, verificationMethod: "行业报告" }] },
      { dimension: "user_demand", label: "用户需求", weight: 0.2, score: 7, confidence: 0.65, rationale: "中腰部需求迫切", evidence: [{ claim: "中腰部创作者私信负担重", evidenceClass: "AI_INFERENCE", confidence: 0.6, verificationMethod: "用户访谈" }] },
      { dimension: "monetization", label: "商业化", weight: 0.2, score: 6, confidence: 0.5, rationale: "按效果付费更受欢迎", evidence: [{ claim: "按效果付费接受度更高", evidenceClass: "AI_INFERENCE", confidence: 0.5 }] },
      { dimension: "competitive_opportunity", label: "竞争机会", weight: 0.15, score: 6.5, confidence: 0.5, rationale: "竞品缺乏深度整合", evidence: [{ claim: "现有方案缺创作者工作流整合", evidenceClass: "AI_INFERENCE", confidence: 0.5 }] },
      { dimension: "technical_feasibility", label: "技术可行性", weight: 0.15, score: 7, confidence: 0.6, rationale: "大模型已成熟", evidence: [{ claim: "多语言生成技术成熟", evidenceClass: "AI_INFERENCE", confidence: 0.6 }] },
      { dimension: "risk", label: "风险", weight: 0.1, score: 5.5, confidence: 0.5, rationale: "平台政策风险", evidence: [{ claim: "平台可能限制AI分身", evidenceClass: "NEEDS_VALIDATION", confidence: 0.4 }] },
    ],
    confidence: 0.55,
  });

function fakeEscoreRunAi(contentFor: () => string): RunAiFn {
  return createReviewRunAi({ contentFor: () => contentFor() }) as RunAiFn;
}

function makeReport(): ResearchReport {
  return {
    opportunityId: "opp-e1",
    opportunityName: "AI 数字分身托管",
    executiveSummary: "面向创作者经济。",
    sections: [{ area: "market", title: "市场", content: "规模大", evidence: [], confidence: 0.5 }],
    score: { version: 1, overall_score: 5.5, confidence: 0.5, score_breakdown: [], evidence: [], assumptions: [], unknowns: [], validation_required: [], createdAt: "now" },
    validationPlan: [{ assumption: "付费意愿", method: "访谈", successCriteria: "≥70%", effort: "medium" }],
    nextActions: [],
    sources: [],
    conflicts: [],
    crossValidatedAreas: [],
    insufficientEvidence: [],
    competitors: [],
    meta: { degraded: false, externalEvidenceAvailable: false, notice: "", generatedAt: "now", providers: {} },
  };
}

test("Evidence Score：合法输出 → 6 维度 + 加权总分 + 证据覆盖", async () => {
  const es = await generateEvidenceScore({
    runAi: fakeEscoreRunAi(ESCORE_JSON),
    report: makeReport(),
    runId: "run-e1",
    opportunity: { id: "opp-e1", name: "n" },
  });
  assert.ok(es.id.startsWith("escore-"));
  assert.equal(es.dimensions.length, 6);
  // 加权总分 = 6.5*0.2 + 7*0.2 + 6*0.2 + 6.5*0.15 + 7*0.15 + 5.5*0.1 = 1.3+1.4+1.2+0.975+1.05+0.55 = 6.475 → 6.5
  assert.equal(es.overall, 6.5);
  assert.equal(es.confidence, 0.55);
  assert.ok(es.evidenceCoverage.dataSupported >= 0);
  assert.ok(es.evidenceCoverage.aiInferred >= 0);
});

test("computeEvidenceCoverage：FACT 数据支持，其余 AI 推理", () => {
  const c = computeEvidenceCoverage([
    { claim: "a", evidenceClass: "FACT", confidence: 1 },
    { claim: "b", evidenceClass: "AI_INFERENCE", confidence: 0.5 },
    { claim: "c", evidenceClass: "NEEDS_VALIDATION", confidence: 0.5 },
  ]);
  assert.ok(Math.abs(c.dataSupported - 1 / 3) < 1e-9, "dataSupported ≈ 1/3");
  assert.ok(Math.abs(c.aiInferred - 2 / 3) < 1e-9, "aiInferred ≈ 2/3");
  assert.deepEqual(computeEvidenceCoverage([]), { dataSupported: 0, aiInferred: 1 });
});

test("Evidence Score：两次失败 → 抛错，不伪造", async () => {
  await assert.rejects(
    generateEvidenceScore({
      runAi: fakeEscoreRunAi(() => "坏 JSON"),
      report: makeReport(),
      runId: "run-e3",
      opportunity: { id: "opp-e3", name: "n" },
    }),
    /两次/,
  );
});

test("DecisionService.generateEvidenceScore：保存到研究报告（report.evidenceScore）", async () => {
  const { service, researchRepo } = createDecisionService({ runAi: fakeEscoreRunAi(ESCORE_JSON) });
  await makeResearchRun(researchRepo, "opp-e4");
  const es = await service.generateEvidenceScore("opp-e4");
  assert.ok(es.id);
  const run = await researchRepo.getRun("opp-e4");
  assert.equal(run?.report?.evidenceScore?.id, es.id);
  assert.equal(run?.report?.evidenceScore?.dimensions.length, 6);
});
