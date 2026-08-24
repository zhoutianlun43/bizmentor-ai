/**
 * Business Operating Loop 类型（V0.4.2 Phase 9B-2）。
 * 晨报 / 异常 / 晚报，全部可保存、可恢复（多设备就绪：仅存数据 + 确定性派生）。
 */
export type AnomalyType =
  | "task_overdue" // 超期任务
  | "decision_not_executed" // 决策未执行（无验证计划）
  | "task_failed" // 任务失败状态
  | "score_drop" // 评分下降
  | "validation_rejected"; // 验证结果证伪

export interface AnomalyAlert {
  id: string;
  type: AnomalyType;
  /** 1 低 / 2 中 / 3 高 */
  severity: 1 | 2 | 3;
  message: string;
  /** opportunityId / decisionId / taskId / runId */
  relatedId?: string;
  createdAt: string;
}

export interface BriefingStatus {
  opportunities: number;
  researching: number;
  validating: number;
  overdue: number;
}

/** 每日晨报（可保存/可恢复） */
export interface DailyBriefing {
  id: string;
  userId: string;
  /** YYYY-MM-DD */
  date: string;
  headline: string;
  status: BriefingStatus;
  anomalies: AnomalyAlert[];
  suggestedActions: string[];
  memoryInsights: string[];
  createdAt: string;
}

/** 决策对照：AI prediction vs User prediction vs Actual result */
export interface DecisionComparison {
  decisionId: string;
  opportunityName: string;
  domain?: string;
  aiPrediction?: number;
  userJudgment: string;
  outcome: "confirmed" | "rejected" | "uncertain" | "unknown";
  scoreDelta?: { from: number; to: number };
}

/** 每日晚报（可保存/可恢复） */
export interface DailyReview {
  id: string;
  userId: string;
  date: string;
  completedActions: string[];
  decisionComparison: DecisionComparison[];
  lessons: string[];
  tomorrowActions: string[];
  createdAt: string;
}