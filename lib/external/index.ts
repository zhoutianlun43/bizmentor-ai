/**
 * External Intelligence Layer（V0.4.1 Phase 6.2-A）对外出口。
 * 用法：
 *   const layer = createDefaultExternalIntelligence();
 *   const externalResearch = layer.createResearchFn();   // 注入 ResearchService/Pipeline
 *   const outcome = await layer.search("...");            // 带 fallback 的搜索
 */
export { createExternalIntelligence, createDefaultExternalIntelligence, createExternalResearchFn } from "./factory";
export { classifySourceType, toExternalSearchResult } from "./standardize";
export type { StandardSearchInput } from "./standardize";
export { ExternalIntelligenceError, safeMessage, safeTypeOf } from "./errors";
export { IntelligenceRegistry } from "./registry";
export { routeRead, routeSearch } from "./router";
export { duckduckgoIntelligenceProvider } from "./providers/duckduckgo";
export { createTavilyProvider } from "./providers/tavily";
export { createBingProvider } from "./providers/bing";
export { createGoogleProvider } from "./providers/google";
export type { TavilyProviderOptions } from "./providers/tavily";
export type { BingProviderOptions } from "./providers/bing";
export type { GoogleProviderOptions } from "./providers/google";
export type {
  ExternalIntelligenceLayer,
  IntelligenceProvider,
  IntelligenceProviderStatus,
  IntelligenceSearchAttempt,
  IntelligenceSearchOutcome,
  ExternalResearchFn,
  ExternalResearchInput,
  ExternalResearchOutput,
  ExternalSearchResult,
  ExtractedDocument,
} from "./types";