/**
 * LearningEvent 生成（V0.3-C，确定性）。
 * 为未来 12 维能力画像预留数据；AI 复盘信号来自 Examiner 的 ability_signals。
 */
import type { LearningEvent, UserDecision, UserDecisionReview, ValidationResult } from "./types";
import type { ScoreUpdate } from "./types";
import { uid } from "../store/storage";

export interface LearningSource {
  userId: string;
  opportunityId: string;
  decision?: UserDecision;
  review?: UserDecisionReview;
  results?: ValidationResult[];
  scoreUpdate?: ScoreUpdate;
}

/** 生成学习事件（确定性） */
export function generateLearningEvents(source: LearningSource): LearningEvent[] {
  const events: LearningEvent[] = [];
  const at = () => new Date().toISOString();

  if (source.decision) {
    events.push({
      id: uid(),
      userId: source.userId,
      opportunityId: source.opportunityId,
      decisionId: source.decision.id,
      skill: "strategic_judgment",
      signal: source.decision.differentFromAi ? "neutral" : "positive",
      severity: 0.3,
      evidence: `用户做出决策：${source.decision.decision}${source.decision.differentFromAi ? "（与 AI 判断不同）" : ""}`,
      createdAt: at(),
    });
  }

  if (source.review) {
    for (const s of source.review.abilitySignals) {
      events.push({
        id: uid(),
        userId: source.userId,
        opportunityId: source.opportunityId,
        decisionId: source.review.decisionId,
        skill: s.skill,
        signal: s.signal,
        severity: s.severity,
        evidence: s.evidence,
        createdAt: at(),
      });
    }
    events.push({
      id: uid(),
      userId: source.userId,
      opportunityId: source.opportunityId,
      decisionId: source.review.decisionId,
      skill: "review",
      signal: "neutral",
      severity: 0.4,
      evidence: `AI Examiner 评审分 ${source.review.score}/10`,
      createdAt: at(),
    });
  }

  for (const r of source.results ?? []) {
    const signal = r.outcome === "confirmed" ? "positive" : r.outcome === "rejected" ? "positive" : "neutral";
    const label = r.outcome === "confirmed" ? "假设被证实" : r.outcome === "rejected" ? "假设被证伪（重要学习）" : "结果不确定";
    events.push({
      id: uid(),
      userId: source.userId,
      opportunityId: source.opportunityId,
      decisionId: source.decision?.id ?? undefined,
      skill: "validation",
      signal,
      severity: 0.5,
      evidence: `${label}：${r.actualResult.slice(0, 60)}`,
      createdAt: at(),
    });
    if (r.actualRevenue !== undefined || r.actualConversionRate !== undefined) {
      events.push({
        id: uid(),
        userId: source.userId,
        opportunityId: source.opportunityId,
        decisionId: source.decision?.id ?? undefined,
        skill: r.actualRevenue !== undefined ? "unit_economics" : "willingness_to_pay",
        signal: "neutral",
        severity: 0.4,
        evidence: `实际数据：${r.actualRevenue !== undefined ? `收入 ${r.actualRevenue}` : `转化率 ${r.actualConversionRate}`}`,
        createdAt: at(),
      });
    }
  }

  if (source.scoreUpdate) {
    events.push({
      id: uid(),
      userId: source.userId,
      opportunityId: source.opportunityId,
      decisionId: source.decision?.id ?? undefined,
      skill: "review",
      signal: "neutral",
      severity: 0.4,
      evidence: `评分 v${source.scoreUpdate.fromVersion} → v${source.scoreUpdate.toVersion}：${source.scoreUpdate.reason.slice(0, 60)}`,
      createdAt: at(),
    });
  }

  return events;
}