import type { AiProviderName } from "../../ai/types";
import type { ResearchContext } from "../context";
import { callAiStage } from "../ai-call";
import { scoringPrompt } from "../prompts";
import { scoreProposalSchema, toEvidenceItems } from "../schema";
import type { SynthesisOutput } from "../schema";
import type { ScoreProposal, ScoreDimension, ScoreResult } from "../types";
import { buildScoreResult, mergeScoreWeights, SCORE_WEIGHTS } from "../scoring";
import { domainHintsText } from "../../domain/hints";
import { getDomainProfile } from "../../domain/registry";
import type { DomainDetection } from "../../domain/types";

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

/** 领域评分权重：画像覆盖项合并到通用权重（unknown → 通用权重） */
function resolveWeights(domain?: DomainDetection): Record<ScoreDimension, number> {
  if (!domain || domain.domain === "unknown") return { ...SCORE_WEIGHTS };
  return mergeScoreWeights(getDomainProfile(domain.domain).scoreWeightOverrides);
}

/** 把领域提示拼接到 user 消息前（不改模板，unknown → 零变化） */
function withDomainHints(prompt: { system: string; user: string }, domain?: DomainDetection): { system: string; user: string } {
  const hints = domainHintsText(domain);
  return hints ? { ...prompt, user: `${hints}\n\n${prompt.user}` } : prompt;
}

/** 阶段 5：机会评分（research 提案 + 确定性聚合） */
export async function runScoringStage(ctx: ResearchContext, sections: SynthesisOutput["sections"]): Promise<ScoringStageResult> {
  const call = await callAiStage({
    runAi: ctx.runAi,
    capability: "research",
    type: "opportunity_scoring",
    agent: "research-engine",
    prompt: withDomainHints(scoringPrompt(ctx.input, sections), ctx.domain),
    schema: scoreProposalSchema,
    maxTokens: 8192,
  });
  const proposal: ScoreProposal = {
    dimensions: call.data.dimensions.map((d) => ({
      ...d,
      evidence: toEvidenceItems(d.evidence),
    })),
  };
  return {
    data: buildScoreResult(proposal, [], resolveWeights(ctx.domain)),
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