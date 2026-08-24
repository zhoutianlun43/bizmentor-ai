/**
 * Decision Memory 构建器（V0.4.1 Phase 8A）。
 * 纯函数：从既有决策/评审/验证结果/评分更新，确定性构建 DecisionMemoryRecord。
 * 不生成新数据，只做归一化聚合（AI prediction vs User prediction vs Actual result）。
 */
import type {
  DecisionMemoryRecord,
} from "./types";
import type { ScoreUpdate, UserDecision, UserDecisionReview, ValidationResult } from "../decision/types";

export interface BuildDecisionMemoryInput {
  decision: UserDecision;
  review?: UserDecisionReview;
  results?: ValidationResult[];
  scoreUpdate?: ScoreUpdate;
  domain?: string;
  opportunityName?: string;
}

function latestOutcome(results: ValidationResult[] | undefined): DecisionMemoryRecord["outcome"] {
  if (!results || results.length === 0) return "unknown";
  const sorted = [...results].sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
  return sorted[0].outcome;
}

/** 确定性经验教训摘要 */
function buildLesson(input: BuildDecisionMemoryInput, outcome: DecisionMemoryRecord["outcome"]): string {
  const { decision, domain } = input;
  const where = domain ? `在「${domain}」领域` : "";
  const verdict =
    outcome === "confirmed"
      ? "决策被验证成功"
      : outcome === "rejected"
        ? "决策被验证证伪（重要学习）"
        : outcome === "uncertain"
          ? "验证结果不确定"
          : "尚无验证结果";
  const keyEvidence = decision.judgment.keyEvidence ? `；关键证据：${decision.judgment.keyEvidence.slice(0, 60)}` : "";
  return `${where}「${decision.decision}」${verdict}${keyEvidence}`;
}

/** 构建决策记忆记录（确定性） */
export function buildDecisionMemory(input: BuildDecisionMemoryInput): DecisionMemoryRecord {
  const { decision, review, scoreUpdate, domain, opportunityName } = input;
  const outcome = latestOutcome(input.results);
  const now = new Date().toISOString();
  const skills: DecisionMemoryRecord["skills"] = (review?.abilitySignals ?? []).map((s) => ({
    skill: s.skill,
    signal: s.signal,
    severity: s.severity,
  }));

  const tags = [
    domain,
    decision.decision,
    outcome,
    ...skills.map((s) => s.skill),
  ].filter((t): t is string => Boolean(t) && t !== "unknown");

  return {
    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    decisionId: decision.id,
    opportunityId: decision.opportunityId,
    opportunityName: opportunityName ?? "",
    domain,
    decision: decision.decision,
    differentFromAi: decision.differentFromAi,
    aiPrediction: decision.aiScoreSnapshot
      ? { score: decision.aiScoreSnapshot.overall_score, confidence: decision.aiScoreSnapshot.confidence }
      : null,
    userPrediction: {
      coreJudgment: decision.judgment.coreJudgment,
      expectedOutcome: decision.judgment.expectedOutcome,
    },
    outcome,
    scoreDelta:
      scoreUpdate && scoreUpdate.before && scoreUpdate.after
        ? { from: scoreUpdate.before.overall_score, to: scoreUpdate.after.overall_score }
        : undefined,
    lesson: buildLesson(input, outcome),
    skills,
    tags,
    createdAt: now,
    updatedAt: now,
  };
}

/** 去重保存（按 decisionId 覆盖） */
export function upsertDecisionMemory(records: DecisionMemoryRecord[], incoming: DecisionMemoryRecord[]): DecisionMemoryRecord[] {
  const byId = new Map(records.map((r) => [r.decisionId, r]));
  for (const r of incoming) byId.set(r.decisionId, r);
  return [...byId.values()];
}