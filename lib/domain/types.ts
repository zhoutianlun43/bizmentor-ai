/**
 * Business Domain Layer（V0.4.1 Phase 6.1B）。
 * 把「多商业领域」抽象为：领域类型 + 领域画像（配置驱动）+ 检测结果。
 * 原则：领域经验一律进 registry 配置，禁止在 Pipeline 里写 if(domain===...) 分支。
 */
import type { ScoreDimension } from "../research/types";

/** 商业机会所属领域（unknown = 未分类，走通用流程） */
export type BusinessDomain =
  | "ecommerce" // 电商（含跨境/社交电商）
  | "saas" // SaaS / 软件订阅
  | "local_service" // 本地生活服务
  | "content_media" // 内容 / 媒体 / 知识付费
  | "marketplace" // 双边市场
  | "physical_product" // 实体产品（非电商渠道）
  | "ai_service" // AI 工具 / 服务
  | "unknown";

/** 领域额外评分维度（如 SaaS 的 churn、Marketplace 的网络效应） */
export interface DomainScoreDimension {
  id: string;
  label: string;
  weight: number;
  negative?: boolean;
}

/** 领域画像（配置驱动；缺省字段回退通用行为） */
export interface BusinessDomainProfile {
  id: BusinessDomain;
  label: string;
  description?: string;
  /** 评分权重覆盖（缺省沿用通用权重） */
  scoreWeightOverrides?: Partial<Record<ScoreDimension, number>>;
  /** 领域额外评分维度（暂为预留给未来 scoring 扩展） */
  extraScoreDimensions?: DomainScoreDimension[];
  /** 注入 Planner 的研究提示（领域经验） */
  researchHints?: string;
  /** 外部搜索关键词增强 */
  searchQueryHints?: string;
  /** 决策检查清单（注入 Examiner） */
  decisionChecklist?: string[];
  /** 领域核心指标集（用于验证任务与 Score v2 映射） */
  metricSet?: Array<{ key: string; label: string; unit: string }>;
  /** 领域验证方法提示 */
  validationMethods?: string[];
}

/** 领域检测结果 */
export interface DomainDetection {
  domain: BusinessDomain;
  /** 0-1 */
  confidence: number;
  method: "rules" | "ai" | "unknown";
}