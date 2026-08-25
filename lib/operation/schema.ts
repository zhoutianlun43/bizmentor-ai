/**
 * 商业操盘手报告 子生成 Schema（V1.2）。
 * 分 3 组生成，避免单次输出过大：A=市场验证+产品矩阵+供应链；B=竞品+定价；C=页面+内容30+广告+90天+投资判断。
 */
import { z } from "zod";

const sourceRefSchema = z.object({
  title: z.string().optional(),
  url: z.string().optional(),
  publisher: z.string().optional(),
  platform: z.string().optional(),
  retrievedAt: z.string().optional(),
});

// ============ A：市场验证 + 产品矩阵 + 供应链 ============
export const marketValidationSchema = z.object({
  summary: z.string().min(1),
  rows: z
    .array(
      z.object({
        keyword: z.string().min(1),
        platform: z.string().min(1),
        trend: z.string().min(1),
        source: z.string().min(1),
        businessMeaning: z.string().min(1),
        sourceRequired: z.boolean(),
        sourceRef: sourceRefSchema.optional(),
      }),
    )
    .min(6)
    .max(14),
});

export const productMatrixSchema = z.object({
  summary: z.string().min(1),
  candidates: z
    .array(
      z.object({
        name: z.string().min(1),
        supplySource: z.string().min(1),
        referenceLink: z.string().min(1),
        targetMarket: z.string().min(1),
        demand: z.string().min(1),
        competitionCount: z.string().min(1),
        price: z.string().min(1),
        purchaseCost: z.string().min(1),
        grossMargin: z.string().min(1),
        logisticsCost: z.string().min(1),
        estimatedProfit: z.string().min(1),
        competitionDifficulty: z.number().min(1).max(10),
        score: z.number().min(0).max(100),
        recommendation: z.enum(["recommend", "consider", "reject"]),
        why: z.string().min(1),
        whyNot: z.string().min(1),
        sourceRequired: z.boolean(),
        sourceRef: sourceRefSchema.optional(),
      }),
    )
    .min(8)
    .max(20),
});

export const supplyChainSchema = z.object({
  channels: z.array(z.string()).min(1),
  priceRange: z.string().min(1),
  moq: z.string().min(1),
  productionCycle: z.string().min(1),
  logistics: z.string().min(1),
  estimatedCost: z.string().min(1),
  verified: z.boolean(),
  note: z.string().min(1),
});

export const operationPlanASchema = z.object({
  marketValidation: marketValidationSchema,
  productMatrix: productMatrixSchema,
  supplyChain: supplyChainSchema,
});

// ============ B：竞品 + 定价 ============
export const competitorAnalysisSchema = z.object({
  summary: z.string().min(1),
  competitors: z
    .array(
      z.object({
        brand: z.string().min(1),
        website: z.string().min(1),
        platform: z.string().min(1),
        product: z.string().min(1),
        price: z.string().min(1),
        sales: z.string().min(1),
        reviews: z.string().min(1),
        adMaterials: z.string().min(1),
        trafficSource: z.string().min(1),
        coreSellingPoint: z.string().min(1),
        userReviews: z.string().min(1),
        negativeReviews: z.string().min(1),
        opportunity: z.string().min(1),
        sourceRequired: z.boolean(),
        sourceRef: sourceRefSchema.optional(),
      }),
    )
    .min(4)
    .max(10),
});

export const pricingSchema = z.object({
  purchaseCost: z.string().min(1),
  logistics: z.string().min(1),
  platformFee: z.string().min(1),
  adCost: z.string().min(1),
  labor: z.string().min(1),
  totalCost: z.string().min(1),
  sellingPrice: z.string().min(1),
  grossMargin: z.string().min(1),
  netProfit: z.string().min(1),
  breakevenAdCost: z.string().min(1),
  targetROI: z.string().min(1),
  sourceRequired: z.boolean(),
  sourceRef: sourceRefSchema.optional(),
});

export const operationPlanBSchema = z.object({
  competitorAnalysis: competitorAnalysisSchema,
  pricing: pricingSchema,
});

// ============ C：页面 + 内容30 + 广告 + 90天 + 投资判断 ============
export const pageOptimizationSchema = z.object({
  titles: z.array(z.string()).min(8).max(14),
  mainImages: z
    .array(z.object({ slot: z.string().min(1), purpose: z.string().min(1), visual: z.string().min(1), text: z.string().min(1) }))
    .min(3)
    .max(5),
  description: z.object({ painPoints: z.string().min(1), solution: z.string().min(1), trust: z.string().min(1), cta: z.string().min(1) }),
  seoKeywords: z.array(z.object({ keyword: z.string().min(1), searchVolume: z.string().min(1), competition: z.string().min(1) })).min(5).max(12),
});

export const contentPlanItemSchema = z.object({
  day: z.string().min(1),
  title: z.string().min(1),
  structure: z.string().min(1),
  hook: z.string().min(1),
  filming: z.string().min(1),
  productDisplay: z.string().min(1),
  cta: z.string().min(1),
  targetMetric: z.string().min(1),
});

export const adPlanSchema = z.object({
  stages: z.array(z.object({ stage: z.string().min(1), budget: z.string().min(1), materials: z.string().min(1), goal: z.string().min(1), metrics: z.string().min(1), eliminateRule: z.string().min(1), scaleRule: z.string().min(1) })).min(2).max(5),
});

export const ninetyDayPlanSchema = z.object({
  phases: z.array(z.object({ phase: z.string().min(1), goal: z.string().min(1), aiResponsible: z.string().min(1), userResponsible: z.string().min(1), tools: z.string().min(1), output: z.string().min(1), successCriteria: z.string().min(1) })).min(3).max(5),
});

export const investmentJudgmentSchema = z.object({
  recommendation: z.enum(["yes", "no", "validate"]),
  reasons: z.object({ market: z.string().min(1), competition: z.string().min(1), supplyChain: z.string().min(1), profit: z.string().min(1), growth: z.string().min(1), risk: z.string().min(1) }),
  biggestUnknown: z.string().min(1),
  nextExperiment: z.object({ experiment: z.string().min(1), budget: z.string().min(1), cycle: z.string().min(1), successCriteria: z.string().min(1), failureCriteria: z.string().min(1) }),
});

export const operationPlanCSchema = z.object({
  pageOptimization: pageOptimizationSchema,
  contentPlan: z.array(contentPlanItemSchema).min(20).max(32),
  adPlan: adPlanSchema,
  ninetyDayPlan: ninetyDayPlanSchema,
  investmentJudgment: investmentJudgmentSchema,
});
