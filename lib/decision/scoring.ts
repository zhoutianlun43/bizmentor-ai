/**
 * Score v1 → v2 更新（V0.3-C，确定性、可复算）。
 * 使用真实验证结果（用户输入）调整维度分数并重新计算 overall_score。
 * AI 不参与评分更新（防止 AI 伪造结果）。
 */
import { clamp01, clampScore, computeOverallScore, round1 } from "../research/scoring";
import type { ScoreVersion } from "../research/types";
import type { ScoreUpdate, ValidationResult } from "./types";

const OUTCOME_DELTA = { confirmed: 0.5, rejected: -1.0, uncertain: 0 } as const;

/**
 * 由验证结果计算 Score v2。
 * @param prev 当前最新评分（Score v1）
 * @param results 真实验证结果
 * @param taskDimension taskId → 关联评分维度（来自验证任务）
 */
export function computeScoreV2(
  prev: ScoreVersion,
  results: ValidationResult[],
  taskDimension: Record<string, string | undefined>,
): { next: ScoreVersion; update: ScoreUpdate } {
  const breakdown = prev.score_breakdown.map((d) => ({ ...d, evidence: [...d.evidence] }));
  const byDim = new Map(breakdown.map((d) => [d.dimension, d]));

  const newEvidence: ScoreUpdate["newEvidence"] = [];
  const validationResults: ScoreUpdate["validationResults"] = [];
  const reasons: string[] = [];
  let confidence = prev.confidence;

  for (const r of results) {
    const dim = taskDimension[r.taskId];
    if (dim && byDim.has(dim as never)) {
      const d = byDim.get(dim as never)!;
      d.score = clampScore(round1(d.score + OUTCOME_DELTA[r.outcome]));
    }
    confidence = clamp01(confidence + (r.outcome === "confirmed" ? 0.05 : r.outcome === "rejected" ? -0.1 : 0));

    const outcomeLabel = r.outcome === "confirmed" ? "证实" : r.outcome === "rejected" ? "证伪" : "不确定";
    reasons.push(`假设「${r.actualResult.slice(0, 40)}」验证后${outcomeLabel}（样本：${r.actualSample}）`);
    newEvidence.push({
      claim: `验证结果：${r.actualResult}（样本 ${r.actualSample}；${outcomeLabel}）`,
      evidenceClass: "FACT",
      confidence: 0.9,
      sourceRef: { sourceType: "USER_PROVIDED", title: "用户验证结果" },
      note: r.userFeedback ? `反馈：${r.userFeedback.slice(0, 80)}` : undefined,
    });
    validationResults.push({ taskId: r.taskId, outcome: r.outcome, note: r.actualResult.slice(0, 80) });
  }

  const next: ScoreVersion = {
    ...prev,
    version: prev.version + 1,
    score_breakdown: breakdown,
    overall_score: computeOverallScore({ dimensions: breakdown }),
    confidence: round1(confidence),
    createdAt: new Date().toISOString(),
    reason: reasons.length > 0 ? reasons.join("；") : "评分版本更新",
  };

  const update: ScoreUpdate = {
    fromVersion: prev.version,
    toVersion: next.version,
    before: prev,
    after: next,
    reason: reasons.length > 0 ? reasons.join("；") : "评分版本更新",
    newEvidence,
    validationResults,
    createdAt: next.createdAt,
  };

  return { next, update };
}