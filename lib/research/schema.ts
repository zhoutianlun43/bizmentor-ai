/**
 * AI 输出 Schema（zod）+ 校验工具。
 * 每个 AI 阶段输出 JSON → 这里校验；失败由 Pipeline 重试一次。
 */
import { z } from "zod";
import type { EvidenceItem, SourceReference } from "./types";

export const evidenceClassSchema = z.enum(["FACT", "AI_INFERENCE", "ASSUMPTION", "NEEDS_VALIDATION"]);

export const sourceRefSchema = z
  .object({
    sourceType: z.enum([
      "USER_PROVIDED",
      "EXTERNAL_WEB",
      "OFFICIAL_SOURCE",
      "PLATFORM_DATA",
      "UPLOADED_DOCUMENT",
    ]),
    sourceId: z.string().optional(),
    url: z.string().optional(),
    title: z.string().optional(),
  })
  .nullable()
  .optional();

/** AI 可能把 sourceRef 写成字符串（文档 id）→ 允许，归一化后由绑定校验真实性 */
export const sourceRefInputSchema = z.union([sourceRefSchema, z.string()]);

export const evidenceItemSchema = z.object({
  claim: z.string().min(1),
  evidenceClass: evidenceClassSchema,
  confidence: z.number().min(0).max(1),
  sourceRef: sourceRefInputSchema,
  note: z.string().optional(),
  credibilityLevel: z.enum(["high", "medium", "low", "unverified"]).optional(),
  verificationMethod: z.string().optional(),
});

export const analyzerOutputSchema = z.object({
  definition: z.string().min(1),
  problem: z.string().min(1),
  targetUserHint: z.string().min(1),
  initialAssumptions: z.array(
    z.object({
      claim: z.string().min(1),
      evidenceClass: evidenceClassSchema,
      confidence: z.number().min(0).max(1).optional(),
      sourceRef: sourceRefInputSchema,
    }),
  ),
  unknowns: z.array(z.string()),
});

export const researchTaskSchema = z.object({
  id: z.string().min(1),
  area: z.enum([
    "definition",
    "problem",
    "targetUser",
    "painPoint",
    "demandStrength",
    "market",
    "competition",
    "willingnessToPay",
    "businessModel",
    "moat",
    "risk",
    "mvp",
    "validation",
    "score",
    "nextAction",
  ]),
  question: z.string().min(1),
  dataSource: z.enum(["USER_PROVIDED", "AI_RESEARCH", "EXTERNAL_WEB", "EXTERNAL_NEEDED"]),
  required: z.boolean(),
});

export const researchPlanSchema = z.object({
  tasks: z.array(researchTaskSchema).min(1),
});

export const findingSchema = z.object({
  taskId: z.string().min(1),
  area: z.enum([
    "definition",
    "problem",
    "targetUser",
    "painPoint",
    "demandStrength",
    "market",
    "competition",
    "willingnessToPay",
    "businessModel",
    "moat",
    "risk",
    "mvp",
    "validation",
    "score",
    "nextAction",
  ]),
  summary: z.string().min(1),
  evidence: z.array(evidenceItemSchema),
  confidence: z.number().min(0).max(1),
  unknowns: z.array(z.string()),
});

export const competitorFindingSchema = z.object({
  name: z.string().min(1),
  url: z.string().optional(),
  description: z.string().min(1),
  evidence: z.array(evidenceItemSchema),
});

export const competitorMatrixSchema = z.object({
  competitors: z.array(z.string()),
  dimensions: z.array(z.string()),
  rows: z.array(
    z.object({
      competitor: z.string(),
      cells: z.array(
        z.object({
          dimension: z.string(),
          value: z.string(),
          sourceRef: sourceRefInputSchema,
        }),
      ),
    }),
  ),
});

