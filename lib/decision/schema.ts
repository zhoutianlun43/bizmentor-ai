/**
 * AI Examiner 输出 Schema（zod）+ 校验工具。
 * Examiner 只评审用户判断，绝不生成验证结果。
 */
import { z } from "zod";
import { extractJson, validateWithSchema } from "../research/schema";

export const weaknessCategorySchema = z.enum([
  "factual_error",
  "insufficient_evidence",
  "logic_gap",
  "over_optimism",
  "risk_underestimation",
  "user_need_misjudgment",
  "willingness_to_pay_misjudgment",
  "competition_misjudgment",
  "business_model_issue",
  "validation_plan_issue",
]);

export const abilitySkillSchema = z.enum([
  "opportunity_discovery",
  "user_research",
  "market_analysis",
  "competitor_analysis",
  "willingness_to_pay",
  "business_model",
  "customer_acquisition",
  "unit_economics",
  "validation",
  "risk_analysis",
  "strategic_judgment",
  "review",
]);

export const reviewFindingSchema = z.object({
  category: weaknessCategorySchema,
  description: z.string().min(1),
  severity: z.number().min(0).max(1),
});

export const abilitySignalSchema = z.object({
  skill: abilitySkillSchema,
  signal: z.enum(["positive", "negative", "neutral"]),
  severity: z.number().min(0).max(1),
  evidence: z.string().min(1),
});

/** AI Examiner 结构化输出 */
export const decisionReviewSchema = z.object({
  score: z.number().min(0).max(10),
  strengths: z.array(z.string()),
  weaknesses: z.array(reviewFindingSchema),
  reasoning_gaps: z.array(z.string()),
  missing_evidence: z.array(z.string()),
  recommended_actions: z.array(z.string()),
  ability_signals: z.array(abilitySignalSchema),
});

export type DecisionReviewOutput = z.infer<typeof decisionReviewSchema>;

export { validateWithSchema, extractJson };