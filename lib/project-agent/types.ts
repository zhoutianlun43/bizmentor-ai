/**
 * 项目级 AI 主理人 Agent（V1.5）。
 * 每个商业项目一个长期 AI：理解项目背景/研究报告/决策，持续参与推进，长期记忆。
 */
export type AgentMode = "advisor" | "manager" | "investor" | "operations";

export const AGENT_MODE_LABELS: Record<AgentMode, string> = {
  advisor: "顾问模式",
  manager: "主理人模式",
  investor: "投资人模式",
  operations: "运营模式",
};

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
  updatedAt: string;
}

/** 项目决策记录（项目大脑：为什么做决定） */
export interface ProjectDecision {
  time: string;
  decision: string;
  reason: string;
  basis?: string;
  impact?: string;
  status: "executing" | "done" | "revised" | "abandoned";
}

/** AI 判断变化记录（项目大脑：观点变化） */
export interface AiJudgmentChange {
  time: string;
  before?: string;
  after: string;
  reason: string;
}

/** 项目长期记忆 = 项目大脑（V1.8.1） */
export interface ProjectMemory {
  projectId: string;
  /** 项目事实库（真实数据：供应商/成本/售价/利润/反馈/广告数据） */
  facts: string[];
  /** 用户决策（旧格式，保留兼容） */
  userDecisions: string[];
  /** 项目变化（时间线：新增竞品/数据变化等） */
  changes: string[];
  /** AI 判断历史（旧格式，保留兼容） */
  aiJudgments: string[];
  /** 决策记录（结构化：时间/决策/原因/依据/影响/状态） */
  decisionLog: ProjectDecision[];
  /** AI 判断变化记录（结构化：before/after/reason） */
  aiJudgmentChanges: AiJudgmentChange[];
  /** 项目知识库（研究/竞品/上传分析/AI 分析记录） */
  knowledgeBase: string[];
  /** 复盘记录（预测→实际→偏差→经验） */
  reviews: string[];
  updatedAt: string;
}

export function emptyMemory(projectId: string): ProjectMemory {
  return { projectId, facts: [], userDecisions: [], changes: [], aiJudgments: [], decisionLog: [], aiJudgmentChanges: [], knowledgeBase: [], reviews: [], updatedAt: new Date().toISOString() };
}
