import type { ResearchContext } from "../context";
import { callAiStage } from "../ai-call";
import { analyzerPrompt } from "../prompts";
import { analyzerOutputSchema } from "../schema";
import type { AnalyzerOutput } from "../schema";

/** 阶段 1：商机分析器（simple / DeepSeek）—— 商机定义 + 问题定义 */
export async function runAnalyzerStage(ctx: ResearchContext) {
  return callAiStage({
    runAi: ctx.runAi,
    capability: "simple",
    type: "opportunity_analyzer",
    agent: "research-engine",
    prompt: analyzerPrompt(ctx.input),
    schema: analyzerOutputSchema,
  });
}

export type AnalyzerStageResult = Awaited<ReturnType<typeof runAnalyzerStage>>;
export type { AnalyzerOutput };