import type { ResearchContext } from "../context";
import { callAiStage } from "../ai-call";
import { validationPlanPrompt } from "../prompts";
import { validationPlanSchema } from "../schema";
import type { ScoreResult } from "../types";

/** 阶段 6：验证方案设计器（research） */
export async function runValidationPlanStage(ctx: ResearchContext, score: ScoreResult) {
  const proposal = { dimensions: score.score_breakdown };
  return callAiStage({
    runAi: ctx.runAi,
    capability: "research",
    type: "validation_plan",
    agent: "research-engine",
    prompt: validationPlanPrompt(ctx.input, proposal),
    schema: validationPlanSchema,
  });
}

export type ValidationPlanStageResult = Awaited<ReturnType<typeof runValidationPlanStage>>;