/**
 * Response Schema（V1.7）：复用 agent-output 结构化类型 + 模板定义。
 */
export type { OutputBlock, OutputFormat, StructuredOutput, KnowledgeDelta } from "../../agent-output/types";

export interface OutputTemplate {
  id: string;
  label: string;
  intent: string;
  blocks: string[];
  sections: string[];
  requiredFields: string[];
  qualityRules: string[];
}
