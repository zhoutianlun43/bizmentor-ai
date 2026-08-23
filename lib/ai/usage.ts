/**
 * AI 用量与成本（ai_usage）。
 * - 成本计算集中在本文件：支持 OpenAI 与 DeepSeek，业务 Agent 不得自行计算成本
 * - 计价单位：USD / 1M tokens，可通过环境变量覆盖
 * - 每次调用记录：provider / model / task / agent / inputTokens / outputTokens /
 *   estimatedCost / durationMs / success / createdAt（+ degraded / fallbackFrom / error）
 */
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { env } from "../config/env";
import type { AiProviderName, AiUsageRecord } from "./types";

interface Pricing {
  inputPer1M: number;
  outputPer1M: number;
}

/** Provider 级默认计价（模型表未命中时使用） */
const PROVIDER_PRICING: Record<AiProviderName, Pricing> = {
  deepseek: {
    inputPer1M: env.deepseekInputPricePer1M,
    outputPer1M: env.deepseekOutputPricePer1M,
  },
  openai: {
    inputPer1M: env.openaiResearchInputPricePer1M,
    outputPer1M: env.openaiResearchOutputPricePer1M,
  },
};

/** 模型级计价表（按模型名精确匹配，优先级高于 Provider 默认） */
const MODEL_PRICING: Record<string, Pricing> = {
  [env.deepseekModel]: {
    inputPer1M: env.deepseekInputPricePer1M,
    outputPer1M: env.deepseekOutputPricePer1M,
  },
  [env.openaiResearchModel]: {
    inputPer1M: env.openaiResearchInputPricePer1M,
    outputPer1M: env.openaiResearchOutputPricePer1M,
  },
  [env.openaiReasoningModel]: {
    inputPer1M: env.openaiReasoningInputPricePer1M,
    outputPer1M: env.openaiReasoningOutputPricePer1M,
  },
};

function roundUsd(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

/**
 * 估算一次调用的成本（USD）。
 * 公式：inputTokens/1e6 × 输入单价 + outputTokens/1e6 × 输出单价
 */
export function estimateCost(
  provider: AiProviderName,
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = MODEL_PRICING[model] ?? PROVIDER_PRICING[provider];
  const cost = (inputTokens / 1e6) * pricing.inputPer1M + (outputTokens / 1e6) * pricing.outputPer1M;
  return roundUsd(cost);
}

export interface CreateUsageParams {
  provider: AiProviderName;
  model: string;
  task: string;
  agent: string;
  inputTokens: number;
  outputTokens: number;
  success: boolean;
  durationMs: number;
  degraded?: boolean;
  fallbackFrom?: AiProviderName;
  error?: string;
}

/** 组装一条用量记录（自动计算成本） */
export function createUsageRecord(params: CreateUsageParams): Omit<AiUsageRecord, "createdAt"> {
  return {
    provider: params.provider,
    model: params.model,
    task: params.task,
    agent: params.agent,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    estimatedCost: estimateCost(
      params.provider,
      params.model,
      params.inputTokens,
      params.outputTokens,
    ),
    durationMs: params.durationMs,
    success: params.success,
    degraded: params.degraded,
    fallbackFrom: params.fallbackFrom,
    error: params.error,
  };
}

/** 进程内用量历史（未来替换为数据库 ai_usage 表） */
const inMemoryUsage: AiUsageRecord[] = [];

/** 记录一次 AI 调用并追加到本地 JSONL（服务器端，best-effort） */
export function recordUsage(record: Omit<AiUsageRecord, "createdAt">): AiUsageRecord {
  const full: AiUsageRecord = { ...record, createdAt: new Date().toISOString() };
  inMemoryUsage.push(full);
  appendUsageToFile(full);
  return full;
}

/** 读取进程内用量历史 */
export function getUsageHistory(): AiUsageRecord[] {
  return [...inMemoryUsage];
}

/** 追加到 .data/ai_usage.jsonl（可用 AI_USAGE_FILE 覆盖路径） */
function appendUsageToFile(record: AiUsageRecord): void {
  try {
    const file = env.aiUsageFile || join(process.cwd(), ".data", "ai_usage.jsonl");
    mkdirSync(dirname(file), { recursive: true });
    appendFileSync(file, `${JSON.stringify(record)}\n`);
  } catch {
    // 用量落盘失败不影响主流程
  }
}