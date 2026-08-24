/** 商业决策与验证闭环（V0.3-C）对外出口 */
export { DecisionService } from "./service";
export type { DecisionServiceDeps } from "./service";
export { reviewUserDecision } from "./examiner";
export { computeScoreV2 } from "./scoring";
export { generateLearningEvents } from "./learning";
export { LocalDecisionRepository, createBrowserDecisionStorage, createMemoryDecisionStorage, readDecisionDataSync } from "./repository";
export { SupabaseDecisionRepository } from "./supabase-repository";
export type { SupabaseDecisionRepositoryOptions } from "./supabase-repository";
export type { DecisionRepository, DecisionStorage, DecisionData } from "./repository";
export { decisionReviewSchema } from "./schema";
export * from "./labels";
export * from "./types";