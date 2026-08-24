/** Business Memory Engine（V0.4.1 Phase 8A）对外出口 */
export { MemoryEngine } from "./service";
export type { MemoryEngineDeps } from "./service";
export { buildDecisionMemory, upsertDecisionMemory } from "./builder";
export type { BuildDecisionMemoryInput } from "./builder";
export { archiveLearningEvents, aggregateLearningEvents, mergeArchivedEvents, normalizeLearningEvent } from "./archive";
export { findSimilarDecisions, nameOverlap, retrievePatterns } from "./retrieval";
export { LocalMemoryRepository, createBrowserMemoryStorage, createMemoryMemoryStorage } from "./repository";
export { SupabaseMemoryRepository } from "./supabase-repository";
export type { SupabaseMemoryRepositoryOptions } from "./supabase-repository";
export type { MemoryRepository, MemoryStorage, MemoryStore } from "./repository";
export type {
  ArchivedLearningEvent,
  DecisionMemoryRecord,
  MemoryPattern,
  MemoryQuery,
  SkillEventAggregate,
} from "./types";