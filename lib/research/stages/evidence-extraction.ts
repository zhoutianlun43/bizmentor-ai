/**
 * 阶段 4：Evidence Extraction。
 * 按任务数据源选择提示词：
 * - EXTERNAL_WEB → 从真实抓取文档提取（FACT 必须绑定 doc id）
 * - USER_PROVIDED → 从用户资料提取
 * - AI_RESEARCH → AI 推断（禁止 FACT）
 */
import type { AiCapability, AiProviderName } from "../../ai/types";
import type { ResearchContext } from "../context";
import { callAiStage } from "../ai-call";
import { aiResearchPrompt, externalExtractionPrompt, userProvidedPrompt } from "../prompts";
import { findingSchema } from "../schema";
import type { ResearchFindingOutput } from "../schema";
import type { ExternalResearchOutput } from "../external/types";
import type { ResearchTask } from "../types";

const DEEP_TASK_AREAS = new Set(["market", "competition", "moat"]);

export function capabilityForArea(area: string): AiCapability {
  return DEEP_TASK_AREAS.has(area) ? "research" : "simple";
}

export interface EvidenceExtractionStageResult {
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

export async function runEvidenceExtractionStage(
  ctx: ResearchContext,
  tasks: ResearchTask[],
  external: ExternalResearchOutput,
): Promise<EvidenceExtractionStageResult> {
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
    let prompt;
    if (task.dataSource === "EXTERNAL_WEB") {
      const taskDocs = external.searches.find((s) => s.taskId === task.id)?.documents ?? [];
      prompt = taskDocs.length > 0 ? externalExtractionPrompt(task, taskDocs) : aiResearchPrompt(task, ctx.input);
    } else if (task.dataSource === "USER_PROVIDED") {
      prompt = userProvidedPrompt(task, ctx.input, ctx.sourceDocuments);
    } else {
      prompt = aiResearchPrompt(task, ctx.input);
    }
    const capability =
      task.dataSource === "AI_RESEARCH" ? capabilityForArea(task.area) : "simple";

    const result = await callAiStage({
      runAi: ctx.runAi,
      capability,
      type: "research_task",
      agent: "research-engine",
      prompt,
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