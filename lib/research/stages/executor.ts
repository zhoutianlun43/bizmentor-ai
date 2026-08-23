import type { AiCapability, AiProviderName } from "../../ai/types";
import type { ResearchContext } from "../context";
import { callAiStage } from "../ai-call";
import { taskPrompt } from "../prompts";
import { findingSchema } from "../schema";
import type { ResearchFindingOutput } from "../schema";
import type { ResearchTask } from "../types";

/** 需要深度研究的领域 → research（OpenAI，可降级 DeepSeek）；其余 simple（DeepSeek） */
const DEEP_TASK_AREAS = new Set(["market", "competition", "moat"]);

export function capabilityForArea(area: string): AiCapability {
  return DEEP_TASK_AREAS.has(area) ? "research" : "simple";
}

export interface ExecutorStageResult {
  data: ResearchFindingOutput[];
  provider: AiProviderName;
  model: string;
  provider_degraded: boolean;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  durationMs: number;
  attempts: number;
}

/** 阶段 3：研究执行器 —— 逐任务调用 runAI，汇总用量 */
export async function runExecutorStage(ctx: ResearchContext, tasks: ResearchTask[]): Promise<ExecutorStageResult> {
  const startedAt = Date.now();
  const findings: ResearchFindingOutput[] = [];
  let totalIn = 0;
  let totalOut = 0;
  let totalCost = 0;
  let degraded = false;
  let provider: AiProviderName = "deepseek";
  let model = "";
  let attempts = 0;

  for (const task of tasks) {
    const result = await callAiStage({
      runAi: ctx.runAi,
      capability: capabilityForArea(task.area),
      type: "research_task",
      agent: "research-engine",
      prompt: taskPrompt(task, ctx.input, ctx.sourceDocuments),
      schema: findingSchema,
    });
    findings.push(result.data);
    totalIn += result.inputTokens;
    totalOut += result.outputTokens;
    totalCost += result.estimatedCost;
    degraded = degraded || result.provider_degraded;
    provider = result.provider;
    model = result.model;
    attempts += result.attempts;
  }

  return {
    data: findings,
    provider,
    model,
    provider_degraded: degraded,
    inputTokens: totalIn,
    outputTokens: totalOut,
    estimatedCost: totalCost,
    durationMs: Date.now() - startedAt,
    attempts,
  };
}