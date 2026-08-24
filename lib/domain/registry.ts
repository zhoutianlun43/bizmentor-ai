/**
 * Business Domain 注册表（V0.4.1 Phase 6.1B）。
 * 新增领域：在 BUILTIN_DOMAINS 加一条配置，不改 Pipeline / UI。
 */
import type { BusinessDomain, BusinessDomainProfile } from "./types";

export const BUILTIN_DOMAINS: Record<BusinessDomain, BusinessDomainProfile> = {
  ecommerce: {
    id: "ecommerce",
    label: "电商",
    description: "电商（含跨境 / 社交电商）",
    researchHints:
      "领域：电商。需额外覆盖：销售渠道（平台 / 独立站 / 社媒）、物流时效与成本、平台政策与类目合规、选品与测款节奏。",
    searchQueryHints: "ecommerce cross-border TikTok Amazon Shopee",
    decisionChecklist: [
      "测款转化率是否达标",
      "头程+尾程物流是否赶得上时效窗口",
      "单位毛利是否支撑广告投放",
      "平台规则 / 类目合规是否满足",
    ],
    metricSet: [
      { key: "conversionRate", label: "转化率", unit: "%" },
      { key: "roi", label: "ROI", unit: "x" },
      { key: "aov", label: "客单价", unit: "USD" },
    ],
  },
  saas: {
    id: "saas",
    label: "SaaS",
    description: "SaaS / 软件订阅",
    researchHints:
      "领域：SaaS。需额外覆盖：订阅定价与层级、续费 / NRR、PLG 获客渠道、实施与客户成功成本、数据安全与合规。",
    searchQueryHints: "SaaS subscription PLG NRR enterprise software",
    decisionChecklist: [
      "激活率是否达标",
      "NRR / 留存是否支撑续费",
      "实施与客户成功成本是否可控",
      "定价分层是否合理",
    ],
    metricSet: [
      { key: "activationRate", label: "激活率", unit: "%" },
      { key: "nrr", label: "NRR", unit: "%" },
      { key: "churn", label: "月流失率", unit: "%" },
    ],
  },
  local_service: {
    id: "local_service",
    label: "本地生活服务",
    description: "本地生活服务（餐饮 / 美容 / 教育等）",
    researchHints:
      "领域：本地生活服务。需额外覆盖：商圈与区域密度、预约 / 到店转化、复购、人工与场地成本。",
    decisionChecklist: [
      "预约 / 到店转化是否达标",
      "区域密度是否支撑扩张",
      "复购率是否健康",
      "人工与场地成本是否可控",
    ],
    metricSet: [
      { key: "bookingRate", label: "预约转化率", unit: "%" },
      { key: "repeatRate", label: "复购率", unit: "%" },
    ],
  },
  content_media: {
    id: "content_media",
    label: "内容 / 媒体",
    description: "内容 / 媒体 / 知识付费",
    researchHints:
      "领域：内容 / 媒体。需额外覆盖：内容供给与分发渠道、注意力 / 留存指标、广告或订阅变现、平台算法依赖。",
    decisionChecklist: [
      "内容留存 / 完播是否达标",
      "对单一平台算法依赖是否过高",
      "变现路径是否清晰",
      "内容供给是否可持续",
    ],
  },
  marketplace: {
    id: "marketplace",
    label: "双边市场",
    description: "双边市场 / 平台",
    researchHints:
      "领域：双边市场。需额外覆盖：供需两侧冷启动、网络效应、交易信任与履约、双边补贴策略。",
    decisionChecklist: [
      "供需两侧冷启动路径是否清晰",
      "网络效应能否形成",
      "交易信任与履约是否可控",
      "补贴策略是否可持续",
    ],
  },
  physical_product: {
    id: "physical_product",
    label: "实体产品",
    description: "实体产品（非电商渠道）",
    researchHints:
      "领域：实体产品。需额外覆盖：生产与供应链、渠道分销、库存与资金占用、毛利与定价。",
    decisionChecklist: [
      "供应链与生产周期是否可控",
      "渠道分销是否可达目标客户",
      "库存与资金占用是否可承受",
      "毛利是否健康",
    ],
  },
  ai_service: {
    id: "ai_service",
    label: "AI 服务 / 工具",
    description: "AI 工具 / 服务",
    researchHints:
      "领域：AI 服务。需额外覆盖：模型 / 技术成本、数据与合规、与通用模型的差异化、获客与付费转化。",
    decisionChecklist: [
      "单位调用成本是否可承受",
      "数据 / 合规风险是否可控",
      "与通用模型的差异化是否成立",
      "付费转化路径是否清晰",
    ],
  },
  unknown: {
    id: "unknown",
    label: "通用",
    description: "未分类（走通用流程，无领域注入）",
  },
};

/** 取领域画像（未知领域回退通用画像） */
export function getDomainProfile(domain: BusinessDomain): BusinessDomainProfile {
  return BUILTIN_DOMAINS[domain] ?? BUILTIN_DOMAINS.unknown;
}