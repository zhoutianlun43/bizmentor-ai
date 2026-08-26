/**
 * 项目级 AI 主理人 Agent（V1.5）。
 * 每个商业项目一个长期 AI：理解项目背景/研究报告/决策，持续参与推进，长期记忆。
 * V1.9：升级为 AI 项目运营系统——战略状态/成功指标/商业数据库/决策闭环/每日 CEO 简报。
 */
export type AgentMode = "advisor" | "manager" | "investor" | "operations";

export const AGENT_MODE_LABELS: Record<AgentMode, string> = {
  advisor: "顾问模式",
  manager: "主理人模式",
  investor: "投资人模式",
  operations: "运营模式",
};

/** 商业数据库事实类型（V1.9）：真实数据 / AI 推断 / 商业假设 */
export type BusinessFactType = "FACT" | "INFERENCE" | "ASSUMPTION";

/** 商业数据库事实（V1.9：内容/类型/来源/可信度/更新时间/影响范围） */
export interface BusinessFact {
  id: string;
  content: string;
  type: BusinessFactType;
  /** 来源（供应商报价/用户反馈/研究报告/用户提供/AI 推断…） */
  source?: string;
  /** 可信度 0-100 */
  confidence?: number;
  updatedAt: string;
  /** 影响范围（成本/定价/获客/供应链…） */
  impact?: string;
}

/** 把旧字符串事实或 LLM 结构化事实归一化为 BusinessFact */
export function toBusinessFact(input: string | (Partial<BusinessFact> & { content?: string }), fallbackId = ""): BusinessFact {
  if (typeof input === "string") {
    return { id: fallbackId || `f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, content: input, type: "FACT", updatedAt: new Date().toISOString() };
  }
  const now = new Date().toISOString();
  const type: BusinessFactType = input.type === "INFERENCE" || input.type === "ASSUMPTION" ? input.type : "FACT";
  return {
    id: input.id || fallbackId || `f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    content: input.content?.trim() || "",
    type,
    source: input.source?.trim() || undefined,
    confidence: typeof input.confidence === "number" && input.confidence >= 0 && input.confidence <= 100 ? Math.round(input.confidence) : undefined,
    updatedAt: input.updatedAt || now,
    impact: input.impact?.trim() || undefined,
  };
}

/** 项目认知卡（V1.8：AI 主理人启动时形成，用于长期管理） */
export interface ProjectCognitionProfile {
  projectId: string;
  projectName: string;
  aiIdentity: string;
  /** 当前目标 */
  currentGoal: string;
  /** 当前阶段（已发现/收集中/研究中/推进中…） */
  currentPhase: string;
  /** 核心判断 */
  coreJudgment: string;
  /** 核心假设（可验证） */
  coreAssumption: string;
  /** 主要风险 */
  mainRisks: string[];
  /** 下一步动作 */
  nextAction: string;
  keyFacts: string[];
  /** 项目战略状态（V1.9）：当前阶段/战略状态/核心问题/禁止事项 */
  strategyStatus: {
    currentPhase: string;
    currentStatus: string;
    coreQuestion: string;
    forbiddenActions: string[];
  };
  /** 项目成功指标（V1.9）：北极星指标 + 关键指标（当前 vs 目标） */
  projectMetrics: {
    northStarMetric: string;
    keyMetrics: Array<{ name: string; current: string; target: string }>;
  };
  updatedAt: string;
}

/** 项目决策记录（项目大脑：为什么做决定；V1.9 增加结果回填闭环） */
export interface ProjectDecision {
  id: string;
  time: string;
  decision: string;
  reason: string;
  basis?: string;
  impact?: string;
  status: "executing" | "done" | "revised" | "abandoned";
  /** 决策结果回填（V1.9）：实际数据/预测/偏差/AI 学习 */
  result?: {
    actualData: string;
    prediction?: string;
    deviation?: string;
    aiLearning?: string;
    updatedAt: string;
  };
}

/** AI 判断变化记录（项目大脑：观点变化） */
export interface AiJudgmentChange {
  time: string;
  before?: string;
  after: string;
  reason: string;
}

/** 项目长期记忆 = 项目大脑（V1.8.1；V1.9 升级为商业数据库 + 决策闭环 + 经验沉淀） */
export interface ProjectMemory {
  projectId: string;
  /** 商业数据库（V1.9）：结构化事实（FACT/INFERENCE/ASSUMPTION + 来源/可信度/影响） */
  facts: BusinessFact[];
  /** 用户决策（旧格式，保留兼容） */
  userDecisions: string[];
  /** 项目变化（时间线：新增竞品/数据变化等） */
  changes: string[];
  /** AI 判断历史（旧格式，保留兼容） */
  aiJudgments: string[];
  /** 决策记录（结构化：时间/决策/原因/依据/影响/状态 + 结果回填） */
  decisionLog: ProjectDecision[];
  /** AI 判断变化记录（结构化：before/after/reason） */
  aiJudgmentChanges: AiJudgmentChange[];
  /** 项目知识库（研究/竞品/上传分析/AI 分析记录） */
  knowledgeBase: string[];
  /** 复盘记录（预测→实际→偏差→经验） */
  reviews: string[];
  /** 经验沉淀（V1.9）：从决策成败中学习，形成长期商业认知 */
  lessonsLearned: string[];
  /** 战略状态覆盖（V1.9）：AI/用户维护，认知卡优先读取 */
  strategy?: { currentStatus: string; coreQuestion: string; forbiddenActions: string[] };
  /** 成功指标覆盖（V1.9） */
  metrics?: { northStarMetric: string; keyMetrics: Array<{ name: string; current: string; target: string }> };
  updatedAt: string;
}

export function emptyMemory(projectId: string): ProjectMemory {
  return { projectId, facts: [], userDecisions: [], changes: [], aiJudgments: [], decisionLog: [], aiJudgmentChanges: [], knowledgeBase: [], reviews: [], lessonsLearned: [], updatedAt: new Date().toISOString() };
}

/** 项目每日 CEO 简报（V1.9） */
export interface ProjectDailyBrief {
  date: string;
  projectName: string;
  currentPhase: string;
  strategyStatus: string;
  coreQuestion: string;
  forbiddenActions: string[];
  northStar: string;
  metrics: Array<{ name: string; current: string; target: string }>;
  keyFactsToday: string[];
  topRisks: string[];
  todayPriority: string;
  openDecisions: number;
  aiAdvice: string;
}
