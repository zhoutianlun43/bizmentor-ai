/**
 * Business Memory Engine（V0.4.1 Phase 8A）。
 * 跨行业商业经验库：Decision Memory → Learning Event 归档 → Pattern Retrieval。
 * - 独立模块，不修改现有 Pipeline / Decision / Execution
 * - 存储走 MemoryRepository 抽象（localStorage / 未来 Supabase 表），零 schema 改动
 * 核心资产：AI prediction vs User prediction vs Actual result。
 */
import type { AbilitySkill, DecisionType, LearningEvent, UserDecision, UserDecisionReview, ValidationResult } from "../decision/types";
import type { ScoreUpdate } from "../decision/types";

/** 决策记忆记录（AI 当时怎么判断 + 用户当时怎么判断 + 实际结果） */
export interface DecisionMemoryRecord {
  id: string;
  decisionId: string;
  opportunityId: string;
  opportunityName: string;
  /** 领域（来自研究 meta.domain） */
  domain?: string;
  decision: DecisionType;
  differentFromAi: boolean;
  /** AI 当时怎么判断（评分快照） */
  aiPrediction: { score?: number; confidence?: number } | null;
  /** 用户当时怎么判断 */
  userPrediction: { coreJudgment: string; expectedOutcome: string } | null;
  /** 实际结果（来自验证结果；无结果 = unknown） */
  outcome: "confirmed" | "rejected" | "uncertain" | "unknown";
  /** 评分变化 v1 → v2 */
  scoreDelta?: { from: number; to: number };
  /** 经验教训（确定性生成，可含用户证据） */
  lesson: string;
  /** 能力信号（来自 Examiner ability_signals） */
  skills: Array<{ skill: AbilitySkill; signal: "positive" | "negative" | "neutral"; severity: number }>;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/** 已归档学习事件（归一化 + 可聚合） */
export interface ArchivedLearningEvent {
  id: string;
  skill: AbilitySkill;
  signal: "positive" | "negative" | "neutral";
  severity: number;
  evidence: string;
  opportunityId: string;
  decisionId?: string;
  domain?: string;
  createdAt: string;
}

/** 记忆检索查询 */
export interface MemoryQuery {
  domain?: string;
  skill?: AbilitySkill;
  signal?: "positive" | "negative" | "neutral";
  decision?: DecisionType;
  limit?: number;
}

/** 检索到的模式（跨记录聚合） */
export interface MemoryPattern {
  domain?: string;
  decision?: DecisionType;
  skill?: AbilitySkill;
  count: number;
  /** confirmed / (confirmed + rejected)；无结果时 null */
  confirmRate: number | null;
  avgScore?: number;
  /** 高频经验教训 */
  commonLessons: string[];
  /** 命中记录 id */
  records: string[];
}

/** 事件聚合（按 skill） */
export interface SkillEventAggregate {
  skill: AbilitySkill;
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  avgSeverity: number;
}

export type { LearningEvent, UserDecision, UserDecisionReview, ValidationResult, ScoreUpdate };