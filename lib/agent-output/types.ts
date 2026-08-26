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
  /** 本次项目更新（V1.8.1：沉淀到项目大脑） */
  projectUpdate?: ProjectUpdate;
}

/** 本次项目更新（V1.8.1：AI 回答后沉淀到项目大脑的变化层；V1.9：结构化事实 + 战略/指标更新） */
export interface ProjectUpdate {
  /** 新事实：纯文本 或 结构化（FACT/INFERENCE/ASSUMPTION + 来源/可信度/影响） */
  newFacts?: Array<string | { content: string; type?: "FACT" | "INFERENCE" | "ASSUMPTION"; source?: string; confidence?: number; impact?: string }>;
  newRisks?: string[];
  newJudgments?: Array<{ before?: string; after: string; reason: string }>;
  planChanges?: string[];
  decision?: { decision: string; reason: string; basis?: string };
  /** 战略状态更新（V1.9）：AI 维护当前战略状态/核心问题/禁止事项 */
  strategyUpdate?: { currentStatus?: string; coreQuestion?: string; forbiddenActions?: string[] };
  /** 指标更新（V1.9） */
  metricsUpdate?: { northStarMetric?: string; keyMetrics?: Array<{ name: string; current: string; target: string }> };
}

/** 知识沉淀标识（AI 回答后展示） */
export interface KnowledgeDelta {
  newViews: boolean;
  newDecisions: boolean;
  newData: boolean;
  newRisks: boolean;
}

/** 项目驾驶舱/今日建议/执行中心/风险雷达（V1.8.1 派生） */
export interface ProjectDashboard {
  phase: string;
  completion: number;
  healthy: boolean;
  todayAdvice: Array<{ task: string; reason: string }>;
  tasks: Array<{ name: string; owner?: string; due?: string; status: string; aiHelp?: string }>;
  risks: Array<{ risk: string; probability?: string; impact?: string; trigger?: string; solution?: string }>;
}
