/**
 * 确定性评分（可复算、可单测）。
 * AI 只提供 score proposal / confidence / rationale / evidence；
 * overall_score 与 confidence 聚合由这里的纯函数计算，不依赖 LLM 算术。
 * 评分带版本：Score v1 / v2 / v3 …，未来随用户验证结果更新。
 */
import type {
  DimensionScore,
  EvidenceItem,
  ScoreDimension,
  ScoreProposal,
  ScoreResult,
  ScoreVersion,
} from "./types";

export const SCORE_DIMENSIONS: readonly ScoreDimension[] = [
  "demand",
  "market",
  "competition",
  "willingnessToPay",
  "moat",
  "customerAcquisition",
  "risk",
];

/** 维度权重（和为 1） */
export const SCORE_WEIGHTS: Record<ScoreDimension, number> = {
  demand: 0.2,
  market: 0.15,
  competition: 0.1,
  willingnessToPay: 0.2,
  moat: 0.15,
  customerAcquisition: 0.1,
  risk: 0.1,
};

/** 负向维度：分数越高越不利，聚合时用 (10 - score) */
export const NEGATIVE_DIMENSIONS: ReadonlySet<ScoreDimension> = new Set([
  "competition",
  "customerAcquisition",
  "risk",
]);

export const DIMENSION_LABELS: Record<ScoreDimension, string> = {
  demand: "需求",
  market: "市场",
  competition: "竞争",
  willingnessToPay: "付费",
  moat: "壁垒",
  customerAcquisition: "获客",
  risk: "风险",
};

export function clampScore(value: number): number {
  return Math.min(10, Math.max(0, value));
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** 确定性 overall_score（0-10，保留 1 位小数） */
export function computeOverallScore(proposal: ScoreProposal): number {
  const byDim = new Map(proposal.dimensions.map((d) => [d.dimension, clampScore(d.score)]));
  let weighted = 0;
  let weightSum = 0;
  for (const dim of SCORE_DIMENSIONS) {
    const score = byDim.get(dim) ?? 0;
    const effective = NEGATIVE_DIMENSIONS.has(dim) ? 10 - score : score;
    weighted += effective * SCORE_WEIGHTS[dim];
    weightSum += SCORE_WEIGHTS[dim];
  }
  return round1(weighted / weightSum);
}

/** 确定性 confidence 聚合（0-1，保留 2 位小数） */
export function computeConfidence(proposal: ScoreProposal): number {
  const byDim = new Map(proposal.dimensions.map((d) => [d.dimension, clamp01(d.confidence)]));
  let weighted = 0;
  let weightSum = 0;
  for (const dim of SCORE_DIMENSIONS) {
    weighted += (byDim.get(dim) ?? 0) * SCORE_WEIGHTS[dim];
    weightSum += SCORE_WEIGHTS[dim];
  }
  return Math.round((weighted / weightSum) * 100) / 100;
}

/**
 * 由 AI 提案生成 ScoreResult（v1）：
 * - 维度分数/置信度 clamp
 * - overall / confidence 确定性计算
 * - assumptions / unknowns / validation_required 提取
 */
export function buildScoreResult(proposal: ScoreProposal, evidence: EvidenceItem[]): ScoreResult {
  const breakdown: DimensionScore[] = proposal.dimensions.map((d) => ({
    ...d,
    score: clampScore(d.score),
    confidence: clamp01(d.confidence),
  }));
  const allEvidence = [...evidence, ...breakdown.flatMap((d) => d.evidence)];
  const assumptions = allEvidence.filter((e) => e.evidenceClass === "ASSUMPTION");
  const unknowns = [...new Set(allEvidence.filter((e) => e.evidenceClass === "NEEDS_VALIDATION").map((e) => e.claim))];
  const validationRequired = [...unknowns];
  return {
    version: 1,
    overall_score: computeOverallScore({ dimensions: breakdown }),
    score_breakdown: breakdown,
    confidence: computeConfidence({ dimensions: breakdown }),
    evidence: allEvidence,
    assumptions,
    unknowns,
    validation_required: validationRequired,
    createdAt: new Date().toISOString(),
  };
}


/** 应用 Evidence 规则后刷新 ScoreResult 的派生字段（证据/假设/未知/待验证） */
export function withEnforcedEvidence(
  score: ScoreResult,
  enforcedBreakdown: DimensionScore[],
): ScoreResult {
  const evidence = enforcedBreakdown.flatMap((d) => d.evidence);
  const assumptions = evidence.filter((e) => e.evidenceClass === "ASSUMPTION");
  const unknowns = [...new Set(evidence.filter((e) => e.evidenceClass === "NEEDS_VALIDATION").map((e) => e.claim))];
  return {
    ...score,
    score_breakdown: enforcedBreakdown,
    evidence,
    assumptions,
    unknowns,
    validation_required: unknowns,
  };
}
/** 生成下一个评分版本（Score v2/v3…，未来随验证结果更新） */
export function nextScoreVersion(
  prev: ScoreVersion,
  next: Omit<ScoreVersion, "version" | "createdAt">,
  reason: string,
  at?: string,
): ScoreVersion {
  return { ...next, version: prev.version + 1, reason, createdAt: at ?? new Date().toISOString() };
}