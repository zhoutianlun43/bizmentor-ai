export { duckduckgoProvider, parseDuckDuckGoHtml } from "./duckduckgo";
export { getExternalProvider } from "./providers";
export { readWebPage, parsePublisher } from "./http-reader";
export { computeSourceCredibility, withSourceCredibility } from "./credibility";
export type { SourceCredibility } from "./credibility";
export { detectConflicts, markInsufficientEvidence } from "./conflicts";
export type { EvidenceConflict, CrossValidationResult } from "./conflicts";
export type {
  ExternalSearchResult,
  ExtractedDocument,
  ExternalResearchProvider,
  ExternalResearchInput,
  ExternalResearchOutput,
  ExternalResearchFn,
} from "./types";