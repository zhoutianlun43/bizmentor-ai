/**
 * AI Examiner 提示词（V0.3-C）。
 * 评审对象：用户判断（不是替用户做决策）；输出结构化 JSON。
 * 原则：不得编造事实；不得生成验证结果。
 */
import type { UserDecision, UserJudgment } from "./types";
import { getDomainProfile } from "../domain/registry";
import type { BusinessDomain } from "../domain/types";

export interface PromptParts {
  system: string;
  user: string;
}

const REVIEW_RULES = `评审原则：
- 你评审的是「用户的商业判断」，不是替用户做最终决策。
- 区分事实错误 / 证据不足 / 逻辑跳跃 / 过度乐观 / 风险低估 / 用户需求误判 / 付费意愿误判 / 竞争误判 / 商业模式问题 / 验证方案问题。
- 不得编造事实；没有证据支撑的判断要标注「证据不足」。
- 不得生成或伪造验证结果。`;

const JSON_INSTRUCTION = `只输出 JSON，不要输出 Markdown 代码块，不要输出任何额外文字。`;

export function examinerPrompt(params: {
  opportunity: { name: string; description: string };
  aiScoreSnapshot?: { overall_score: number; confidence: number } | null;
  decision: UserDecision["decision"];
  judgment: UserJudgment;
  /** 领域信息（V0.4.1 Phase 6.1B：注入领域决策检查清单） */
  domain?: { id: string; label?: string };
}): PromptParts {
  const judgmentLines = [
    `为什么做/不做：${params.judgment.why}`,
    `核心判断：${params.judgment.coreJudgment}`,
    `关键证据：${params.judgment.keyEvidence}`,
    `最大风险：${params.judgment.biggestRisk}`,
    `最重要假设：${params.judgment.mostImportantAssumption}`,
    `预计结果：${params.judgment.expectedOutcome}`,
  ];
  if (params.judgment.differentJudgment) judgmentLines.push(`与 AI 不同的判断：${params.judgment.differentJudgment}`);
  const domainChecklist = params.domain
    ? getDomainProfile(params.domain.id as BusinessDomain).decisionChecklist
    : undefined;

  return {
    system: `你是 BizMentor 的「AI Examiner」（商业判断评审）。${REVIEW_RULES}\n${
      domainChecklist && domainChecklist.length > 0
        ? `领域检查清单（${params.domain?.label ?? ""}）：\n${domainChecklist.map((c) => `- ${c}`).join("\n")}\n`
        : ""
    }${JSON_INSTRUCTION}`,
    user: `请评审下面的用户商业判断。\n\n商机：${params.opportunity.name}\n描述：${params.opportunity.description}\n\nAI 研究报告当时的判断（供对比）：${
      params.aiScoreSnapshot
        ? `综合评分 ${params.aiScoreSnapshot.overall_score}/10，置信度 ${params.aiScoreSnapshot.confidence}`
        : "（无）"
    }\n用户决策：${params.decision}\n用户判断：\n${judgmentLines.join("\n")}\n\nJSON 格式：\n{"score":7.0,"strengths":["优点1"],"weaknesses":[{"category":"logic_gap|over_optimism|...","description":"问题描述","severity":0.5}],"reasoning_gaps":["逻辑缺口"],"missing_evidence":["缺少的证据"],"recommended_actions":["建议"],"ability_signals":[{"skill":"strategic_judgment|validation|...","signal":"positive|negative|neutral","severity":0.4,"evidence":"依据"}]}`,
  };
}