import type {
  AbilityKey,
  OpportunitySource,
  OpportunityStatus,
  TrainingCategory,
} from "@/lib/types";

/** 商机来源中文标签 */
export const OPPORTUNITY_SOURCE_LABELS: Record<OpportunitySource, string> = {
  ai: "AI发现",
  user: "我发现的",
};

/** 商机状态中文标签 */
export const OPPORTUNITY_STATUS_LABELS: Record<OpportunityStatus, string> = {
  researching: "研究中",
  validating: "验证中",
  validated: "已验证",
  abandoned: "已放弃",
};

/** 训练分类中文标签 */
export const TRAINING_CATEGORY_LABELS: Record<TrainingCategory, string> = {
  businessCase: "商业案例",
  judgment: "商业判断",
  businessModel: "商业模式",
  dataAnalysis: "数据分析",
  competitorAnalysis: "竞品分析",
  operationsStrategy: "运营策略",
};

/** 训练分类（按展示顺序） */
export const TRAINING_CATEGORIES: TrainingCategory[] = [
  "businessCase",
  "judgment",
  "businessModel",
  "dataAnalysis",
  "competitorAnalysis",
  "operationsStrategy",
];

/** 商业能力中文标签（8 项） */
export const ABILITY_LABELS: Record<AbilityKey, string> = {
  opportunityDiscovery: "机会发现",
  userResearch: "用户研究",
  competitorAnalysis: "竞品分析",
  businessModel: "商业模式",
  financialAnalysis: "财务分析",
  validation: "验证能力",
  strategyJudgment: "战略判断",
  review: "复盘能力",
};

/** 能力维度展示顺序 */
export const ABILITY_KEYS: AbilityKey[] = [
  "opportunityDiscovery",
  "userResearch",
  "competitorAnalysis",
  "businessModel",
  "financialAnalysis",
  "validation",
  "strategyJudgment",
  "review",
];