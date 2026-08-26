/**
 * SupabaseOpportunityRepository（V0.4.1 Phase 2 Task 2B）。
 * 实现 OpportunityRepository；保留原 TypeScript 类型，json 字段用 jsonb，
 * 错误统一包装 SupabaseRepositoryError，不直接暴露上游 error。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "../supabase/server";
import { SupabaseRepositoryError } from "../supabase/errors";
export { SupabaseRepositoryError };
import { parseRadarNotes, pickPoolFields } from "../radar/service";
import { uid } from "../store/storage";
import { normalizeProjectType } from "../types";
import type { Opportunity, OpportunityInput, OpportunitySource, OpportunityStatus } from "../types";
import type { OpportunityRepository } from "./repository";

export interface SupabaseOpportunityRepositoryOptions {
  userId?: string;
  table?: string;
}

type Row = Record<string, unknown>;

/** 判断是否为「缺失 radar 列」的数据库错误（线上库尚未执行 V0.8 schema 迁移） */
function isMissingRadarColumnError(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null | undefined;
  if (!e || typeof e.message !== "string" || !e.message.includes("radar")) return false;
  // INSERT 缺列：PostgREST schema cache → PGRST204；SELECT 缺列：Postgres → 42703
  return e.code === "42703" || e.code === "PGRST204";
}

/** 去掉 radar 字段（旧库缺列时的降级重试） */
function omitRadar(row: Row): Row {
  return Object.fromEntries(Object.entries(row).filter(([key]) => key !== "radar"));
}

/** 判断是否为「缺失 project_type 列」的数据库错误（线上库尚未执行 V2.0 schema 迁移） */
function isMissingProjectTypeColumnError(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null | undefined;
  if (!e || typeof e.message !== "string" || !e.message.includes("project_type")) return false;
  return e.code === "42703" || e.code === "PGRST204";
}

/** 去掉 project_type 字段（旧库缺列时的降级重试） */
function omitProjectType(row: Row): Row {
  return Object.fromEntries(Object.entries(row).filter(([key]) => key !== "project_type"));
}

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
    radar: o.radar ?? null,
    notes: o.notes ?? null,
    project_type: o.projectType ?? "OPPORTUNITY",
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
    radar: (row.radar as Opportunity["radar"]) ?? undefined,
    notes: (row.notes as Opportunity["notes"]) ?? undefined,
    createdAt: String(row.created_at),
    projectType: normalizeProjectType(row.project_type),
    sourceType: row.radar ? "ai_radar" : "manual_create",
    scanId: (row.radar as Opportunity["radar"])?.scanId ?? parseRadarNotes(String(row.notes ?? "")).scanId,
    ...pickPoolFields(parseRadarNotes(String(row.notes ?? ""))),
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
      status: input.status ?? (input.source === "ai" ? "discovered" : "researching"),
      createdAt: now,
      notes: input.notes?.trim() || undefined,
      radar: input.radar,
      opportunityStatus: input.opportunityStatus ?? (input.source === "ai" ? "discovered" : undefined),
      projectType: normalizeProjectType(input.projectType),
      ...pickPoolFields(parseRadarNotes(input.notes)),
    };
    const row = toRow(opportunity, this.userId);
    const { error } = await this.supabase.from(this.table).insert(row);
    if (error) {
      if (isMissingRadarColumnError(error)) {
        // 旧库尚未执行 schema 迁移（缺 radar 列）：去掉 radar 字段重试，保证功能可用
        const retry = await this.supabase.from(this.table).insert(omitRadar(row));
        if (retry.error) throw new SupabaseRepositoryError("createOpportunity", retry.error.message);
      } else if (isMissingProjectTypeColumnError(error)) {
        // 旧库尚未执行 V2.0 迁移（缺 project_type 列）：去掉该字段重试
        const retry = await this.supabase.from(this.table).insert(omitProjectType(row));
        if (retry.error) throw new SupabaseRepositoryError("createOpportunity", retry.error.message);
      } else {
        throw new SupabaseRepositoryError("createOpportunity", error.message);
      }
    }
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
    if (patch.radar !== undefined) updates.radar = patch.radar ?? null;
    if (patch.projectType !== undefined) updates.project_type = normalizeProjectType(patch.projectType);
    if (patch.notes !== undefined) updates.notes = patch.notes ?? null;

    const run = (u: Row) =>
      this.supabase
        .from(this.table)
        .update(u)
        .eq("id", id)
        .eq("user_id", this.userId)
        .select("*")
        .single();

    let { data, error } = await run(updates);
    if (error && isMissingRadarColumnError(error) && updates.radar !== undefined) {
      ({ data, error } = await run(omitRadar(updates)));
    } else if (error && isMissingProjectTypeColumnError(error) && updates.project_type !== undefined) {
      ({ data, error } = await run(omitProjectType(updates)));
    }
    if (error) throw new SupabaseRepositoryError("updateOpportunity", error.message);
    return data ? fromRow(data as Row) : undefined;
  }

  async deleteOpportunity(id: string): Promise<boolean> {
    // count=exact：PostgREST DELETE 默认不返回 count，需显式请求
    const { error, count } = await this.supabase
      .from(this.table)
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("user_id", this.userId);
    if (error) throw new SupabaseRepositoryError("deleteOpportunity", error.message);
    return (count ?? 0) > 0;
  }
}
