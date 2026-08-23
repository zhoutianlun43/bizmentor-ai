/** 决策/评审/能力/弱点 的中文标签（UI 用） */
import type { AbilitySkill, DecisionType, WeaknessCategory } from "./types";

export const DECISION_LABELS: Record<DecisionType, string> = {
  proceed: "推进",
  validate: "先验证",
  continue_research: "继续研究",
  pause: "暂停",
  abandon: "放弃",
};

export const WEAKNESS_LABELS: Record<WeaknessCategory, string> = {
  factual_error: "事实错误",
  insufficient_evidence: "证据不足",
  logic_gap: "逻辑跳跃",
  over_optimism: "过度乐观",
  risk_underestimation: "风险低估",
  user_need_misjudgment: "用户需求误判",
  willingness_to_pay_misjudgment: "付费意愿误判",
  competition_misjudgment: "竞争误判",
  business_model_issue: "商业模式问题",
  validation_plan_issue: "验证方案问题",
};

export const ABILITY_LABELS: Record<AbilitySkill, string> = {
  opportunity_discovery: "机会发现",
  user_research: "用户研究",
  market_analysis: "市场分析",
  competitor_analysis: "竞品分析",
  willingness_to_pay: "付费意愿",
  business_model: "商业模式",
  customer_acquisition: "获客能力",
  unit_economics: "单位经济",
  validation: "验证能力",
  risk_analysis: "风险分析",
  strategic_judgment: "战略判断",
  review: "复盘能力",
};