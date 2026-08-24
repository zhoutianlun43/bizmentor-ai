/** Personal Knowledge System（V0.4.2 Phase 9B-4）对外出口 */
export { KnowledgeEngine, knowledgeInsights } from "./knowledge-engine";
export { LocalKnowledgeRepository, createBrowserKnowledgeStorage, createMemoryKnowledgeStorage } from "./repository";
export type { KnowledgeRepository, KnowledgeStorage } from "./repository";
export type { KnowledgeRecord, KnowledgeSource, KnowledgeType, UserKnowledgeInput } from "./types";