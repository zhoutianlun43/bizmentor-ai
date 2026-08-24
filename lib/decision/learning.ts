/**
 * LearningEvent 生成（V0.3-C，确定性）。
 * 为未来 12 维能力画像预留数据；AI 复盘信号来自 Examiner 的 ability_signals。
 */
import type { LearningEvent, UserDecision, UserDecisionReview, ValidationResult, ValidationTask } from "./types";
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

/**
 * 验证执行学习事件接口（V0.4.1 Phase 7B-2）。
 * 把验证执行动作（开始/完成/失败/取消/提交结果）转化为能力画像数据流。
 * 确定性映射：completed confirmed/rejected → validation positive（证伪也是学习）；
 * failed → validation negative；started/cancelled → neutral。
 */
export interface ExecutionLearningInput {
  userId: string;
  opportunityId: string;
  decisionId: string;
  action: "task_started" | "task_completed" | "task_failed" | "task_cancelled" | "result_submitted";
  task: ValidationTask;
  result?: ValidationResult;
  /** 执行者（用户 / 系统 / 角色） */
  actor?: string;
}

export function createExecutionLearningEvents(input: ExecutionLearningInput): LearningEvent[] {
  const events: LearningEvent[] = [];
  const at = new Date().toISOString();
  const base = {
    userId: input.userId,
    opportunityId: input.opportunityId,
    decisionId: input.decisionId,
    createdAt: at,
  };
  const by = input.actor ? `（执行者：${input.actor}）` : "";
  const claim = input.task.assumption.slice(0, 60);

  switch (input.action) {
    case "task_started":
      events.push({ ...base, id: uid(), skill: "validation", signal: "neutral", severity: 0.2, evidence: `开始验证任务：${claim}${by}` });
      break;
    case "task_completed": {
      const outcome = input.result?.outcome ?? input.task.outcome;
      const signal = outcome === "confirmed" || outcome === "rejected" ? "positive" : "neutral";
      events.push({ ...base, id: uid(), skill: "validation", signal, severity: 0.5, evidence: `完成验证任务：${claim} → ${outcome ?? "completed"}${by}` });
      break;
    }
    case "task_failed":
      events.push({ ...base, id: uid(), skill: "validation", signal: "negative", severity: 0.4, evidence: `验证任务失败：${claim}${by}` });
      break;
    case "task_cancelled":
      events.push({ ...base, id: uid(), skill: "validation", signal: "neutral", severity: 0.2, evidence: `取消验证任务：${claim}${by}` });
      break;
    case "result_submitted": {
      const outcome = input.result?.outcome;
      const signal = outcome === "confirmed" || outcome === "rejected" ? "positive" : "neutral";
      events.push({ ...base, id: uid(), skill: "validation", signal, severity: 0.5, evidence: `提交验证结果：${outcome ?? ""}${by}` });
      if (input.result && (input.result.actualRevenue !== undefined || input.result.actualConversionRate !== undefined)) {
        events.push({
          ...base,
          id: uid(),
          skill: input.result.actualRevenue !== undefined ? "unit_economics" : "willingness_to_pay",
          signal: "neutral",
          severity: 0.4,
          evidence: `实际数据：${input.result.actualRevenue !== undefined ? `收入 ${input.result.actualRevenue}` : `转化率 ${input.result.actualConversionRate}`}`,
        });
      }
      break;
    }
  }
  return events;
}