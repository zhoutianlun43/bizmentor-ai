/**
 * 商业研究引擎（V0.3-A）对外出口。
 */
export { runResearchPipeline } from "./pipeline";
export type { PipelineOptions } from "./pipeline";
export { ResearchService } from "./service";
export { LocalResearchRepository, createBrowserResearchStorage, createMemoryResearchStorage, readResearchRunSync } from "./repository";
export type { ResearchRepository, ResearchStorage } from "./repository";
export { createApiRunAi } from "./api-runai";
export type { RunAiFn } from "./ai-call";
export {
  NO_EXTERNAL_EVIDENCE_NOTICE,
  RESEARCH_SOURCE_TYPES,
  FUTURE_SOURCE_TYPES,
  enforceEvidenceRules,
  isRealSource,
  toSourceDocuments,
} from "./sources";
export type { ResearchSourceType } from "./sources";
export {
  SCORE_DIMENSIONS,
  SCORE_WEIGHTS,
  NEGATIVE_DIMENSIONS,
  DIMENSION_LABELS,
  computeOverallScore,
  computeConfidence,
  buildScoreResult,
  nextScoreVersion,
  clampScore,
  clamp01,
  round1,
} from "./scoring";
export { extractJson, validateWithSchema } from "./schema";
export * from "./types";