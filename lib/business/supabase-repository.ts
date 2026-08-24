/**
 * SupabaseBusinessProfileRepository（V0.5.0 Phase 10A-2，预留）。
 * 表：business_profiles (id, user_id unique, profile jsonb, created_at, updated_at)
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUserId } from "../identity/resolver";
import { getSupabaseBrowserClient } from "../supabase/client";
import { getSupabaseServerClient } from "../supabase/server";
import { SupabaseRepositoryError } from "../supabase/errors";
import type { BusinessProfile, BusinessProfileInput } from "./types";
import type { BusinessProfileRepository } from "./repository";

export interface SupabaseBusinessProfileRepositoryOptions {
  userId?: string;
}

type Row = Record<string, unknown>;

export class SupabaseBusinessProfileRepository implements BusinessProfileRepository {
  private readonly supabase: SupabaseClient;
  private readonly userId: string;

  constructor(supabase?: SupabaseClient, options: SupabaseBusinessProfileRepositoryOptions = {}) {
    this.supabase = supabase ?? (typeof window !== "undefined" ? getSupabaseBrowserClient() : getSupabaseServerClient());
    this.userId = options.userId ?? getCurrentUserId();
  }

  async save(profile: BusinessProfile): Promise<void> {
    const { error } = await this.supabase.from("business_profiles").upsert(
      { id: profile.id, user_id: profile.userId, profile, created_at: profile.createdAt, updated_at: profile.updatedAt },
      { onConflict: "user_id" },
    );
    if (error) throw new SupabaseRepositoryError("saveBusinessProfile", error.message);
  }

  async get(userId: string): Promise<BusinessProfile | undefined> {
    const { data, error } = await this.supabase.from("business_profiles").select("profile").eq("user_id", userId).maybeSingle();
    if (error) throw new SupabaseRepositoryError("getBusinessProfile", error.message);
    return ((data as Row | null)?.profile as BusinessProfile | undefined) ?? undefined;
  }

  async update(userId: string, patch: BusinessProfileInput): Promise<BusinessProfile | undefined> {
    const current = await this.get(userId);
    if (!current) return undefined;
    const next: BusinessProfile = {
      ...current,
      ...patch,
      id: current.id,
      userId: current.userId,
      businessTypes: patch.businessTypes ?? current.businessTypes,
      preferences: patch.preferences ?? current.preferences,
      updatedAt: new Date().toISOString(),
    };
    await this.save(next);
    return next;
  }
}