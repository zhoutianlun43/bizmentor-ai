/**
 * SupabaseProfileRepository（V0.5.0 Phase 10A-1，预留）。
 * 表：profiles (id, user_id unique, profile jsonb, created_at, updated_at)
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUserId } from "../identity/resolver";
import { getSupabaseBrowserClient } from "../supabase/client";
import { getSupabaseServerClient } from "../supabase/server";
import { SupabaseRepositoryError } from "../supabase/errors";
import type { PersonalProfile, PersonalProfileInput } from "./types";
import type { ProfileRepository } from "./repository";

export interface SupabaseProfileRepositoryOptions {
  userId?: string;
}

type Row = Record<string, unknown>;

export class SupabaseProfileRepository implements ProfileRepository {
  private readonly supabase: SupabaseClient;
  private readonly userId: string;

  constructor(supabase?: SupabaseClient, options: SupabaseProfileRepositoryOptions = {}) {
    this.supabase = supabase ?? (typeof window !== "undefined" ? getSupabaseBrowserClient() : getSupabaseServerClient());
    this.userId = options.userId ?? getCurrentUserId();
  }

  async save(profile: PersonalProfile): Promise<void> {
    const { error } = await this.supabase.from("profiles").upsert(
      { id: profile.id, user_id: profile.userId, profile, created_at: profile.createdAt, updated_at: profile.updatedAt },
      { onConflict: "user_id" },
    );
    if (error) throw new SupabaseRepositoryError("saveProfile", error.message);
  }

  async get(userId: string): Promise<PersonalProfile | undefined> {
    const { data, error } = await this.supabase.from("profiles").select("profile").eq("user_id", userId).maybeSingle();
    if (error) throw new SupabaseRepositoryError("getProfile", error.message);
    return ((data as Row | null)?.profile as PersonalProfile | undefined) ?? undefined;
  }

  async update(userId: string, patch: PersonalProfileInput): Promise<PersonalProfile | undefined> {
    const current = await this.get(userId);
    if (!current) return undefined;
    const next: PersonalProfile = {
      ...current,
      ...patch,
      id: current.id,
      userId: current.userId,
      preferences: patch.preferences ?? current.preferences,
      updatedAt: new Date().toISOString(),
    };
    await this.save(next);
    return next;
  }
}