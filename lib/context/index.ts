/** Business Context Layer（V0.5.0 Phase 10A-3）对外出口 */
export { BusinessContextBuilder } from "./context-builder";
export type { BusinessContextBuilderDeps } from "./context-builder";
export { LocalContextRepository, createBrowserContextStorage, createMemoryContextStorage } from "./local-repository";
export { SupabaseContextRepository } from "./supabase-repository";
export type { SupabaseContextRepositoryOptions } from "./supabase-repository";
export type { ContextRepository } from "./repository";
export type { BusinessOSContext, ContextSnapshot } from "./types";