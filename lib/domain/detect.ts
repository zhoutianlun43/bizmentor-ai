/**
 * Business Domain 检测（V0.4.1 Phase 6.1B）。
 * - 先确定性关键词规则（无 AI 成本）
 * - 规则低置信/未命中且提供 runAi → AI(simple) 分类复核
 * - 永远允许回退 unknown（不阻断流程）
 */
import type { RunAiFn } from "../research/ai-call";
import { BUILTIN_DOMAINS } from "./registry";
import type { BusinessDomain, DomainDetection } from "./types";

export interface DomainInput {
  name: string;
  description: string;
}

interface DomainRule {
  domain: BusinessDomain;
  keywords: string[];
}

const RULES: DomainRule[] = [
  { domain: "ecommerce", keywords: ["电商", "跨境", "海外", "店铺", "商品", "卖家", "发货", "独立站", "直播带货", "抖店", "tiktok", "amazon", "shopify", "选品", "零售", "销售渠道"] },
  { domain: "saas", keywords: ["saas", "软件", "订阅", "企业服务", "plg", "云服务", "工具类", "app", "系统", "办公"] },
  { domain: "local_service", keywords: ["本地", "餐饮", "美容", "门店", "到店", "社区", "预约", "线下", "教育机构"] },
  { domain: "content_media", keywords: ["内容", "媒体", "自媒体", "知识付费", "课程", "播客", "视频", "公众号", "写作", "ip"] },
  { domain: "marketplace", keywords: ["双边", "撮合", "交易市场", "网络效应", "平台经济"] },
  { domain: "physical_product", keywords: ["实体产品", "生产", "供应链", "制造", "库存", "工厂", "批发", "产品制造"] },
  { domain: "ai_service", keywords: ["人工智能", "大模型", "gpt", "智能体", "agent", "ai 工具", "ai服务", "自动化"] },
];

/** 确定性关键词规则检测；命中返回 rules 结果，未命中返回 null */
export function detectDomainByRules(input: DomainInput): DomainDetection | null {
  const text = `${input.name} ${input.description}`.toLowerCase();
  let best: { domain: BusinessDomain; hits: number } | null = null;
  for (const rule of RULES) {
    const hits = rule.keywords.filter((k) => text.includes(k.toLowerCase())).length;
    if (hits > 0 && (!best || hits > best.hits)) best = { domain: rule.domain, hits };
  }
  if (!best) return null;
  // 置信度 = 0.55 + 0.12 * 命中数，上限 0.95；低于 0.7 视为低置信，交给 AI / unknown
  const confidence = Math.min(0.95, 0.55 + best.hits * 0.12);
  if (confidence < 0.7) return null;
  return { domain: best.domain, confidence: Math.round(confidence * 100) / 100, method: "rules" };
}

/** AI 分类提示词（simple / DeepSeek） */
export function domainClassificationPrompt(input: DomainInput): string {
  return `把下面的商业机会归类为：ecommerce | saas | local_service | content_media | marketplace | physical_product | ai_service | unknown。只输出 JSON：{"domain":"ecommerce"}。\n商机：${input.name}\n描述：${input.description}`;
}

/** 领域检测：规则优先，其次 AI，最后 unknown */
export async function detectDomain(input: DomainInput, opts: { runAi?: RunAiFn } = {}): Promise<DomainDetection> {
  const rules = detectDomainByRules(input);
  if (rules) return rules;

  if (opts.runAi) {
    try {
      const result = await opts.runAi({
        capability: "simple",
        type: "classification",
        agent: "domain-detector",
        task: domainClassificationPrompt(input),
      });
      const match = result.content.match(/"domain"\s*:\s*"([a-z_]+)"/);
      const domain = match?.[1] as BusinessDomain | undefined;
      if (domain && domain in BUILTIN_DOMAINS && domain !== "unknown") {
        return { domain, confidence: 0.8, method: "ai" };
      }
    } catch {
      // AI 失败：回退 unknown，不阻断
    }
  }

  return { domain: "unknown", confidence: 0, method: "unknown" };
}