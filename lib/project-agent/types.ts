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

/** 项目长期记忆（每个项目独立） */
export interface ProjectMemory {
  projectId: string;
  /** 项目事实（目标市场/预算/供应链/用户优势等） */
  facts: string[];
  /** 用户决策（例如：先测试 TikTok Shop） */
  userDecisions: string[];
  /** 项目变化（时间线：新增竞品/数据变化等） */
  changes: string[];
  /** AI 判断历史（含时间） */
  aiJudgments: string[];
  /** 项目知识库（研究/竞品/上传分析/AI 分析记录） */
  knowledgeBase: string[];
  /** 复盘记录（预测→实际→偏差→经验） */
  reviews: string[];
  updatedAt: string;
}

export function emptyMemory(projectId: string): ProjectMemory {
  return { projectId, facts: [], userDecisions: [], changes: [], aiJudgments: [], knowledgeBase: [], reviews: [], updatedAt: new Date().toISOString() };
}
