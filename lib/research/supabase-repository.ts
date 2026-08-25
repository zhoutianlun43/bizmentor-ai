/**
 * SupabaseResearchRepository（V0.4.1 Phase 2 Task 2A）。
 * 实现现有 ResearchRepository 接口（saveRun / getRun / listRuns），
 * 与 LocalResearchRepository 可替换，不修改 Research Pipeline / AI Gateway / UI。
 *
 * 说明：
 * - 使用注入的 SupabaseClient（测试传 mock；生产传服务端 client / 经 API 路由的 client）
 * - 数据列名与 schema（supabase/schema.sql 中 research_runs）对齐
 * - 单用户阶段 userId 默认 "local-user"；Auth 接入后传真实 userId
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "../supabase/server";
import { SupabaseRepositoryError } from "../supabase/errors";
export { SupabaseRepositoryError };
import type { ResearchRun } from "./types";

export interface SupabaseResearchRepositoryOptions {
  /** 数据归属用户（单用户阶段默认 local-user；Auth 接入后传真实 userId） */
  userId?: string;
  /** 表名（默认 research_runs，便于测试/分表） */
  table?: string;
}

type Row = Record<string, unknown>;

/**
 * 消毒字符串：替换孤立代理项（lone surrogate）与非法控制字符。
 * 抓取的网页正文可能包含这类字符，PostgREST/Postgres JSONB 会拒绝
 * （unsupported Unicode escape sequence）→ 入库前统一替换为 U+FFFD。
 */
function sanitizeJson(value: unknown): unknown {
  if (typeof value === "string") {
    return value
      .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "\uFFFD")
      .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "\uFFFD")
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  }
  if (Array.isArray(value)) return value.map(sanitizeJson);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value)) {
      out[k] = sanitizeJson((value as Record<string, unknown>)[k]);
    }
    return out;
  }
  return value;
}

/** ResearchRun → 数据库行 */
function toRow(run: ResearchRun, userId: string): Row {
  const clean = sanitizeJson(run) as ResearchRun;
  run = clean;
  return {
    run_id: run.runId,
    user_id: userId,
    opportunity_id: run.opportunityId,
    status: run.status,
    stages: run.stages,
    findings: run.findings,
    score_history: run.scoreHistory,
    source_documents: run.sourceDocuments,
    evidence_validation: run.evidenceValidation ?? null,
    report: run.report ?? null,
    error: run.error ?? null,
    created_at: run.createdAt,
    updated_at: run.updatedAt,
  };
}

/** 数据库行 → ResearchRun（与现有 TypeScript 类型兼容） */
function fromRow(row: Row): ResearchRun {
  return {
    runId: String(row.run_id),
    opportunityId: String(row.opportunity_id),
    status: row.status as ResearchRun["status"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    stages: (row.stages as ResearchRun["stages"]) ?? [],
    findings: (row.findings as ResearchRun["findings"]) ?? [],
    scoreHistory: (row.score_history as ResearchRun["scoreHistory"]) ?? [],
    sourceDocuments: (row.source_documents as ResearchRun["sourceDocuments"]) ?? [],
    evidenceValidation: (row.evidence_validation as ResearchRun["evidenceValidation"]) ?? undefined,
    report: (row.report as ResearchRun["report"]) ?? undefined,
    error: (row.error as ResearchRun["error"]) ?? undefined,
  };
}

export class SupabaseResearchRepository {
  private readonly supabase: SupabaseClient;
  private readonly userId: string;
  private readonly table: string;

  constructor(supabase?: SupabaseClient, options: SupabaseResearchRepositoryOptions = {}) {
    this.supabase = supabase ?? getSupabaseServerClient();
    this.userId = options.userId ?? "local-user";
    this.table = options.table ?? "research_runs";
  }

  /** 保存（upsert：同一 user + opportunity 覆盖，匹配 LocalResearchRepository 语义） */
  async saveRun(run: ResearchRun): Promise<void> {
    const { error } = await this.supabase
      .from(this.table)
      .upsert(toRow(run, this.userId), { onConflict: "user_id,opportunity_id" });
    if (error) throw new SupabaseRepositoryError("saveRun", error.message);
  }

  /** 按商机读取该用户最近一次研究运行 */
  async getRun(opportunityId: string): Promise<ResearchRun | undefined> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select("*")
      .eq("user_id", this.userId)
      .eq("opportunity_id", opportunityId)
      .maybeSingle();
    if (error) throw new SupabaseRepositoryError("getRun", error.message);
    return data ? fromRow(data as Row) : undefined;
  }

  /** 列出该用户全部研究运行（新→旧） */
  async listRuns(): Promise<ResearchRun[]> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select("*")
      .eq("user_id", this.userId)
      .order("created_at", { ascending: false });
    if (error) throw new SupabaseRepositoryError("listRuns", error.message);
    return (data as Row[] | null)?.map(fromRow) ?? [];
  }
}
