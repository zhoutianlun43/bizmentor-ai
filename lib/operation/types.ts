/**
 * 商业操盘手报告（V1.2：真实商业落地决策系统）。
 * 机会研究中心回答 WHY（值不值得做）；本模块回答 HOW（如何赚到钱）。
 * 原则：真实数据优先（sourceRequired），无真实来源必须标注「暂无真实来源，需要验证」，禁止 AI 编造数据。
 */
import type { BusinessRecommendation } from "../research/types";
export type { BusinessRecommendation } from "../research/types";

/** 数据来源（真实采集） */
export interface OperationSource {
  title?: string;
  url?: string;
  publisher?: string;
  platform?: string;
  retrievedAt?: string;
}

/** 市场真实需求验证（第 1 部分） */
export interface MarketValidationRow {
  keyword: string;
  platform: string;
  trend: string;
  /** 数据来源（真实采集到的来源描述；无则标「暂无真实来源，需要验证」） */
  source: string;
  businessMeaning: string;
  sourceRequired: boolean;
  sourceRef?: OperationSource;
}

export interface MarketValidation {
  summary: string;
  rows: MarketValidationRow[];
}

/** 产品筛选矩阵（第 2 部分：从 10-20 个候选筛选，非拍脑袋） */
export interface ProductCandidate {
  name: string;
  supplySource: string;
  referenceLink: string;
  targetMarket: string;
  demand: string;
  competitionCount: string;
  price: string;
  purchaseCost: string;
  grossMargin: string;
  logisticsCost: string;
  estimatedProfit: string;
  competitionDifficulty: number;
  score: number;
  recommendation: "recommend" | "consider" | "reject";
  why: string;
  whyNot: string;
  sourceRequired: boolean;
  sourceRef?: OperationSource;
}

export interface ProductMatrix {
  summary: string;
  candidates: ProductCandidate[];
}

/** 供应链分析（第 4 部分：货哪里来；无真实数据必须「需要进一步验证」） */
export interface SupplyChain {
  channels: string[];
  priceRange: string;
  moq: string;
  productionCycle: string;
  logistics: string;
  estimatedCost: string;
  /** 是否已由真实数据/真实链路验证 */
  verified: boolean;
  note: string;
}

/** 竞品深度拆解（第 3 部分：5-10 个真实竞品） */
export interface CompetitorProfile {
  brand: string;
  website: string;
  platform: string;
  product: string;
  price: string;
  sales: string;
  reviews: string;
  adMaterials: string;
  trafficSource: string;
  coreSellingPoint: string;
  userReviews: string;
  negativeReviews: string;
  opportunity: string;
  sourceRequired: boolean;
  sourceRef?: OperationSource;
}

export interface CompetitorAnalysis {
  summary: string;
  competitors: CompetitorProfile[];
}

/** 定价模型（第 5 部分：真实成本 = 采购-物流-佣金-广告-人工） */
export interface Pricing {
  purchaseCost: string;
  logistics: string;
  platformFee: string;
  adCost: string;
  labor: string;
  totalCost: string;
  sellingPrice: string;
  grossMargin: string;
  netProfit: string;
  breakevenAdCost: string;
  targetROI: string;
  sourceRequired: boolean;
  sourceRef?: OperationSource;
}

/** 页面与销售优化（第 6 部分） */
export interface PageOptimization {
  titles: string[];
  mainImages: Array<{ slot: string; purpose: string; visual: string; text: string }>;
  description: { painPoints: string; solution: string; trust: string; cta: string };
  seoKeywords: Array<{ keyword: string; searchVolume: string; competition: string }>;
}

/** 社交媒体内容系统（第 7 部分：30 条内容计划） */
export interface ContentPlanItem {
  day: string;
  title: string;
  structure: string;
  hook: string;
  filming: string;
  productDisplay: string;
  cta: string;
  targetMetric: string;
}

/** 广告投放方案（第 8 部分） */
export interface AdStage {
  stage: string;
  budget: string;
  materials: string;
  goal: string;
  metrics: string;
  eliminateRule: string;
  scaleRule: string;
}

/** AI 操盘 90 天计划（第 9 部分：AI 负责 vs 用户负责 vs 工具 vs 输出） */
export interface NinetyDayPhase {
  phase: string;
  goal: string;
  aiResponsible: string;
  userResponsible: string;
  tools: string;
  output: string;
  successCriteria: string;
}

/** 投资判断（第 10 部分） */
export interface InvestmentJudgment {
  recommendation: "yes" | "no" | "validate";
  reasons: { market: string; competition: string; supplyChain: string; profit: string; growth: string; risk: string };
  biggestUnknown: string;
  nextExperiment: { experiment: string; budget: string; cycle: string; successCriteria: string; failureCriteria: string };
}

/** 商业操盘手报告（V1.2 整体） */
export interface BusinessOperationPlan {
  id: string;
  opportunityId: string;
  runId: string;
  /** 决策版本（V1.2：每次重新生成 +1） */
  version: number;
  recommendation: BusinessRecommendation;
  /** 真实数据来源汇总（本次生成采集） */
  sources: OperationSource[];
  marketValidation: MarketValidation;
  productMatrix: ProductMatrix;
  supplyChain: SupplyChain;
  competitorAnalysis: CompetitorAnalysis;
  pricing: Pricing;
  pageOptimization: PageOptimization;
  contentPlan: ContentPlanItem[];
  adPlan: AdStage[];
  ninetyDayPlan: NinetyDayPhase[];
  investmentJudgment: InvestmentJudgment;
  confidence: number;
  createdAt: string;
}
