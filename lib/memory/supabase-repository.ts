/**
 * SupabaseMemoryRepository（V0.4.1 Phase 8B-2）。
 * 云端记忆实现：
 * - Decision Memory → memory_records 表（record jsonb，decision_id unique）
 * - 归档学习事件 → learning_events 表（已存在 + RLS 已配）
 * - 错误统一包装 SupabaseRepositoryError；userId 默认取 Identity 层
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUserId } from "../identity/resolver";
import { getSupabaseBrowserClient } from "../supabase/client";
import { getSupabaseServerClient } from "../supabase/server";
import { SupabaseRepositoryError } from "../supabase/errors";
import type { MemoryRepository, MemoryStore } from "./repository";
import type { ArchivedLearningEvent, DecisionMemoryRecord } from "./types";

export interface SupabaseMemoryRepositoryOptions {
  userId?: string;
}

type Row = Record<string, unknown>;

function memoryRowToRecord(row: Row): DecisionMemoryRecord {
  return row.record as DecisionMemoryRecord;
}

function eventRowToArchived(row: Row): ArchivedLearningEvent {
  return {
    id: String(row.id),
    skill: row.skill as ArchivedLearningEvent["skill"],
    signal: row.signal as ArchivedLearningEvent["signal"],
    severity: Number(row.severity ?? 0),
    evidence: String(row.evidence ?? ""),
    opportunityId: String(row.opportunity_id ?? ""),
    decisionId: row.decision_id ? String(row.decision_id) : undefined,
    createdAt: String(row.created_at ?? ""),
  };
}

export class SupabaseMemoryRepository implements MemoryRepository {
  private readonly supabase: SupabaseClient;
  private readonly userId: string;

  constructor(supabase?: SupabaseClient, options: SupabaseMemoryRepositoryOptions = {}) {
    this.supabase = supabase ?? (typeof window !== "undefined" ? getSupabaseBrowserClient() : getSupabaseServerClient());
    this.userId = options.userId ?? getCurrentUserId();
  }

  async load(): Promise<MemoryStore> {
    return { records: await this.listRecords(), archivedEvents: await this.listArchived() };
  }

  async saveRecords(records: DecisionMemoryRecord[]): Promise<void> {
    if (records.length === 0) return;
    const rows = records.map((r) => ({
      id: r.id,
      decision_id: r.decisionId,
      user_id: this.userId,
      opportunity_id: r.opportunityId,
      domain: r.domain ?? null,
      outcome: r.outcome,
      record: r,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
    }));
    const { error } = await this.supabase.from("memory_records").upsert(rows, { onConflict: "decision_id" });
    if (error) throw new SupabaseRepositoryError("saveRecords", error.message);
  }

  async listRecords(): Promise<DecisionMemoryRecord[]> {
    const { data, error } = await this.supabase
      .from("memory_records")
      .select("record")
      .eq("user_id", this.userId)
      .order("updated_at", { ascending: false });
    if (error) throw new SupabaseRepositoryError("listRecords", error.message);
    return (data as Row[] | null)?.map(memoryRowToRecord) ?? [];
  }

  async archive(events: ArchivedLearningEvent[]): Promise<void> {
    if (events.length === 0) return;
    const rows = events.map((e) => ({
      id: e.id,
      user_id: this.userId,
      opportunity_id: e.opportunityId,
      decision_id: e.decisionId ?? null,
      skill: e.skill,
      signal: e.signal,
      severity: e.severity,
      evidence: e.evidence,
      created_at: e.createdAt,
    }));
    const { error } = await this.supabase.from("learning_events").upsert(rows, { onConflict: "id" });
    if (error) throw new SupabaseRepositoryError("archive", error.message);
  }

  async listArchived(): Promise<ArchivedLearningEvent[]> {
    const { data, error } = await this.supabase
      .from("learning_events")
      .select("*")
      .eq("user_id", this.userId)
      .order("created_at", { ascending: false });
    if (error) throw new SupabaseRepositoryError("listArchived", error.message);
    return (data as Row[] | null)?.map(eventRowToArchived) ?? [];
  }

  async clear(): Promise<void> {
    const { error } = await this.supabase.from("memory_records").delete().eq("user_id", this.userId);
    if (error) throw new SupabaseRepositoryError("clear", error.message);
  }
}