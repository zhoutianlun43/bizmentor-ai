import type { RunAiFn } from "./ai-call";
import type { ResearchInput, SourceDocument } from "./types";

/** 研究流水线上下文（注入 AI 调用与输入） */
export interface ResearchContext {
  runAi: RunAiFn;
  input: ResearchInput;
  sourceDocuments: SourceDocument[];
}