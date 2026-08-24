/**
 * Supabase 设置仓库（user_settings 表，V0.4.2 Phase 9B-5-B）。
 * 表：user_settings (id, user_id unique, settings jsonb, created_at, updated_at)
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUserId } from "../identity/resolver";
import { getSupabaseBrowserClient } from "../supabase/client";
import { getSupabaseServerClient } from "../supabase/server";
import { SupabaseRepositoryError } from "../supabase/errors";
import type { SettingsRepository, UserSettings } from "./types";

export interface SupabaseSettingsRepositoryOptions {
  userId?: string;
}

type Row = Record<string, unknown>;

export class SupabaseSettingsRepository implements SettingsRepository {
  private readonly supabase: SupabaseClient;
  private readonly userId: string;

  constructor(supabase?: SupabaseClient, options: SupabaseSettingsRepositoryOptions = {}) {
    this.supabase = supabase ?? (typeof window !== "undefined" ? getSupabaseBrowserClient() : getSupabaseServerClient());
    this.userId = options.userId ?? getCurrentUserId();
  }

  async save(settings: UserSettings): Promise<void> {
    const { error } = await this.supabase.from("user_settings").upsert(
      {
        user_id: this.userId,
        settings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new SupabaseRepositoryError("saveSettings", error.message);
  }

  async load(): Promise<UserSettings> {
    const { data, error } = await this.supabase
      .from("user_settings")
      .select("settings")
      .eq("user_id", this.userId)
      .maybeSingle();
    if (error) throw new SupabaseRepositoryError("loadSettings", error.message);
    return ((data as Row | null)?.settings as UserSettings | undefined) ?? {};
  }

  async update(patch: Partial<UserSettings>): Promise<UserSettings> {
    const next = { ...(await this.load()), ...patch };
    await this.save(next);
    return next;
  }

  async reset(): Promise<void> {
    const { error } = await this.supabase.from("user_settings").delete().eq("user_id", this.userId);
    if (error) throw new SupabaseRepositoryError("resetSettings", error.message);
  }
}