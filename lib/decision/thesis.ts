/**
 * Investment Thesis（投资论点）生成器（V0.4.1 Phase 7A）。
 * - AI(reasoning) 基于研究报告提炼：核心假设 / 逻辑链 / 关键假设 / 证伪条件 / 上行 / 决策门
 * - JSON/schema 校验失败自动重试一次，两次失败抛错（不伪造）
 * - 输出绑定 opportunityId + runId，可追溯「AI 当时怎么判断」
 */
import type { RunAiFn } from "../research/ai-call";
import { extractJson, investmentThesisSchema, validateWithSchema } from "./schema";
import { investmentThesisPrompt } from "./prompts";
import type { InvestmentThesis, ResearchReport } from "../research/types";

export interface GenerateThesisDeps {
  runAi: RunAiFn;
  report: ResearchReport;
  runId: string;
  opportunity: { id: string; name: string };
}

export async function generateInvestmentThesis(deps: GenerateThesisDeps): Promise<InvestmentThesis> {
  const { report, runId, opportunity } = deps;
  const prompt = investmentThesisPrompt({
    opportunityName: report.opportunityName,
    executiveSummary: report.executiveSummary,
    overallScore: report.score.overall_score,
    confidence: report.score.confidence,
    nextActions: report.nextActions,
    domainLabel: report.meta.domain?.label,
  });

  let lastErrors: string[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const user = attempt === 0 ? prompt.user : `${prompt.user}\n\n【系统提示】上一次输出不符合 JSON 格式，请重新输出。错误：${lastErrors.slice(0, 3).join("；").slice(0, 300)}`;
    const result = await deps.runAi({
      capability: "reasoning",
      type: "business_model",
      agent: "decision-engine",
      task: user,
      system: prompt.system,
      allowDegrade: true,
    });

    let raw: unknown;
    try {
      raw = extractJson(result.content);
    } catch (error) {
      lastErrors = [`JSON 解析失败: ${(error as Error).message}`];
      continue;
    }
    const validated = validateWithSchema(investmentThesisSchema, raw);
    if (validated.ok) {
      const now = new Date().toISOString();
      return {
        id: `thesis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        opportunityId: opportunity.id,
        runId,
        domain: report.meta.domain?.id,
        coreHypothesis: validated.data.coreHypothesis,
        logicChain: validated.data.logicChain,
        keyAssumptions: validated.data.keyAssumptions,
        invalidators: validated.data.invalidators,
        expectedUpside: validated.data.expectedUpside,
        decisionGate: validated.data.decisionGate,
        confidence: Math.min(1, Math.max(0, validated.data.confidence)),
        createdAt: now,
      };
    }
    lastErrors = validated.errors;
  }

  throw new Error(`Investment Thesis 两次输出均未通过校验: ${lastErrors.slice(0, 3).join("；").slice(0, 300)}`);
}