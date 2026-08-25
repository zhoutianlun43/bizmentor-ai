/**
 * 阶段 5.5：证据自动验证（V1.1）。
 * 当 market / competition / willingnessToPay / demandStrength / targetUser / moat 等维度缺少外部来源证据时，
 * 不直接输出「需验证」：自动执行 扩展搜索 → 增加数据源 → 生成验证结果；仍失败则输出失败原因诊断。
 * - 扩展搜索：按领域确定性生成搜索词，调用外部研究
 * - 增加数据源：新增文档进入证据池（后续综合/评分绑定可见）
 * - 生成验证结果：每领域 recovered（补充来源）/ failed（诊断原因）
 */
import type { ResearchContext } from "../context";
import type { AreaVerification, ResearchArea, ResearchFinding, SourceDocument } from "../types";

const TARGET_AREAS: ResearchArea[] = ["market", "competition", "willingnessToPay", "demandStrength", "targetUser", "moat"];

const AREA_QUERY_TEMPLATES: Record<string, string[]> = {
  market: ["{opp} 市场规模 行业报告", "{opp} market size industry report"],
  competition: ["{opp} 竞品 对比 分析", "{opp} competitors comparison"],
  willingnessToPay: ["{opp} 用户 付费意愿 定价", "{opp} willingness to pay"],
  demandStrength: ["{opp} 需求 趋势 增长", "{opp} demand trend growth"],
  targetUser: ["{opp} 目标用户 画像", "{opp} target customer profile"],
  moat: ["{opp} 竞争壁垒 护城河", "{opp} competitive moat"],
};

export interface EvidenceVerifyStageOutput {
  areas: AreaVerification[];
  overall: "recovered" | "partial" | "failed";
  newDocs: SourceDocument[];
}

export interface EvidenceVerifyStageResult {
  data: EvidenceVerifyStageOutput;
  provider: "external";
  provider_degraded: boolean;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  durationMs: number;
  /** 数据来源数量（V1.1 时间线） */
  sourcesFound: number;
  /** 已发现证据数量（V1.1 时间线） */
  evidenceFound: number;
}

/** 找出缺少真实来源证据的目标领域 */
export function findInsufficientAreas(findings: ResearchFinding[]): ResearchArea[] {
  return Array.from(
    new Set(findings.filter((f) => !f.evidence.some((e) => e.sourceRef)).map((f) => f.area)),
  ).filter((a) => (TARGET_AREAS as string[]).includes(a)) as ResearchArea[];
}

export async function runEvidenceVerifyStage(
  ctx: ResearchContext,
  findings: ResearchFinding[],
): Promise<EvidenceVerifyStageResult> {
  const startedAt = Date.now();
  const insufficientAreas = findInsufficientAreas(findings);
  const areas: AreaVerification[] = [];
  const newDocs: SourceDocument[] = [];
  let totalSources = 0;

  for (const area of insufficientAreas) {
    const templates = AREA_QUERY_TEMPLATES[area] ?? ["{opp} " + area];
    const opp = ctx.input.opportunity.name;
    const queries = templates.map((t) => t.replace("{opp}", opp)).slice(0, 2);
    const searchedQueries: string[] = [];
    let sourcesFound = 0;
    let diagnosis = "";
    for (const q of queries) {
      searchedQueries.push(q);
      try {
        const out = await ctx.externalResearch({ query: q, area, limit: 5 });
        const docs = out.documents ?? [];
        const fresh = docs.filter(
          (d) => !newDocs.some((x) => x.url === d.url) && !ctx.sourceDocuments.some((x) => x.url === d.url),
        );
        newDocs.push(...fresh);
        sourcesFound += fresh.length;
        totalSources += fresh.length;
        if (sourcesFound > 0) break;
      } catch {
        diagnosis = "外部搜索服务调用失败";
        break;
      }
    }
    areas.push({
      area,
      status: sourcesFound > 0 ? "recovered" : "failed",
      searchedQueries,
      sourcesFound,
      diagnosis:
        sourcesFound > 0
          ? `自动扩展搜索补充 ${sourcesFound} 个外部来源，已纳入证据池。`
          : diagnosis ||
            `针对「${area}」扩展搜索未找到可用外部数据源；可能原因：该细分缺少公开数据、搜索词过窄、或需要付费行业数据源（如 Statista/艾瑞）。`,
    });
  }

  const overall: "recovered" | "partial" | "failed" =
    areas.length === 0
      ? "recovered"
      : areas.every((a) => a.status === "recovered")
        ? "recovered"
        : areas.some((a) => a.status === "recovered")
          ? "partial"
          : "failed";

  return {
    data: { areas, overall, newDocs },
    provider: "external",
    provider_degraded: false,
    inputTokens: 0,
    outputTokens: 0,
    estimatedCost: 0,
    durationMs: Date.now() - startedAt,
    sourcesFound: totalSources,
    evidenceFound: areas.length,
  };
}
