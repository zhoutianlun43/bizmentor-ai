/**
 * SupabaseOpportunityRepository（V0.4.1 Phase 2 Task 2B）。
 * 实现 OpportunityRepository；保留原 TypeScript 类型，json 字段用 jsonb，
 * 错误统一包装 SupabaseRepositoryError，不直接暴露上游 error。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "../supabase/server";
import { SupabaseRepositoryError } from "../supabase/errors";
export { SupabaseRepositoryError };
import { uid } from "../store/storage";
import type { Opportunity, OpportunityInput, OpportunitySource, OpportunityStatus } from "../types";
import type { OpportunityRepository } from "./repository";

export interface SupabaseOpportunityRepositoryOptions {
  userId?: string;
  table?: string;
}

type Row = Record<string, unknown>;

/** Opportunity → 数据库行（score/notes 为 jsonb/null） */
function toRow(o: Opportunity, userId: string): Row {
  return {
    id: o.id,
    user_id: userId,
    name: o.name,
    description: o.description,
    source: o.source,
    status: o.status,
    score: o.score ?? null,
    notes: o.notes ?? null,
    created_at: o.createdAt,
    updated_at: new Date().toISOString(),
  };
}

/** 数据库行 → Opportunity（校验必填字段，脏数据抛 SupabaseRepositoryError） */
function fromRow(row: Row): Opportunity {
  if (!row.id || !row.name || !row.description || !row.source || !row.status || !row.created_at) {
    throw new SupabaseRepositoryError(
      "mapRow",
      "商机数据不完整（缺少 id/name/description/source/status/created_at）",
    );
  }
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description),
    source: row.source as OpportunitySource,
    status: row.status as OpportunityStatus,
    score: (row.score as Opportunity["score"]) ?? undefined,
    notes: (row.notes as Opportunity["notes"]) ?? undefined,
    createdAt: String(row.created_at),
  };
}

export class SupabaseOpportunityRepository implements OpportunityRepository {
  private readonly supabase: SupabaseClient;
  private readonly userId: string;
  private readonly table: string;

  constructor(supabase?: SupabaseClient, options: SupabaseOpportunityRepositoryOptions = {}) {
    this.supabase = supabase ?? getSupabaseServerClient();
    this.userId = options.userId ?? "local-user";
    this.table = options.table ?? "opportunities";
  }

  async createOpportunity(input: OpportunityInput): Promise<Opportunity> {
    const now = new Date().toISOString();
    const opportunity: Opportunity = {
      id: uid(),
      name: input.name.trim(),
      description: input.description.trim(),
      source: input.source,
      status: "researching",
      createdAt: now,
      notes: input.notes?.trim() || undefined,
    };
    const { error } = await this.supabase.from(this.table).insert(toRow(opportunity, this.userId));
    if (error) throw new SupabaseRepositoryError("createOpportunity", error.message);
    return opportunity;
  }

  async getOpportunity(id: string): Promise<Opportunity | undefined> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select("*")
      .eq("id", id)
      .eq("user_id", this.userId)
      .maybeSingle();
    if (error) throw new SupabaseRepositoryError("getOpportunity", error.message);
    return data ? fromRow(data as Row) : undefined;
  }

  async listOpportunities(): Promise<Opportunity[]> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select("*")
      .eq("user_id", this.userId)
      .order("created_at", { ascending: false });
    if (error) throw new SupabaseRepositoryError("listOpportunities", error.message);
    return (data as Row[] | null)?.map(fromRow) ?? [];
  }

  async updateOpportunity(
    id: string,
    patch: Partial<Omit<Opportunity, "id" | "createdAt">>,
  ): Promise<Opportunity | undefined> {
    const updates: Row = { updated_at: new Date().toISOString() };
    if (patch.name !== undefined) updates.name = patch.name;
    if (patch.description !== undefined) updates.description = patch.description;
    if (patch.source !== undefined) updates.source = patch.source;
    if (patch.status !== undefined) updates.status = patch.status;
    if (patch.score !== undefined) updates.score = patch.score ?? null;
    if (patch.notes !== undefined) updates.notes = patch.notes ?? null;

    const { data, error } = await this.supabase
      .from(this.table)
      .update(updates)
      .eq("id", id)
      .eq("user_id", this.userId)
      .select("*")
      .single();
    if (error) throw new SupabaseRepositoryError("updateOpportunity", error.message);
    return data ? fromRow(data as Row) : undefined;
  }

  async deleteOpportunity(id: string): Promise<boolean> {
    const { error, count } = await this.supabase
      .from(this.table)
      .delete()
      .eq("id", id)
      .eq("user_id", this.userId);
    if (error) throw new SupabaseRepositoryError("deleteOpportunity", error.message);
    return (count ?? 0) > 0;
  }
}
