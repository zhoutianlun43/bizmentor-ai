/**
 * Business Model Analyzer：单位经济模型（V0.4.1 Phase 7A）。
 * - 根据 Business Domain 选择输入 Schema（电商 / SaaS / 通用）
 * - AI(research) 只提案输入，推导指标由确定性公式计算（可复算）
 * - 回本周期/LTV 不可计算时返回 -1（标记不适用，避免 Infinity 破坏 jsonb）
 */
import type { RunAiFn } from "../research/ai-call";
import { z } from "zod";
import { extractJson, validateWithSchema } from "./schema";
import { ecommerceUnitEconomicsSchema, genericUnitEconomicsSchema, saasUnitEconomicsSchema } from "./schema";
import { unitEconomicsPrompt } from "./prompts";
import type { ResearchReport, UnitEconomicsModel } from "../research/types";

export interface GenerateUnitEconomicsDeps {
  runAi: RunAiFn;
  report: ResearchReport;
  runId: string;
  opportunity: { id: string; name: string };
}

type Inputs = Record<string, number>;

const round2 = (v: number): number => Math.round(v * 100) / 100;
const finite = (v: number): number => (Number.isFinite(v) ? round2(v) : -1);

/** 确定性单位经济计算（电商：按订单；SaaS：按月；通用：按成交） */
export function computeUnitEconomics(domain: string, inputs: Inputs): UnitEconomicsModel["derived"] {
  if (domain === "ecommerce") {
    const aov = inputs.aov ?? 0;
    const cogsRate = inputs.cogsRate ?? 0;
    const shipping = inputs.shippingPerOrder ?? 0;
    const feeRate = inputs.platformFeeRate ?? 0;
    const cac = inputs.cac ?? 0;
    const orders = inputs.avgOrdersPerCustomer ?? 1;
    const grossMarginRate = 1 - cogsRate;
    const contributionPerUnit = aov * grossMarginRate - shipping - aov * feeRate;
    const contributionRate = aov > 0 ? round2(contributionPerUnit / aov) : 0;
    const paybackUnits = contributionPerUnit > 0 ? finite(cac / contributionPerUnit) : -1;
    const ltv = finite(contributionPerUnit * orders);
    const ltvCac = cac > 0 && ltv > 0 ? round2(ltv / cac) : -1;
    return { grossMarginRate: round2(grossMarginRate), contributionPerUnit: round2(contributionPerUnit), contributionRate, cac, paybackUnits, ltv, ltvCac };
  }
  if (domain === "saas") {
    const acv = inputs.acvPerMonth ?? 0;
    const gm = inputs.grossMarginRate ?? 0;
    const churn = inputs.churnRate ?? 0;
    const cac = inputs.cac ?? 0;
    const contributionPerUnit = acv * gm;
    const contributionRate = acv > 0 ? round2(contributionPerUnit / acv) : 0;
    const paybackUnits = contributionPerUnit > 0 ? finite(cac / contributionPerUnit) : -1;
    const ltv = churn > 0 ? finite(contributionPerUnit / churn) : -1;
    const ltvCac = cac > 0 && ltv > 0 ? round2(ltv / cac) : -1;
    return { grossMarginRate: round2(gm), contributionPerUnit: round2(contributionPerUnit), contributionRate, cac, paybackUnits, ltv, ltvCac };
  }
  // 通用
  const revenue = inputs.revenuePerUnit ?? 0;
  const cost = inputs.costPerUnit ?? 0;
  const cac = inputs.cac ?? 0;
  const txn = inputs.avgTransactionsPerCustomer ?? 1;
  const grossMarginRate = revenue > 0 ? round2((revenue - cost) / revenue) : 0;
  const contributionPerUnit = revenue - cost;
  const contributionRate = revenue > 0 ? round2(contributionPerUnit / revenue) : 0;
  const paybackUnits = contributionPerUnit > 0 ? finite(cac / contributionPerUnit) : -1;
  const ltv = finite(contributionPerUnit * txn);
  const ltvCac = cac > 0 && ltv > 0 ? round2(ltv / cac) : -1;
  return { grossMarginRate, contributionPerUnit: round2(contributionPerUnit), contributionRate, cac, paybackUnits, ltv, ltvCac };
}

function schemaFor(domain: string): z.ZodTypeAny {
  if (domain === "ecommerce") return ecommerceUnitEconomicsSchema;
  if (domain === "saas") return saasUnitEconomicsSchema;
  return genericUnitEconomicsSchema;
}

/** Business Model Analyzer：AI 提案输入 → 确定性计算 → 单位经济模型 */
export async function generateUnitEconomics(deps: GenerateUnitEconomicsDeps): Promise<UnitEconomicsModel> {
  const { report } = deps;
  const domain = report.meta.domain?.id ?? "unknown";
  const prompt = unitEconomicsPrompt({
    opportunityName: report.opportunityName,
    executiveSummary: report.executiveSummary,
    domain,
  });

  let lastErrors: string[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const user = attempt === 0 ? prompt.user : `${prompt.user}\n\n【系统提示】上一次输出不符合 JSON 格式，请重新输出。错误：${lastErrors.slice(0, 3).join("；").slice(0, 300)}`;
    const result = await deps.runAi({
      capability: "research",
      type: "unit_economics",
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
    const obj = (raw ?? {}) as { inputs?: Record<string, number>; assumptions?: string[]; confidence?: number };
    const validated = validateWithSchema(schemaFor(domain) as z.ZodType<Record<string, number>>, obj.inputs ?? {});
    if (validated.ok) {
      const inputs = validated.data as unknown as Inputs;
      return {
        domain,
        currency: "USD",
        inputs,
        derived: computeUnitEconomics(domain, inputs),
        assumptions: Array.isArray(obj.assumptions) ? obj.assumptions : [],
        confidence: Math.min(1, Math.max(0, typeof obj.confidence === "number" ? obj.confidence : 0.5)),
        createdAt: new Date().toISOString(),
      };
    }
    lastErrors = validated.errors;
  }

  throw new Error(`单位经济输入两次均未通过校验: ${lastErrors.slice(0, 3).join("；").slice(0, 300)}`);
}