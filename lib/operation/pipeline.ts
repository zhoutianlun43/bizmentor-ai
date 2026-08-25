/**
 * 商业操盘手报告 Pipeline（V1.2）。
 * 1) 真实数据采集：用外部研究（Tavily 等）抓取市场/产品/竞品来源
 * 2) 3 组子生成（A 市场验证+产品矩阵+供应链；B 竞品+定价；C 页面+内容30+广告+90天+投资判断）
 * 3) 组装 BusinessOperationPlan（sourceRequired 全程保留，无真实来源标注「暂无真实来源，需要验证」）
 */
import { extractJson, validateWithSchema } from "../research/schema";
import type { RunAiFn } from "../research/ai-call";
import type { ExternalResearchFn } from "../research/external/types";
import type { ResearchReport } from "../research/types";
import type { BusinessOperationPlan, BusinessRecommendation, OperationSource } from "./types";
import { operationPlanAPrompt, operationPlanBPrompt, operationPlanCPrompt } from "./prompts";
import { operationPlanASchema, operationPlanBSchema, operationPlanCSchema } from "./schema";
import type { z } from "zod";

export interface GenerateOperationPlanDeps {
  runAi: RunAiFn;
  externalResearch: ExternalResearchFn;
  report: ResearchReport;
  runId: string;
  opportunity: { id: string; name: string; description: string };
  /** 上一次操盘报告版本（每次重新生成 +1） */
  previousVersion?: number;
}

/** 真实数据采集（最多 15 条来源） */
export async function collectOperationSources(
  externalResearch: ExternalResearchFn,
  opportunity: { name: string },
): Promise<OperationSource[]> {
  const queries = [
    `${opportunity.name} 市场规模 趋势`,
    `${opportunity.name} 产品 竞品 价格`,
    `${opportunity.name} 爆款 销量`,
  ];
  const seen = new Set<string>();
  const sources: OperationSource[] = [];
  for (const q of queries) {
    try {
      const out = await externalResearch({ query: q, area: "market", limit: 3 });
      for (const d of out.documents ?? []) {
        if (d.url && !seen.has(d.url)) {
          seen.add(d.url);
          sources.push({
            title: d.title,
            url: d.url,
            publisher: d.publisher,
            platform: "web",
            retrievedAt: d.retrievedAt ?? d.createdAt,
          });
        }
      }
    } catch {
      // 采集失败不阻塞生成
    }
    if (sources.length >= 15) break;
  }
  return sources;
}

async function callGen<T>(
  deps: GenerateOperationPlanDeps,
  schema: z.ZodType<T>,
  prompt: { system: string; user: string },
  maxTokens: number,
): Promise<T> {
  let lastErrors: string[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const user =
      attempt === 0
        ? prompt.user
        : `${prompt.user}\n\n【系统提示】上一次输出不符合 JSON 格式，请重新输出。错误：${lastErrors.slice(0, 3).join("；").slice(0, 300)}`;
    const result = await deps.runAi({
      capability: "reasoning",
      type: "business_model",
      agent: "operation-engine",
      task: user,
      system: prompt.system,
      allowDegrade: true,
      maxTokens,
    });
    let raw: unknown;
    try {
      raw = extractJson(result.content);
    } catch (error) {
      lastErrors = [`JSON 解析失败: ${(error as Error).message}`];
      continue;
    }
    const validated = validateWithSchema(schema, raw);
    if (validated.ok) return validated.data;
    lastErrors = validated.errors;
  }
  throw new Error(`商业操盘手报告生成失败: ${lastErrors.slice(0, 3).join("；").slice(0, 300)}`);
}

function toBusinessRecommendation(r: "yes" | "no" | "validate"): BusinessRecommendation {
  if (r === "yes") return "recommend_enter";
  if (r === "no") return "not_recommend";
  return "conditional_enter";
}

/** 生成完整商业操盘手报告 */
export async function generateOperationPlan(deps: GenerateOperationPlanDeps): Promise<BusinessOperationPlan> {
  const { report, runId, opportunity, previousVersion } = deps;
  const sources = await collectOperationSources(deps.externalResearch, opportunity);
  const base = {
    opportunityName: report.opportunityName,
    description: opportunity.description,
    executiveSummary: report.executiveSummary,
    sources,
  };

  const a = await callGen(deps, operationPlanASchema, operationPlanAPrompt(base), 12288);
  const b = await callGen(deps, operationPlanBSchema, operationPlanBPrompt(base), 8192);
  const c = await callGen(deps, operationPlanCSchema, operationPlanCPrompt(base), 16384);

  const recommendation = toBusinessRecommendation(c.investmentJudgment.recommendation);

  return {
    id: `oplan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    opportunityId: opportunity.id,
    runId,
    version: (previousVersion ?? 0) + 1,
    recommendation,
    sources,
    marketValidation: a.marketValidation,
    productMatrix: a.productMatrix,
    supplyChain: a.supplyChain,
    competitorAnalysis: b.competitorAnalysis,
    pricing: b.pricing,
    pageOptimization: c.pageOptimization,
    contentPlan: c.contentPlan,
    adPlan: c.adPlan.stages,
    ninetyDayPlan: c.ninetyDayPlan.phases,
    investmentJudgment: c.investmentJudgment,
    confidence: Math.round(c.investmentJudgment.recommendation === "yes" ? 0.7 : c.investmentJudgment.recommendation === "validate" ? 0.55 : 0.4),
    createdAt: new Date().toISOString(),
  };
}
