import type { ResearchContext } from "../context";
import { callAiStage } from "../ai-call";
import { summaryPrompt } from "../prompts";
import { summarySchema } from "../schema";
import type { SummaryOutput, ValidationPlanOutput } from "../schema";

/** 阶段 7：最终报告器（reasoning / OpenAI，可降级但必须标记 degraded） */
export async function runSummaryStage(
  ctx: ResearchContext,
  analyzer: { definition: string },
  synthesis: { sections: Array<{ area: string; content: string }> },
  validationPlan: ValidationPlanOutput,
) {
  return callAiStage({
    runAi: ctx.runAi,
    capability: "reasoning",
    type: "final_summary",
    agent: "research-engine",
    prompt: summaryPrompt({ input: ctx.input, analyzer, sections: synthesis.sections, validationPlan }),
    schema: summarySchema,
    allowDegrade: true,
  });
}

export type SummaryStageResult = Awaited<ReturnType<typeof runSummaryStage>>;
export type { SummaryOutput };