import type { ResearchContext } from "../context";
import { callAiStage } from "../ai-call";
import { plannerPrompt } from "../prompts";
import { researchPlanSchema } from "../schema";
import type { AnalyzerOutput, ResearchPlan } from "../schema";

/** 阶段 2：研究规划器（simple / DeepSeek）—— 生成研究任务列表 */
export async function runPlannerStage(ctx: ResearchContext, analyzer: AnalyzerOutput) {
  return callAiStage({
    runAi: ctx.runAi,
    capability: "simple",
    type: "research_planner",
    agent: "research-engine",
    prompt: plannerPrompt(ctx.input, analyzer),
    schema: researchPlanSchema,
  });
}

export type PlannerStageResult = Awaited<ReturnType<typeof runPlannerStage>>;
export type { ResearchPlan };