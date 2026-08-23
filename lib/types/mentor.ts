/**
 * 用户商业能力画像相关类型。
 * V0.1 使用 mock 数据；未来由 AI 根据用户真实行为自动计算。
 */

/** 商业能力维度（8 项） */
export type AbilityKey =
  | "opportunityDiscovery"
  | "userResearch"
  | "competitorAnalysis"
  | "businessModel"
  | "financialAnalysis"
  | "validation"
  | "strategyJudgment"
  | "review";

/** 能力评分表（0-100） */
export type AbilityScores = Record<AbilityKey, number>;

/** 用户商业能力画像 */
export interface MentorProfile {
  /** 商业等级 */
  level: number;
  /** 等级称号，例如：商业观察者 */
  title: string;
  /** 当前经验值 */
  xp: number;
  /** 升级所需经验值 */
  xpToNext: number;
  abilities: AbilityScores;
}