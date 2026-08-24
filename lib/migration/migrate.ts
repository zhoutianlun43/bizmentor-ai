/**
 * localStorage → Supabase 迁移（V0.4.1 Phase 5 Task 5A）。
 * 纯函数部分：解析导出 JSON → 转换为数据库行（保留原 id）→ 统计。
 * 不修改业务逻辑 / schema；不删除 localStorage。
 */
import type { Opportunity } from "../types";
import type { ResearchRun } from "../research/types";
import type { DecisionData } from "../decision/repository";

type Row = Record<string, unknown>;

export interface ParsedMigrationData {
  opportunities: Opportunity[];
  researchRuns: ResearchRun[];
  decisionData: DecisionData;
}

export interface MigrationRows {
  opportunities: Row[];
  researchRuns: Row[];
  decisions: Row[];
  reviews: Row[];
  plans: Row[];
  results: Row[];
  events: Row[];
  scoreUpdates: Row[];
}

/**
 * 解析导出的 localStorage JSON。
 * 支持两种格式：
 * 1) 存储键映射：{ "bizmentor:v1:opportunities": [...], "bizmentor:v1:researchRuns": [...], "bizmentor:v1:decisionData": {...} }
 * 2) 结构化：{ opportunities: [...], researchRuns: [...], decisionData: {...} }
 */
export function parseExport(raw: unknown): ParsedMigrationData {
  const r = (raw ?? {}) as Record<string, unknown>;
  const pick = <T>(key: string, fallback: T): T => {
    const v = r["bizmentor:v1:" + key] ?? r[key];
    return (v === undefined || v === null ? fallback : (v as T));
  };
  return {
    opportunities: pick<Opportunity[]>("opportunities", []),
    researchRuns: pick<ResearchRun[]>("researchRuns", []),
    decisionData: pick<DecisionData>("decisionData", {
      decisions: [], reviews: [], plans: [], results: [], events: [], updates: [],
    }),
  };
}

/** 迁移数量统计 */
export function summarize(data: ParsedMigrationData): Record<string, number> {
  return {
    opportunities: data.opportunities.length,
    researchRuns: data.researchRuns.length,
    decisions: data.decisionData.decisions.length,
    reviews: data.decisionData.reviews.length,
    plans: data.decisionData.plans.length,
    results: data.decisionData.results.length,
    events: data.decisionData.events.length,
    scoreUpdates: data.decisionData.updates.length,
  };
}

/** 把本地对象转换为数据库行（user_id 固定 local-user；保留原 id） */
export function buildRows(data: ParsedMigrationData, userId = "local-user"): MigrationRows {
  const opportunities = data.opportunities.map((o) => ({
    id: o.id,
    user_id: userId,
    name: o.name,
    description: o.description,
    source: o.source,
    status: o.status,
    score: o.score ?? null,
    notes: o.notes ?? null,
    created_at: o.createdAt,
    updated_at: o.createdAt,
  }));

  const researchRuns = data.researchRuns.map((r) => ({
    run_id: r.runId,
    user_id: userId,
    opportunity_id: r.opportunityId,
    status: r.status,
    stages: r.stages,
    findings: r.findings,
    score_history: r.scoreHistory,
    source_documents: r.sourceDocuments,
    evidence_validation: r.evidenceValidation ?? null,
    report: r.report ?? null,
    error: r.error ?? null,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  }));

  const decisions = data.decisionData.decisions.map((d) => ({
    id: d.id,
    user_id: userId,
    opportunity_id: d.opportunityId,
    run_id: d.runId ?? null,
    decision: d.decision,
    different_from_ai: d.differentFromAi,
    judgment: d.judgment,
    ai_score_snapshot: d.aiScoreSnapshot ?? null,
    created_at: d.createdAt,
    updated_at: d.updatedAt,
  }));

  const reviews = data.decisionData.reviews.map((r) => ({
    id: r.id,
    decision_id: r.decisionId,
    user_id: userId,
    score: r.score,
    strengths: r.strengths,
    weaknesses: r.weaknesses,
    reasoning_gaps: r.reasoningGaps,
    missing_evidence: r.missingEvidence,
    recommended_actions: r.recommendedActions,
    ability_signals: r.abilitySignals,
    provider: r.provider ?? null,
    provider_degraded: r.provider_degraded,
    created_at: r.createdAt,
  }));

  const plans = data.decisionData.plans.map((p) => ({
    id: p.id,
    decision_id: p.decisionId,
    user_id: userId,
    opportunity_id: p.opportunityId,
    tasks: p.tasks,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  }));

  const results = data.decisionData.results.map((res) => ({
    id: res.id,
    task_id: res.taskId,
    plan_id: res.planId,
    decision_id: res.decisionId,
    user_id: userId,
    opportunity_id: res.opportunityId,
    actual_sample: res.actualSample ?? null,
    actual_result: res.actualResult,
    user_feedback: res.userFeedback ?? null,
    actual_conversion_rate: res.actualConversionRate ?? null,
    actual_revenue: res.actualRevenue ?? null,
    actual_cost: res.actualCost ?? null,
    other_evidence: res.otherEvidence ?? null,
    outcome: res.outcome,
    submitted_by: res.submittedBy,
    submitted_at: res.submittedAt,
  }));

  const events = data.decisionData.events.map((e) => ({
    id: e.id,
    user_id: userId,
    opportunity_id: e.opportunityId ?? null,
    decision_id: e.decisionId ?? null,
    skill: e.skill,
    signal: e.signal,
    severity: e.severity,
    evidence: e.evidence ?? null,
    created_at: e.createdAt,
  }));

  // ScoreUpdate 无 id，迁移时生成
  const scoreUpdates = data.decisionData.updates.map((u) => ({
    id: "mig-" + Math.random().toString(36).slice(2, 10),
    decision_id: u.decisionId ?? null,
    user_id: userId,
    from_version: u.fromVersion,
    to_version: u.toVersion,
    before: u.before,
    after: u.after,
    reason: u.reason ?? null,
    new_evidence: u.newEvidence,
    validation_results: u.validationResults,
    created_at: u.createdAt,
  }));

  return { opportunities, researchRuns, decisions, reviews, plans, results, events, scoreUpdates };
}
