/**
 * SupabaseDecisionRepository（V0.4.1 Phase 2 Task 2C）。
 * 实现现有 DecisionRepository 接口（14 个方法），保留 LocalDecisionRepository，可切换。
 * - 表：decisions / decision_reviews / validation_plans / validation_results / learning_events / score_updates
 * - json 数据用 jsonb；user_id 字符串（单用户阶段 'local-user'）
 * - 错误统一包装 SupabaseRepositoryError，不直接暴露上游 error
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "../supabase/server";
import { SupabaseRepositoryError } from "../supabase/errors";
import { uid } from "../store/storage";
import type { DecisionRepository } from "./repository";
import type {
  LearningEvent,
  ScoreUpdate,
  UserDecision,
  UserDecisionReview,
  ValidationPlan,
  ValidationResult,
} from "./types";

export interface SupabaseDecisionRepositoryOptions {
  userId?: string;
}

type Row = Record<string, unknown>;

function requireFields(operation: string, row: Row, fields: string[]): void {
  for (const f of fields) {
    if (!row[f]) {
      throw new SupabaseRepositoryError(operation, "数据不完整（缺少 " + f + "）");
    }
  }
}

// ---------- UserDecision ----------
function decisionToRow(d: UserDecision, userId: string): Row {
  return {
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
  };
}
function decisionFromRow(row: Row): UserDecision {
  requireFields("mapDecision", row, ["id", "opportunity_id", "decision", "judgment", "created_at"]);
  return {
    id: String(row.id),
    opportunityId: String(row.opportunity_id),
    runId: (row.run_id as string | null) ?? undefined,
    decision: row.decision as UserDecision["decision"],
    differentFromAi: Boolean(row.different_from_ai),
    judgment: row.judgment as UserDecision["judgment"],
    aiScoreSnapshot: (row.ai_score_snapshot as UserDecision["aiScoreSnapshot"]) ?? undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
  };
}

// ---------- UserDecisionReview ----------
function reviewToRow(r: UserDecisionReview, userId: string): Row {
  return {
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
  };
}
function reviewFromRow(row: Row): UserDecisionReview {
  requireFields("mapReview", row, ["id", "decision_id", "score"]);
  return {
    id: String(row.id),
    decisionId: String(row.decision_id),
    score: Number(row.score),
    strengths: (row.strengths as UserDecisionReview["strengths"]) ?? [],
    weaknesses: (row.weaknesses as UserDecisionReview["weaknesses"]) ?? [],
    reasoningGaps: (row.reasoning_gaps as UserDecisionReview["reasoningGaps"]) ?? [],
    missingEvidence: (row.missing_evidence as UserDecisionReview["missingEvidence"]) ?? [],
    recommendedActions: (row.recommended_actions as UserDecisionReview["recommendedActions"]) ?? [],
    abilitySignals: (row.ability_signals as UserDecisionReview["abilitySignals"]) ?? [],
    provider: (String(row.provider ?? "deepseek")) as UserDecisionReview["provider"],
    provider_degraded: Boolean(row.provider_degraded),
    createdAt: String(row.created_at),
  };
}

// ---------- ValidationPlan ----------
function planToRow(p: ValidationPlan, userId: string): Row {
  return {
    id: p.id,
    decision_id: p.decisionId,
    user_id: userId,
    opportunity_id: p.opportunityId,
    tasks: p.tasks,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}
function planFromRow(row: Row): ValidationPlan {
  requireFields("mapPlan", row, ["id", "decision_id", "opportunity_id"]);
  return {
    id: String(row.id),
    decisionId: String(row.decision_id),
    opportunityId: String(row.opportunity_id),
    tasks: (row.tasks as ValidationPlan["tasks"]) ?? [],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
  };
}

// ---------- ValidationResult ----------
function resultToRow(r: ValidationResult, userId: string): Row {
  return {
    id: r.id,
    task_id: r.taskId,
    plan_id: r.planId,
    decision_id: r.decisionId,
    user_id: userId,
    opportunity_id: r.opportunityId,
    actual_sample: r.actualSample ?? null,
    actual_result: r.actualResult,
    user_feedback: r.userFeedback ?? null,
    actual_conversion_rate: r.actualConversionRate ?? null,
    actual_revenue: r.actualRevenue ?? null,
    actual_cost: r.actualCost ?? null,
    other_evidence: r.otherEvidence ?? null,
    outcome: r.outcome,
    submitted_by: r.submittedBy,
    submitted_at: r.submittedAt,
  };
}
function resultFromRow(row: Row): ValidationResult {
  requireFields("mapResult", row, ["id", "plan_id", "actual_result", "outcome"]);
  return {
    id: String(row.id),
    taskId: String(row.task_id),
    planId: String(row.plan_id),
    decisionId: String(row.decision_id ?? ""),
    opportunityId: String(row.opportunity_id ?? ""),
    actualSample: String(row.actual_sample ?? ""),
    actualResult: String(row.actual_result),
    userFeedback: String(row.user_feedback ?? ""),
    actualConversionRate: toNumberOrUndefined(row.actual_conversion_rate),
    actualRevenue: toNumberOrUndefined(row.actual_revenue),
    actualCost: toNumberOrUndefined(row.actual_cost),
    otherEvidence: (row.other_evidence as string | null) ?? undefined,
    outcome: row.outcome as ValidationResult["outcome"],
    submittedBy: String(row.submitted_by ?? ""),
    submittedAt: String(row.submitted_at),
  };
}

// ---------- LearningEvent ----------
function eventToRow(e: LearningEvent): Row {
  return {
    id: e.id,
    user_id: e.userId,
    opportunity_id: e.opportunityId ?? null,
    decision_id: e.decisionId ?? null,
    skill: e.skill,
    signal: e.signal,
    severity: e.severity,
    evidence: e.evidence ?? null,
    created_at: e.createdAt,
  };
}
function eventFromRow(row: Row): LearningEvent {
  requireFields("mapEvent", row, ["id", "skill", "signal", "created_at"]);
  return {
    id: String(row.id),
    userId: String(row.user_id ?? "local-user"),
    opportunityId: (row.opportunity_id as string | null) ?? "",
    decisionId: (row.decision_id as string | null) ?? undefined,
    skill: row.skill as LearningEvent["skill"],
    signal: row.signal as LearningEvent["signal"],
    severity: Number(row.severity ?? 0),
    evidence: String(row.evidence ?? ""),
    createdAt: String(row.created_at),
  };
}

// ---------- ScoreUpdate ----------
function scoreUpdateToRow(u: ScoreUpdate, userId: string): Row {
  return {
    id: uid(),
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
  };
}
function scoreUpdateFromRow(row: Row): ScoreUpdate {
  requireFields("mapScoreUpdate", row, ["from_version", "to_version", "before", "after", "created_at"]);
  return {
    decisionId: (row.decision_id as string | null) ?? undefined,
    fromVersion: Number(row.from_version),
    toVersion: Number(row.to_version),
    before: row.before as ScoreUpdate["before"],
    after: row.after as ScoreUpdate["after"],
    reason: (row.reason as string | null) ?? "",
    newEvidence: (row.new_evidence as ScoreUpdate["newEvidence"]) ?? [],
    validationResults: (row.validation_results as ScoreUpdate["validationResults"]) ?? [],
    createdAt: String(row.created_at),
  };
}

function toNumberOrUndefined(v: unknown): number | undefined {
  return v === null || v === undefined ? undefined : Number(v);
}

export class SupabaseDecisionRepository implements DecisionRepository {
  private readonly supabase: SupabaseClient;
  private readonly userId: string;

  constructor(supabase?: SupabaseClient, options: SupabaseDecisionRepositoryOptions = {}) {
    this.supabase = supabase ?? getSupabaseServerClient();
    this.userId = options.userId ?? "local-user";
  }

  async saveDecision(d: UserDecision): Promise<void> {
    const { error } = await this.supabase.from("decisions").upsert(decisionToRow(d, this.userId), { onConflict: "id" });
    if (error) throw new SupabaseRepositoryError("saveDecision", error.message);
  }

  async getDecision(id: string): Promise<UserDecision | undefined> {
    const { data, error } = await this.supabase.from("decisions").select("*").eq("id", id).eq("user_id", this.userId).maybeSingle();
    if (error) throw new SupabaseRepositoryError("getDecision", error.message);
    return data ? decisionFromRow(data as Row) : undefined;
  }

  async listDecisions(opportunityId: string): Promise<UserDecision[]> {
    const { data, error } = await this.supabase.from("decisions").select("*").eq("user_id", this.userId).eq("opportunity_id", opportunityId).order("created_at", { ascending: false });
    if (error) throw new SupabaseRepositoryError("listDecisions", error.message);
    return (data as Row[] | null)?.map(decisionFromRow) ?? [];
  }

  async saveReview(r: UserDecisionReview): Promise<void> {
    const { error } = await this.supabase.from("decision_reviews").upsert(reviewToRow(r, this.userId), { onConflict: "id" });
    if (error) throw new SupabaseRepositoryError("saveReview", error.message);
  }

  async getReview(decisionId: string): Promise<UserDecisionReview | undefined> {
    const { data, error } = await this.supabase.from("decision_reviews").select("*").eq("decision_id", decisionId).maybeSingle();
    if (error) throw new SupabaseRepositoryError("getReview", error.message);
    return data ? reviewFromRow(data as Row) : undefined;
  }

  async savePlan(p: ValidationPlan): Promise<void> {
    const { error } = await this.supabase.from("validation_plans").upsert(planToRow(p, this.userId), { onConflict: "id" });
    if (error) throw new SupabaseRepositoryError("savePlan", error.message);
  }

  async getPlan(decisionId: string): Promise<ValidationPlan | undefined> {
    const { data, error } = await this.supabase.from("validation_plans").select("*").eq("decision_id", decisionId).maybeSingle();
    if (error) throw new SupabaseRepositoryError("getPlan", error.message);
    return data ? planFromRow(data as Row) : undefined;
  }

  async listPlans(): Promise<ValidationPlan[]> {
    const { data, error } = await this.supabase.from("validation_plans").select("*").eq("user_id", this.userId).order("created_at", { ascending: false });
    if (error) throw new SupabaseRepositoryError("listPlans", error.message);
    return (data as Row[] | null)?.map(planFromRow) ?? [];
  }

  async saveResult(r: ValidationResult): Promise<void> {
    const { error } = await this.supabase.from("validation_results").upsert(resultToRow(r, this.userId), { onConflict: "id" });
    if (error) throw new SupabaseRepositoryError("saveResult", error.message);
  }

  async listResults(planId: string): Promise<ValidationResult[]> {
    const { data, error } = await this.supabase.from("validation_results").select("*").eq("plan_id", planId).order("created_at", { ascending: true });
    if (error) throw new SupabaseRepositoryError("listResults", error.message);
    return (data as Row[] | null)?.map(resultFromRow) ?? [];
  }

  async saveEvents(events: LearningEvent[]): Promise<void> {
    if (events.length === 0) return;
    const { error } = await this.supabase.from("learning_events").insert(events.map(eventToRow));
    if (error) throw new SupabaseRepositoryError("saveEvents", error.message);
  }

  async listEvents(opportunityId?: string): Promise<LearningEvent[]> {
    let q = this.supabase.from("learning_events").select("*").eq("user_id", this.userId);
    if (opportunityId) q = q.eq("opportunity_id", opportunityId);
    const { data, error } = await q.order("created_at", { ascending: false });
    if (error) throw new SupabaseRepositoryError("listEvents", error.message);
    return (data as Row[] | null)?.map(eventFromRow) ?? [];
  }

  async saveScoreUpdate(update: ScoreUpdate): Promise<void> {
    const { error } = await this.supabase.from("score_updates").insert(scoreUpdateToRow(update, this.userId));
    if (error) throw new SupabaseRepositoryError("saveScoreUpdate", error.message);
  }

  async listScoreUpdates(decisionId: string): Promise<ScoreUpdate[]> {
    const { data, error } = await this.supabase.from("score_updates").select("*").eq("decision_id", decisionId).eq("user_id", this.userId).order("created_at", { ascending: true });
    if (error) throw new SupabaseRepositoryError("listScoreUpdates", error.message);
    return (data as Row[] | null)?.map(scoreUpdateFromRow) ?? [];
  }

  // ---------- 命名方法（满足 createDecision / updateDecision 语义） ----------
  async createDecision(d: UserDecision): Promise<UserDecision> {
    await this.saveDecision(d);
    return d;
  }

  async updateDecision(id: string, patch: Partial<Omit<UserDecision, "id" | "createdAt">>): Promise<UserDecision | undefined> {
    const current = await this.getDecision(id);
    if (!current) return undefined;
    const merged: UserDecision = { ...current, ...patch, updatedAt: new Date().toISOString() };
    await this.saveDecision(merged);
    return merged;
  }
}
