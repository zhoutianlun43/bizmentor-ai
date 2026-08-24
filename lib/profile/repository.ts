/**
 * ProfileRepository（V0.5.0 Phase 10A-1）。
 * 接口：save/get/update；Local 先实现，Supabase 预留。
 */
import type { PersonalProfile, PersonalProfileInput } from "./types";

export interface ProfileRepository {
  save(profile: PersonalProfile): Promise<void>;
  get(userId: string): Promise<PersonalProfile | undefined>;
  update(userId: string, patch: PersonalProfileInput): Promise<PersonalProfile | undefined>;
}