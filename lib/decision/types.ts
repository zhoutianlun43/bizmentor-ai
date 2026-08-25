/**
 * BizMentor 商业决策与验证闭环（V0.3-C）。
 * 原则：AI 不是最终决策者。AI 研究 → 用户判断 → 真实验证 → AI 复盘。
 * 必须记录「AI 当时怎么判断」与「用户当时怎么判断」，未来可比较 AI prediction vs User prediction vs Actual result。
 */
import type { AiProviderName } from "../ai/types";
import type { EvidenceItem, ScoreDimension, ScoreVersion } from "../research/types";

/** 用户商业决策 */
export type DecisionType = "proceed" | "validate" | "continue_research" | "pause" | "abandon";

/** 用户判断（User Judgment） */
export interface UserJudgment {
  /** 为什么做/不做 */
  why: string;
  /** 核心判断 */
  coreJudgment: string;
  /** 关键证据 */
  keyEvidence: string;
  /** 最大风险 */
  biggestRisk: string;
  /** 最重要假设 */
  mostImportantAssumption: string;
  /** 预计结果 */
  expectedOutcome: string;
  /** 「我有不同判断」时填写（可选） */
  differentJudgment?: string;
  /** 创始人判断（V0.9.1）：我的商业假设 */
  myBusinessAssumption?: string;
  /** 创始人判断（V0.9.1）：我的优势 */
  myStrengths?: string;
  /** 创始人判断（V0.9.1）：AI 可能错误的位置 */
  aiMayBeWrongAbout?: string;
}

/** AI 当时的判断快照（研究报告评分） */
export interface AiScoreSnapshot {
  version: number;
  overall_score: number;
  confidence: number;
}

/** 用户决策（含 AI 与用户双方判断记录） */
export interface UserDecision {
  id: string;
  opportunityId: string;
  runId?: string;
  decision: DecisionType;
  /** 用户是否与 AI 推荐不同 */
  differentFromAi: boolean;
  judgment: UserJudgment;
  /** AI 当时怎么判断（创建决策时的最新评分快照） */
  aiScoreSnapshot?: AiScoreSnapshot;
  createdAt: string;
  updatedAt: string;
}

/** 能力维度（12 项，未来能力画像用） */
export type AbilitySkill =
  | "opportunity_discovery"
  | "user_research"
  | "market_analysis"
  | "competitor_analysis"
  | "willingness_to_pay"
  | "business_model"
  | "customer_acquisition"
  | "unit_economics"
  | "validation"
  | "risk_analysis"
  | "strategic_judgment"
  | "review";

/** 能力信号 */
export interface AbilitySignal {
  skill: AbilitySkill;
  signal: "positive" | "negative" | "neutral";
  /** 0-1 */
  severity: number;
  evidence: string;
}

/** Examiner 弱点类别（10 项） */
export type WeaknessCategory =
  | "factual_error"
  | "insufficient_evidence"
  | "logic_gap"
  | "over_optimism"
  | "risk_underestimation"
  | "user_need_misjudgment"
  | "willingness_to_pay_misjudgment"
  | "competition_misjudgment"
  | "business_model_issue"
  | "validation_plan_issue";

/** 评审发现（弱点） */
export interface ReviewFinding {
  category: WeaknessCategory;
  description: string;
  /** 0-1 */
  severity: number;
}

/** AI Examiner 对用户判断的评审（结构化） */
export interface UserDecisionReview {
  id: string;
  decisionId: string;
  /** 评审分 0-10（不是商业机会分） */
  score: number;
  strengths: string[];
  weaknesses: ReviewFinding[];
  reasoningGaps: string[];
  missingEvidence: string[];
  recommendedActions: string[];
  abilitySignals: AbilitySignal[];
  provider: AiProviderName;
  provider_degraded: boolean;
  createdAt: string;
}

/** 验证任务状态 */
export type ValidationTaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

/** 验证任务优先级（V0.4.1 Phase 7B-2） */
export type TaskPriority = "high" | "medium" | "low";

