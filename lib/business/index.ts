/** Business Profile Layer（V0.5.0 Phase 10A-2）对外出口 */
export { LocalBusinessProfileRepository, createBrowserBusinessProfileStorage, createMemoryBusinessProfileStorage } from "./local-repository";
export { SupabaseBusinessProfileRepository } from "./supabase-repository";
export type { SupabaseBusinessProfileRepositoryOptions } from "./supabase-repository";
export type { BusinessProfileRepository } from "./repository";
export type { BusinessProfile, BusinessProfileInput, BusinessType } from "./types";