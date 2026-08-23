/**
 * 阶段 AI 调用封装：JSON 提取 → zod 校验 → 失败重试一次。
 * - 第一次失败（JSON 非法 / schema 校验失败）→ 自动重试一次
 * - 第二次失败 → 抛 StageCallError（stage failed），禁止伪造结果
 * - runAI 自身抛错（Provider 失败）不重试，直接上抛（Gateway 已处理 fallback）
 */
import type { AiCapability, AiProviderName, AiResult, AiTask, AiTaskType } from "../ai/types";
import { extractJson, validateWithSchema } from "./schema";
import type { PromptParts } from "./prompts";
import { retryPrompt } from "./prompts";
import type { z } from "zod";

/** AI 调用函数（V0.2 runAI 的签名；客户端使用 /api/ai 适配器，服务端/测试注入 runAI 或 fake） */
export type RunAiFn = (task: AiTask) => Promise<AiResult>;

export interface StageCallResult<T> {
  data: T;
  provider: AiProviderName;
  model: string;
  provider_degraded: boolean;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  durationMs: number;
  attempts: number;
}

export class StageCallError extends Error {
  readonly stage: string;
  readonly attempts: number;

  constructor(stage: string, attempts: number, message: string) {
    super(message);
    this.name = "StageCallError";
    this.stage = stage;
    this.attempts = attempts;
  }
}

interface CallParams<T> {
  runAi: RunAiFn;
  capability: AiCapability;
  type: AiTaskType;
  agent: string;
  prompt: PromptParts;
  schema: z.ZodType<T>;
  allowDegrade?: boolean;
}

export async function callAiStage<T>(params: CallParams<T>): Promise<StageCallResult<T>> {
  const startedAt = Date.now();
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCost = 0;
  let degraded = false;
  let lastProvider: AiProviderName = "deepseek";
  let lastModel = "";
  let lastErrors: string[] = [];

  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt = attempt === 0 ? params.prompt : retryPrompt(params.prompt, lastErrors);
    const result = await params.runAi({
      capability: params.capability,
      task: prompt.user,
      system: prompt.system,
      type: params.type,
      agent: params.agent,
      allowDegrade: params.allowDegrade,
    });
    totalInputTokens += result.usage.inputTokens;
    totalOutputTokens += result.usage.outputTokens;
    totalCost += result.usage.estimatedCost;
    degraded = degraded || result.provider_degraded;
    lastProvider = result.provider;
    lastModel = result.model;

    let raw: unknown;
    try {
      raw = extractJson(result.content);
    } catch (error) {
      lastErrors = [`JSON 解析失败: ${(error as Error).message}`];
      continue;
    }
    const validated = validateWithSchema(params.schema, raw);
    if (validated.ok) {
      return {
        data: validated.data,
        provider: lastProvider,
        model: lastModel,
        provider_degraded: degraded,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        estimatedCost: totalCost,
        durationMs: Date.now() - startedAt,
        attempts: attempt + 1,
      };
    }
    lastErrors = validated.errors;
  }

  throw new StageCallError(
    params.type,
    2,
    `AI 输出两次均未通过校验（${params.type}）: ${lastErrors.slice(0, 3).join("；").slice(0, 300)}`,
  );
}