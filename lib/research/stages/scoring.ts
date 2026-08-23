import type { AiProviderName } from "../../ai/types";
import type { ResearchContext } from "../context";
import { callAiStage } from "../ai-call";
import { scoringPrompt } from "../prompts";
import { scoreProposalSchema, toEvidenceItems } from "../schema";
import type { SynthesisOutput } from "../schema";
import type { ScoreProposal } from "../types";
import { buildScoreResult } from "../scoring";
import type { ScoreResult } from "../types";

export interface ScoringStageResult {
  data: ScoreResult;
  provider: AiProviderName;
  model: string;
  provider_degraded: boolean;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  durationMs: number;
  attempts: number;
}

/** 阶段 5：机会评分（research 提案 + 确定性聚合） */
export async function runScoringStage(ctx: ResearchContext, sections: SynthesisOutput["sections"]): Promise<ScoringStageResult> {
  const call = await callAiStage({
    runAi: ctx.runAi,
    capability: "research",
    type: "opportunity_scoring",
    agent: "research-engine",
    prompt: scoringPrompt(ctx.input, sections),
    schema: scoreProposalSchema,
  });
  const proposal: ScoreProposal = {
    dimensions: call.data.dimensions.map((d) => ({
      ...d,
      evidence: toEvidenceItems(d.evidence),
    })),
  };
  return {
    data: buildScoreResult(proposal, []),
    provider: call.provider,
    model: call.model,
    provider_degraded: call.provider_degraded,
    inputTokens: call.inputTokens,
    outputTokens: call.outputTokens,
    estimatedCost: call.estimatedCost,
    durationMs: call.durationMs,
    attempts: call.attempts,
  };
}