export const synthesisSchema = z.object({
  sections: z.array(
    z.object({
      area: z.enum([
        "definition",
        "problem",
        "targetUser",
        "painPoint",
        "demandStrength",
        "market",
        "competition",
        "willingnessToPay",
        "businessModel",
        "moat",
        "risk",
        "mvp",
        "validation",
        "score",
        "nextAction",
      ]),
      title: z.string().min(1),
      content: z.string().min(1),
      confidence: z.number().min(0).max(1),
      evidence: z.array(evidenceItemSchema),
    }),
  ),
  competitors: z.array(competitorFindingSchema).optional(),
  competitorMatrix: competitorMatrixSchema.optional(),
});

export const scoreDimensionSchema = z.object({
  dimension: z.enum([
    "demand",
    "market",
    "competition",
    "willingnessToPay",
    "moat",
    "customerAcquisition",
    "risk",
  ]),
  score: z.number().min(0).max(10),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1),
  evidence: z.array(evidenceItemSchema),
});

export const scoreProposalSchema = z
  .object({
    dimensions: z.array(scoreDimensionSchema),
  })
  .refine((v) => new Set(v.dimensions.map((d) => d.dimension)).size === 7, {
    message: "评分维度必须包含全部 7 项且不重复",
  });

export const validationPlanSchema = z.object({
  items: z.array(
    z.object({
      assumption: z.string().min(1),
      method: z.string().min(1),
      successCriteria: z.string().min(1),
      effort: z.enum(["low", "medium", "high"]),
    }),
  ),
});

export const summarySchema = z.object({
  executiveSummary: z.string().min(1),
  mvpRecommendation: z.string().min(1),
  nextActions: z.array(z.string().min(1)),
});

export type AnalyzerOutput = z.infer<typeof analyzerOutputSchema>;
export type ResearchPlan = z.infer<typeof researchPlanSchema>;
export type ResearchFindingOutput = z.infer<typeof findingSchema>;
export type SynthesisOutput = z.infer<typeof synthesisSchema>;
export type ScoreProposalOutput = z.infer<typeof scoreProposalSchema>;
export type ValidationPlanOutput = z.infer<typeof validationPlanSchema>;
export type SummaryOutput = z.infer<typeof summarySchema>;

export type ValidatedEvidenceItem = z.infer<typeof evidenceItemSchema>;
export type ValidatedSourceRef = z.infer<typeof sourceRefInputSchema>;
export type ValidatedResearchTask = z.infer<typeof researchTaskSchema>;

/** 校验任意 AI 输出 */
export function validateWithSchema<T>(
  schema: z.ZodType<T>,
  raw: unknown,
): { ok: true; data: T } | { ok: false; errors: string[] } {
  const parsed = schema.safeParse(raw);
  if (parsed.success) return { ok: true, data: parsed.data };
  return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`) };
}

/**
 * 从 LLM 回复中提取 JSON。
 * 支持：直接 JSON / ```json 代码块 / 内容里夹带 JSON（取首 { 到末 }）。
 */
export function extractJson(content: string): unknown {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    // fallthrough
  }
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(candidate.slice(start, end + 1));
    } catch {
      // fallthrough
    }
  }
  throw new Error("AI 输出不是合法 JSON");
}

/** 把 schema 校验后的证据（sourceRef 可为 null）归一化为领域类型 EvidenceItem */
export function toEvidenceItem(raw: ValidatedEvidenceItem): EvidenceItem {
  return {
    claim: raw.claim,
    evidenceClass: raw.evidenceClass,
    confidence: raw.confidence,
    sourceRef: normalizeSourceRef(raw.sourceRef),
    note: raw.note,
    credibilityLevel: raw.credibilityLevel,
    verificationMethod: raw.verificationMethod,
  };
}

export function toEvidenceItems(raw: ValidatedEvidenceItem[]): EvidenceItem[] {
  return raw.map(toEvidenceItem);
}
/** 把 AI 的 sourceRef（字符串文档 id / 对象 / null）归一化为 SourceReference */
export function normalizeSourceRef(ref: ValidatedSourceRef): SourceReference | undefined {
  if (!ref) return undefined;
  if (typeof ref === "string") {
    return { sourceType: "EXTERNAL_WEB", sourceId: ref };
  }
  return {
    sourceType: ref.sourceType,
    sourceId: ref.sourceId,
    url: ref.url,
    title: ref.title,
  };
}