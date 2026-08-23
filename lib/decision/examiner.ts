/**
 * AI Examiner：评审用户判断，输出 UserDecisionReview（结构化）。
 * - 失败：JSON/schema 校验失败自动重试一次，两次失败抛错（不伪造评审）
 * - Provider 降级会显式记录 provider_degraded（高级模型不可用时 UI 明示）
 */
import type { AiProviderName } from "../ai/types";
import type { RunAiFn } from "../research/ai-call";
import { examinerPrompt } from "./prompts";
import { decisionReviewSchema, extractJson, validateWithSchema } from "./schema";
import type { UserDecision, UserDecisionReview } from "./types";

export interface ExaminerDeps {
  runAi: RunAiFn;
  opportunity: { name: string; description: string };
  decision: UserDecision;
}

export async function reviewUserDecision(deps: ExaminerDeps): Promise<UserDecisionReview> {
  const prompt = examinerPrompt({
    opportunity: deps.opportunity,
    aiScoreSnapshot: deps.decision.aiScoreSnapshot ?? null,
    decision: deps.decision.decision,
    judgment: deps.decision.judgment,
  });

  let lastErrors: string[] = [];
  let provider: AiProviderName = "deepseek";
  let degraded = false;

  for (let attempt = 0; attempt < 2; attempt++) {
    const user = attempt === 0 ? prompt.user : `${prompt.user}\n\n【系统提示】上一次输出不符合 JSON 格式，请重新输出。错误：${lastErrors.slice(0, 3).join("；").slice(0, 300)}`;
    const result = await deps.runAi({
      capability: "reasoning",
      task: user,
      system: prompt.system,
      type: "decision_review",
      agent: "decision-examiner",
      allowDegrade: true,
    });
    provider = result.provider;
    degraded = degraded || result.provider_degraded;
    let raw: unknown;
    try {
      raw = extractJson(result.content);
    } catch (error) {
      lastErrors = [`JSON 解析失败: ${(error as Error).message}`];
      continue;
    }
    const validated = validateWithSchema(decisionReviewSchema, raw);
    if (validated.ok) {
      return {
        id: `review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        decisionId: deps.decision.id,
        score: validated.data.score,
        strengths: validated.data.strengths,
        weaknesses: validated.data.weaknesses,
        reasoningGaps: validated.data.reasoning_gaps,
        missingEvidence: validated.data.missing_evidence,
        recommendedActions: validated.data.recommended_actions,
        abilitySignals: validated.data.ability_signals,
        provider,
        provider_degraded: degraded,
        createdAt: new Date().toISOString(),
      };
    }
    lastErrors = validated.errors;
  }

  throw new Error(`AI Examiner 两次输出均未通过校验: ${lastErrors.slice(0, 3).join("；").slice(0, 300)}`);
}