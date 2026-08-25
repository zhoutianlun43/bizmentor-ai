/**
 * Evidence Score 生成器（V0.9.1）：从「AI 主观评分」改为「证据关联评分」。
 * 6 个维度：市场机会20% / 用户需求20% / 商业化20% / 竞争机会15% / 技术可行性15% / 风险10%。
 * - AI 只给各维度分 + 证据；总分由系统按权重确定性计算（防止 AI 操控总分）
 * - evidenceCoverage（数据支持比例/AI 推理比例）由证据类别确定性计算
 * - JSON/schema 校验失败自动重试一次，两次失败抛错（不伪造）
 */
import type { RunAiFn } from "../research/ai-call";
import { extractJson, validateWithSchema } from "../research/schema";
import { evidenceScoreSchema } from "./schema";
import { evidenceScorePrompt } from "./prompts";
import type { EvidenceScore, EvidenceItem, EvidenceScoreDimension, ResearchReport } from "../research/types";
import { EVIDENCE_SCORE_WEIGHTS, EVIDENCE_SCORE_LABELS } from "../research/types";

export interface GenerateEvidenceScoreDeps {
  runAi: RunAiFn;
  report: ResearchReport;
  runId: string;
  opportunity: { id: string; name: string };
}

function toEvidenceItem(raw: {
  claim: string;
  evidenceClass: "FACT" | "AI_INFERENCE" | "ASSUMPTION" | "NEEDS_VALIDATION";
  confidence: number;
  credibilityLevel?: "high" | "medium" | "low" | "unverified";
  verificationMethod?: string;
}): EvidenceItem {
  return {
    claim: raw.claim,
    evidenceClass: raw.evidenceClass,
    confidence: Math.min(1, Math.max(0, raw.confidence)),
    credibilityLevel: raw.credibilityLevel,
    verificationMethod: raw.verificationMethod,
  };
}

/** 数据支持比例 / AI 推理比例（确定性计算） */
export function computeEvidenceCoverage(items: EvidenceItem[]): { dataSupported: number; aiInferred: number } {
  if (items.length === 0) return { dataSupported: 0, aiInferred: 1 };
  const supported = items.filter((e) => e.evidenceClass === "FACT").length;
  const dataSupported = supported / items.length;
  return { dataSupported, aiInferred: 1 - dataSupported };
}

export async function generateEvidenceScore(deps: GenerateEvidenceScoreDeps): Promise<EvidenceScore> {
  const { report, runId, opportunity } = deps;
  const prompt = evidenceScorePrompt({
    opportunityName: report.opportunityName,
    executiveSummary: report.executiveSummary,
    sections: report.sections.map((s) => ({ title: s.title, content: s.content, confidence: s.confidence })),
    validationPlan: report.validationPlan.map((v) => ({ assumption: v.assumption, method: v.method })),
    sources: report.sources.map((s) => ({
      title: s.title,
      url: s.url,
      publisher: s.publisher,
      sourceType: s.sourceType,
      credibilityLevel: s.credibility?.level,
    })),
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
    const validated = validateWithSchema(evidenceScoreSchema, raw);
    if (validated.ok) {
      const dimensions: EvidenceScoreDimension[] = validated.data.dimensions.map((d) => ({
        dimension: d.dimension,
        label: d.label,
        weight: Math.min(1, Math.max(0, d.weight)),
        score: Math.min(10, Math.max(0, d.score)),
        confidence: Math.min(1, Math.max(0, d.confidence)),
        rationale: d.rationale,
        evidence: (d.evidence ?? []).map(toEvidenceItem),
      }));
      const allEvidence = dimensions.flatMap((d) => d.evidence);
      const overall = Number(
        dimensions
          .reduce((sum, d) => sum + d.score * (EVIDENCE_SCORE_WEIGHTS[d.dimension] ?? d.weight), 0)
          .toFixed(1),
      );
      return {
        id: `escore-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        opportunityId: opportunity.id,
        runId,
        dimensions,
        overall,
        confidence: Math.min(1, Math.max(0, validated.data.confidence)),
        evidenceCoverage: computeEvidenceCoverage(allEvidence),
        createdAt: new Date().toISOString(),
      };
    }
    lastErrors = validated.errors;
  }

  throw new Error(`Evidence Score 两次输出均未通过校验: ${lastErrors.slice(0, 3).join("；").slice(0, 300)}`);
}

export { EVIDENCE_SCORE_WEIGHTS, EVIDENCE_SCORE_LABELS };
