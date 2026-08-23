import type { OpportunityScore } from "@/lib/types";

/**
 * 综合评分权重。
 * 竞争与风险越高越不利，因此以 (10 - 值) 参与加权。
 */
const SCORE_WEIGHTS = {
  demand: 0.25,
  competition: 0.15,
  willingnessToPay: 0.25,
  moat: 0.2,
  risk: 0.15,
} as const;

/** 根据各维度计算综合评分（0-10，保留一位小数） */
export function computeOverallScore(
  score: Omit<OpportunityScore, "overall">,
): number {
  const weighted =
    score.demand * SCORE_WEIGHTS.demand +
    (10 - score.competition) * SCORE_WEIGHTS.competition +
    score.willingnessToPay * SCORE_WEIGHTS.willingnessToPay +
    score.moat * SCORE_WEIGHTS.moat +
    (10 - score.risk) * SCORE_WEIGHTS.risk;
  return Math.round(weighted * 10) / 10;
}