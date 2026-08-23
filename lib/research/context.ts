import type { RunAiFn } from "./ai-call";
import type { ExternalResearchFn } from "./external/types";
import type { ResearchInput, SourceDocument } from "./types";

/** 研究流水线上下文（注入 AI 调用、外部研究函数与输入） */
export interface ResearchContext {
  runAi: RunAiFn;
  externalResearch: ExternalResearchFn;
  input: ResearchInput;
  sourceDocuments: SourceDocument[];
  searchLimit?: number;
}