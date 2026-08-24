/**
 * SupabaseContextRepository（V0.5.0 Phase 10A-3，预留）。
 * 目标表：business_context_snapshots（本阶段不创建真实表；仅接口与实现就绪，供未来接入）。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUserId } from "../identity/resolver";
import { getSupabaseBrowserClient } from "../supabase/client";
import { getSupabaseServerClient } from "../supabase/server";
import { SupabaseRepositoryError } from "../supabase/errors";
import type { ContextSnapshot } from "./types";
import type { ContextRepository } from "./repository";

export interface SupabaseContextRepositoryOptions {
  userId?: string;
}

type Row = Record<string, unknown>;

export class SupabaseContextRepository implements ContextRepository {
  private readonly supabase: SupabaseClient;
  private readonly userId: string;

  constructor(supabase?: SupabaseClient, options: SupabaseContextRepositoryOptions = {}) {
    this.supabase = supabase ?? (typeof window !== "undefined" ? getSupabaseBrowserClient() : getSupabaseServerClient());
    this.userId = options.userId ?? getCurrentUserId();
  }

  async save(snapshot: ContextSnapshot): Promise<void> {
    const { error } = await this.supabase.from("business_context_snapshots").upsert(
      { user_id: snapshot.userId, context: snapshot.context, saved_at: snapshot.savedAt },
      { onConflict: "user_id" },
    );
    if (error) throw new SupabaseRepositoryError("saveContextSnapshot", error.message);
  }

  async get(userId: string): Promise<ContextSnapshot | undefined> {
    const { data, error } = await this.supabase
      .from("business_context_snapshots")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new SupabaseRepositoryError("getContextSnapshot", error.message);
    const row = data as Row | null;
    if (!row) return undefined;
    return { userId: String(row.user_id), context: row.context as ContextSnapshot["context"], savedAt: String(row.saved_at) };
  }

  async clear(userId: string): Promise<void> {
    const { error } = await this.supabase.from("business_context_snapshots").delete().eq("user_id", userId);
    if (error) throw new SupabaseRepositoryError("clearContextSnapshot", error.message);
  }
}