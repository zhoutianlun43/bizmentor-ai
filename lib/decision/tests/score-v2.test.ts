import { test } from "node:test";
import assert from "node:assert/strict";
import { createDecisionService, makeResearchRun } from "./helpers";
import { computeScoreV2 } from "../scoring";
import type { EvidenceItem, ScoreDimension, ScoreVersion } from "../../research/types";

function buildPrevScore(overall: number, confidence: number): ScoreVersion {
  const dims: Array<{ dimension: ScoreDimension; score: number; confidence: number; rationale: string; evidence: EvidenceItem[] }> = [
    { dimension: "demand", score: 8, confidence: 0.6, rationale: "r", evidence: [] },
    { dimension: "market", score: 7, confidence: 0.5, rationale: "r", evidence: [] },
    { dimension: "competition", score: 4, confidence: 0.5, rationale: "r", evidence: [] },
    { dimension: "willingnessToPay", score: 8, confidence: 0.6, rationale: "r", evidence: [] },
    { dimension: "moat", score: 6, confidence: 0.5, rationale: "r", evidence: [] },
    { dimension: "customerAcquisition", score: 3, confidence: 0.5, rationale: "r", evidence: [] },
    { dimension: "risk", score: 2, confidence: 0.5, rationale: "r", evidence: [] },
  ];
  return {
    version: 1,
    overall_score: overall,
    confidence,
    score_breakdown: dims,
    assumptions: [],
    unknowns: [],
    validation_required: [],
    createdAt: "2026-08-23T00:00:00.000Z",
  };
}

/** 8. Score v1 → v2 */
test("computeScoreV2：真实验证结果驱动评分更新", () => {
  const prev = buildPrevScore(7.3, 0.54);
  const results = [
    { id: "r1", taskId: "t1", planId: "p", decisionId: "d", opportunityId: "o", actualSample: "10 人", actualResult: "9 人愿意付费", userFeedback: "", outcome: "confirmed" as const, submittedBy: "u", submittedAt: "now" },
    { id: "r2", taskId: "t2", planId: "p", decisionId: "d", opportunityId: "o", actualSample: "5 家", actualResult: "获客成本很高", userFeedback: "", outcome: "rejected" as const, submittedBy: "u", submittedAt: "now" },
  ];
  const { next } = computeScoreV2(prev, results, { t1: "willingnessToPay", t2: "customerAcquisition" });

  assert.equal(next.version, 2);
  // willingnessToPay +0.5 → 8.5；customerAcquisition rejected -1.0 → 2.0
  const wtp = next.score_breakdown.find((d) => d.dimension === "willingnessToPay");
  const ca = next.score_breakdown.find((d) => d.dimension === "customerAcquisition");
  assert.equal(wtp?.score, 8.5);
  assert.equal(ca?.score, 2.0);
  assert.ok(next.overall_score !== prev.overall_score, "overall 应变化");
  assert.ok(next.overall_score > prev.overall_score, "付费证实 + 获客证伪 → 总体应上升");
  assert.ok(next.reason?.includes("证实") && next.reason?.includes("证伪"));
});

/** 9. Score 变化可追溯 */
test("ScoreUpdate：记录变化前/变化后/原因/新增证据/验证结果", () => {
  const prev = buildPrevScore(7.3, 0.54);
  const results = [
    { id: "r1", taskId: "t1", planId: "p", decisionId: "d", opportunityId: "o", actualSample: "10 人", actualResult: "9 人愿意付费", userFeedback: "价格可接受", outcome: "confirmed" as const, submittedBy: "u", submittedAt: "now" },
  ];
  const { next, update } = computeScoreV2(prev, results, { t1: "willingnessToPay" });

  assert.equal(update.fromVersion, 1);
  assert.equal(update.toVersion, 2);
  assert.equal(update.before.overall_score, 7.3);
  assert.equal(update.after.overall_score, next.overall_score);
  assert.ok(update.reason.length > 0);
  assert.equal(update.newEvidence.length, 1);
  assert.equal(update.newEvidence[0].evidenceClass, "FACT");
  assert.equal(update.validationResults.length, 1);
  assert.equal(update.validationResults[0].outcome, "confirmed");
});

/** 8b. 端到端：applyValidationToScore 把 v2 追加到 run.scoreHistory */
test("applyValidationToScore：Score v2 追加到 scoreHistory", async () => {
  const { service, researchRepo } = createDecisionService();
  await makeResearchRun(researchRepo, "opp-sv1");
  const { decision } = await service.createDecision({
    opportunityId: "opp-sv1",
    decision: "validate",
    differentFromAi: false,
    judgment: { why: "w", coreJudgment: "c", keyEvidence: "e", biggestRisk: "r", mostImportantAssumption: "a", expectedOutcome: "o" },
  });
  const plan = await service.createValidationPlan({
    decisionId: decision.id,
    opportunityId: "opp-sv1",
    tasks: [{ assumption: "付费", hypothesis: "h", method: "访谈", sampleSize: "10", successCriteria: "sc", failureCriteria: "fc", deadline: "d", costEstimate: "c", owner: "o", relatedDimension: "willingnessToPay" }],
  });
  await service.submitValidationResult({
    taskId: plan.tasks[0].id,
    actualSample: "10 人",
    actualResult: "8 人愿意付费",
    userFeedback: "",
    outcome: "confirmed",
    submittedBy: "u",
  });

  const { next, update } = await service.applyValidationToScore(decision.id);
  assert.equal(next.version, 2);
  assert.equal(update.fromVersion, 1);

  const run = await researchRepo.getRun("opp-sv1");
  assert.equal(run?.scoreHistory.length, 2, "scoreHistory 应含 v1 + v2");
  assert.equal(run?.scoreHistory[1].version, 2);
});