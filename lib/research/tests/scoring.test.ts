import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildScoreResult,
  computeConfidence,
  computeOverallScore,
  SCORE_DIMENSIONS,
} from "../scoring";
import type { ScoreProposal } from "../types";
import { SCORE_DIMS } from "./helpers";

function proposalWith(scores: Record<string, number>): ScoreProposal {
  return {
    dimensions: SCORE_DIMENSIONS.map((d) => ({
      dimension: d,
      score: scores[d] ?? 5,
      confidence: 0.5,
      rationale: "r",
      evidence: [],
    })),
  };
}

test("overall_score 确定性计算（负向维度用 10-score）", () => {
  const overall = computeOverallScore({ dimensions: SCORE_DIMS.map((d) => ({ ...d, rationale: "r", evidence: [] })) });
  assert.equal(overall, 7.3);
});

test("边界：正向最优(10)+负向最优(0) → 10；正向最差(0)+负向最差(10) → 0", () => {
  assert.equal(computeOverallScore(proposalWith({})), 5);
  // 竞争/获客/风险为负向维度：10 分=最差，用 (10-score) 参与
  const best = { demand: 10, market: 10, competition: 0, willingnessToPay: 10, moat: 10, customerAcquisition: 0, risk: 0 };
  assert.equal(computeOverallScore(proposalWith(best)), 10);
  const worst = { demand: 0, market: 0, competition: 10, willingnessToPay: 0, moat: 0, customerAcquisition: 10, risk: 10 };
  assert.equal(computeOverallScore(proposalWith(worst)), 0);
});

test("confidence 聚合（加权平均）", () => {
  const confidence = computeConfidence({ dimensions: SCORE_DIMS.map((d) => ({ ...d, rationale: "r", evidence: [] })) });
  assert.equal(confidence, 0.54);
});

test("buildScoreResult：提取 assumptions / unknowns / validation_required", () => {
  const proposal: ScoreProposal = {
    dimensions: SCORE_DIMENSIONS.map((d) => ({
      dimension: d,
      score: 6,
      confidence: 0.5,
      rationale: "r",
      evidence: [
        { claim: `${d}-假设`, evidenceClass: "ASSUMPTION", confidence: 0.4 },
        { claim: `${d}-需验证`, evidenceClass: "NEEDS_VALIDATION", confidence: 0.3 },
      ],
    })),
  };
  const result = buildScoreResult(proposal, []);
  assert.equal(result.version, 1);
  assert.ok(result.assumptions.length >= 7, "应提取全部假设");
  assert.ok(result.unknowns.length >= 7, "应提取全部待验证项");
  assert.equal(result.validation_required.length, result.unknowns.length);
  assert.ok(result.score_breakdown.length === 7);
});

test("评分可复算：相同输入两次计算一致", () => {
  const a = computeOverallScore({ dimensions: SCORE_DIMS.map((d) => ({ ...d, rationale: "r", evidence: [] })) });
  const b = computeOverallScore({ dimensions: SCORE_DIMS.map((d) => ({ ...d, rationale: "r", evidence: [] })) });
  assert.equal(a, b);
});