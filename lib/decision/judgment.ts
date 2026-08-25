/**
 * AI 商业判断（V0.9）：从「研究型报告」升级为「决策型报告」。
 * 输出：是否建议进入 / 推荐切入方向 / 不建议做什么 / 90 天验证计划 / 第一批客户获取方案。
 * - AI(reasoning) 基于研究报告（含 Investment Thesis，若已生成）提炼
 * - JSON/schema 校验失败自动重试一次，两次失败抛错（不伪造）
 */
import type { RunAiFn } from "../research/ai-call";
import { extractJson, validateWithSchema } from "../research/schema";
import { businessJudgmentSchema } from "./schema";
import { businessJudgmentPrompt } from "./prompts";
import type { BusinessJudgment, ResearchReport } from "../research/types";

export interface GenerateJudgmentDeps {
  runAi: RunAiFn;
  report: ResearchReport;
  runId: string;
  opportunity: { id: string; name: string };
}

export async function generateBusinessJudgment(deps: GenerateJudgmentDeps): Promise<BusinessJudgment> {
  const { report, runId, opportunity } = deps;
  const prompt = businessJudgmentPrompt({
    opportunityName: report.opportunityName,
    executiveSummary: report.executiveSummary,
    overallScore: report.score.overall_score,
    confidence: report.score.confidence,
    nextActions: report.nextActions,
    domainLabel: report.meta.domain?.label,
    thesis: report.thesis,
    validationPlan: report.validationPlan,
  });

  let lastErrors: string[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const user =
      attempt === 0
        ? prompt.user
        : `${prompt.user}\n\n【系统提示】上一次输出不符合 JSON 格式，请重新输出。错误：${lastErrors.slice(0, 3).join("；").slice(0, 300)}`;
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
    const validated = validateWithSchema(businessJudgmentSchema, raw);
    if (validated.ok) {
      const now = new Date().toISOString();
      return {
        id: `judgment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        opportunityId: opportunity.id,
        runId,
        recommendation: validated.data.recommendation,
        oneLineJudgment: validated.data.oneLineJudgment,
        biggestOpportunity: validated.data.biggestOpportunity,
        biggestRisk: validated.data.biggestRisk,
        suggestedAction: validated.data.suggestedAction,
        entryDirection: validated.data.entryDirection,
        notDoList: validated.data.notDoList,
        day90Plan: validated.data.day90Plan,
        firstCustomers: validated.data.firstCustomers,
        confidence: Math.min(1, Math.max(0, validated.data.confidence)),
        createdAt: now,
      };
    }
    lastErrors = validated.errors;
  }

  throw new Error(`AI 商业判断两次输出均未通过校验: ${lastErrors.slice(0, 3).join("；").slice(0, 300)}`);
}