/** 状态转移历史条目（V0.4.1 Phase 7B-2：含执行者 actor） */
export interface TaskStateEntry {
  from: ValidationTaskStatus;
  to: ValidationTaskStatus;
  at: string;
  /** 执行者（用户 / 系统 / 特定角色） */
  actor?: string;
  note?: string;
}

/** 验证任务（ValidationPlan 的组成部分） */
export interface ValidationTask {
  id: string;
  planId: string;
  assumption: string;
  hypothesis: string;
  method: string;
  sampleSize: string;
  successCriteria: string;
  failureCriteria: string;
  deadline: string;
  costEstimate: string;
  owner: string;
  /** 关联评分维度（Score v2 调整用） */
  relatedDimension?: ScoreDimension;
  /** 优先级（V0.4.1 Phase 7B-2，缺省 medium） */
  priority?: TaskPriority;
  status: ValidationTaskStatus;
  /** 状态历史（V0.4.1 Phase 7B-2：每次转移记录，含 actor） */
  stateHistory?: TaskStateEntry[];
  /** 最近一次验证结果 id */
  resultId?: string;
  /** 结果结论回写 */
  outcome?: "confirmed" | "rejected" | "uncertain";
  /** 开始时间 */
  startedAt?: string;
  /** 完成时间 */
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** 验证计划 */
export interface ValidationPlan {
  id: string;
  decisionId: string;
  opportunityId: string;
  tasks: ValidationTask[];
  createdAt: string;
  updatedAt: string;
}

/** 验证结果（真实数据，仅用户输入，AI 不得伪造） */
export interface ValidationResult {
  id: string;
  taskId: string;
  planId: string;
  decisionId: string;
  opportunityId: string;
  /** 实际样本 */
  actualSample: string;
  /** 实际结果 */
  actualResult: string;
  /** 用户反馈 */
  userFeedback: string;
  actualConversionRate?: number;
  actualRevenue?: number;
  actualCost?: number;
  otherEvidence?: string;
  /** 结论：假设被证实/证伪/不确定 */
  outcome: "confirmed" | "rejected" | "uncertain";
  submittedBy: string;
  submittedAt: string;
}

/** Score v2 变化记录（可追溯） */
export interface ScoreUpdate {
  decisionId?: string;
  fromVersion: number;
  toVersion: number;
  /** 变化前 */
  before: ScoreVersion;
  /** 变化后 */
  after: ScoreVersion;
  /** 变化原因 */
  reason: string;
  /** 新增证据（验证结果转成 EvidenceItem） */
  newEvidence: EvidenceItem[];
  /** 验证结果摘要 */
  validationResults: Array<{ taskId: string; outcome: string; note: string }>;
  createdAt: string;
}

/** 学习事件（未来能力画像数据源） */
export interface LearningEvent {
  id: string;
  userId: string;
  opportunityId: string;
  decisionId?: string;
  skill: AbilitySkill;
  signal: "positive" | "negative" | "neutral";
  /** 0-1 */
  severity: number;
  evidence: string;
  createdAt: string;
}

/** 验证任务输入（创建计划时用户填写） */
export interface ValidationTaskInput {
  assumption: string;
  hypothesis: string;
  method: string;
  sampleSize: string;
  successCriteria: string;
  failureCriteria: string;
  deadline: string;
  costEstimate: string;
  owner: string;
  relatedDimension?: ScoreDimension;
  /** 优先级（V0.4.1 Phase 7B-2，缺省 medium） */
  priority?: TaskPriority;
}
/** 验证结果输入（用户填写，AI 不参与） */
export interface ValidationResultInput {
  taskId: string;
  actualSample: string;
  actualResult: string;
  userFeedback: string;
  actualConversionRate?: number;
  actualRevenue?: number;
  actualCost?: number;
  otherEvidence?: string;
  outcome: "confirmed" | "rejected" | "uncertain";
  submittedBy: string;
}