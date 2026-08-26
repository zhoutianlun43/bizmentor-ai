/**
 * AI 结构化输出系统（V1.6）。
 * 项目 AI 输出从普通聊天文本升级为商业顾问级结构化内容（卡片/表格/时间线/SWOT/产品/内容/财务/风险）。
 */
export type OutputFormat = "answer" | "report" | "table" | "plan" | "timeline" | "dashboard" | "swot" | "products" | "content" | "financial" | "risk";

export type OutputBlock =
  | { type: "summary"; title?: string; conclusion: string; confidence?: number; basis: string[] }
  | { type: "table"; title?: string; headers: string[]; rows: string[][] }
  | { type: "timeline"; title?: string; phases: Array<{ phase: string; goal: string; actions: string[]; owner?: string; metric?: string }> }
  | { type: "swot"; title?: string; strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] }
  | { type: "products"; title?: string; items: Array<{ name: string; supply?: string; cost?: string; price?: string; profit?: string; competition?: string; score?: number }> }
  | { type: "content"; title?: string; items: Array<{ date: string; platform: string; topic: string; title: string; format: string; goal: string }> }
  | { type: "financial"; title?: string; rows: Array<{ item: string; value: string; note?: string }> }
  | { type: "risk"; title?: string; items: Array<{ risk: string; impact: string; probability: string; mitigation: string }> }
  | { type: "text"; paragraphs: string[] };

export interface StructuredOutput {
  format: OutputFormat;
  title: string;
  blocks: OutputBlock[];
}

/** 知识沉淀标识（AI 回答后展示） */
export interface KnowledgeDelta {
  newViews: boolean;
  newDecisions: boolean;
  newData: boolean;
  newRisks: boolean;
}
