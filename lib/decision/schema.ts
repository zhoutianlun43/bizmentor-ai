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

// ===================== V0.4.1 Phase 7A：Business Decision Engine =====================

/** Investment Thesis 输出 Schema（AI 提案部分） */
export const investmentThesisSchema = z.object({
  coreHypothesis: z.string().min(1),
  logicChain: z.array(z.string()).min(1),
  keyAssumptions: z
    .array(
      z.object({
        claim: z.string().min(1),
        evidenceClass: z.enum(["FACT", "AI_INFERENCE", "ASSUMPTION", "NEEDS_VALIDATION"]),
        sourceId: z.string().optional(),
      }),
    )
    .min(1),
  invalidators: z.array(z.string()).min(1),
  expectedUpside: z.string().min(1),
  decisionGate: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

export type InvestmentThesisOutput = z.infer<typeof investmentThesisSchema>;

/** 电商单位经济输入 */
export const ecommerceUnitEconomicsSchema = z.object({
  /** 客单价 */
  aov: z.number().min(0),
  /** 商品成本率 0-1 */
  cogsRate: z.number().min(0).max(1),
  /** 单均履约/物流成本 */
  shippingPerOrder: z.number().min(0),
  /** 平台费率 0-1 */
  platformFeeRate: z.number().min(0).max(1),
  /** 获客成本 */
  cac: z.number().min(0),
  /** 每客户平均购买次数 */
  avgOrdersPerCustomer: z.number().min(1),
});

/** SaaS 单位经济输入 */
export const saasUnitEconomicsSchema = z.object({
  /** 单客户月均收入 ACV/月 */
  acvPerMonth: z.number().min(0),
  /** 毛利率 0-1 */
  grossMarginRate: z.number().min(0).max(1),
  /** 月流失率 0-1 */
  churnRate: z.number().min(0).max(1),
  /** 获客成本 */
  cac: z.number().min(0),
});

/** 通用单位经济输入（非电商/SaaS 领域兜底） */
export const genericUnitEconomicsSchema = z.object({
  /** 单次成交收入 */
  revenuePerUnit: z.number().min(0),
  /** 单次成交变动成本 */
  costPerUnit: z.number().min(0),
  /** 获客成本 */
  cac: z.number().min(0),
  /** 每客户平均成交次数 */
  avgTransactionsPerCustomer: z.number().min(1),
});

export type UnitEconomicsInput =
  | z.infer<typeof ecommerceUnitEconomicsSchema>
  | z.infer<typeof saasUnitEconomicsSchema>
  | z.infer<typeof genericUnitEconomicsSchema>;

// ===================== V0.9：AI 商业判断（决策型报告） =====================

/** AI 商业判断输出 Schema（V0.9） */
export const businessJudgmentSchema = z.object({
  recommendation: z.enum(["recommend_enter", "conditional_enter", "continue_observe", "not_recommend"]),
  oneLineJudgment: z.string().min(1),
  biggestOpportunity: z.string().min(1),
  biggestRisk: z.string().min(1),
  suggestedAction: z.string().min(1),
  entryDirection: z.string().min(1),
  notDoList: z.array(z.string()).min(1),
  day90Plan: z
    .array(
      z.object({
        phase: z.string().min(1),
        title: z.string().min(1),
        actions: z.array(z.string()).min(1),
        successMetric: z.string().min(1),
      }),
    )
    .min(1),
  firstCustomers: z.object({
    targetSegment: z.string().min(1),
    channels: z.array(z.string()).min(1),
    offer: z.string().min(1),
    firstBatchGoal: z.string().min(1),
    steps: z.array(z.string()).min(1),
  }),
  confidence: z.number().min(0).max(1),
});

export type BusinessJudgmentOutput = z.infer<typeof businessJudgmentSchema>;
