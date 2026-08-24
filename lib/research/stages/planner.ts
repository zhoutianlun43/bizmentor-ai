import type { ResearchContext } from "../context";
import { callAiStage } from "../ai-call";
import { plannerPrompt } from "../prompts";
import { researchPlanSchema } from "../schema";
import type { AnalyzerOutput, ResearchPlan } from "../schema";
import { domainHintsText } from "../../domain/hints";
import type { DomainDetection } from "../../domain/types";

/** 把领域提示拼接到 user 消息前（不改模板，unknown → 零变化） */
function withDomainHints(prompt: { system: string; user: string }, domain?: DomainDetection): { system: string; user: string } {
  const hints = domainHintsText(domain);
  return hints ? { ...prompt, user: `${hints}\n\n${prompt.user}` } : prompt;
}

/** 阶段 2：研究规划器（simple / DeepSeek）—— 生成研究任务列表 */
export async function runPlannerStage(ctx: ResearchContext, analyzer: AnalyzerOutput) {
  return callAiStage({
    runAi: ctx.runAi,
    capability: "simple",
    type: "research_planner",
    agent: "research-engine",
    prompt: withDomainHints(plannerPrompt(ctx.input, analyzer), ctx.domain),
    schema: researchPlanSchema,
  });
}

export type PlannerStageResult = Awaited<ReturnType<typeof runPlannerStage>>;
export type { ResearchPlan };