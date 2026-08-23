import type { ResearchContext } from "../context";
import { callAiStage } from "../ai-call";
import { synthesisPrompt } from "../prompts";
import { synthesisSchema } from "../schema";
import type { AnalyzerOutput, ResearchFindingOutput, SynthesisOutput } from "../schema";

/** 阶段 4：研究综合器（research）—— 汇总为结构化章节 */
export async function runSynthesisStage(
  ctx: ResearchContext,
  analyzer: AnalyzerOutput,
  findings: ResearchFindingOutput[],
) {
  return callAiStage({
    runAi: ctx.runAi,
    capability: "research",
    type: "research_synthesis",
    agent: "research-engine",
    prompt: synthesisPrompt(ctx.input, analyzer, findings),
    schema: synthesisSchema,
  });
}

export type SynthesisStageResult = Awaited<ReturnType<typeof runSynthesisStage>>;
export type { SynthesisOutput };