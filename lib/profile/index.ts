/** Personal Profile Layer（V0.5.0 Phase 10A-1）对外出口 */
export { LocalProfileRepository, createBrowserProfileStorage, createMemoryProfileStorage } from "./local-repository";
export { SupabaseProfileRepository } from "./supabase-repository";
export type { SupabaseProfileRepositoryOptions } from "./supabase-repository";
export type { ProfileRepository } from "./repository";
export type { PersonalProfile, PersonalProfileInput } from "./types";