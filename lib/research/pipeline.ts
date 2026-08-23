/**
 * 商机研究流水线（V0.3-B：External Evidence / Web Research Engine）。
 *
 * Opportunity
 *  → 1 Analyzer（商机/问题定义）
 *  → 2 Planner（研究任务，含 EXTERNAL_WEB 任务）
 *  → 3 External Research（真实搜索 + 网页读取 → SourceDocument）
 *  → 4 Evidence Extraction（按任务从真实来源/AI 提取证据）
 *  → 5 Evidence Validation（来源绑定/可信度/冲突/证据不足）
 *  → 6 Synthesis（章节 + 竞品发现 + 竞品矩阵）
 *  → 7 Scoring（AI 提案 + 确定性聚合，Score v1）
 *  → 8 Validation Plan
 *  → 9 Final Summary
 *  → ResearchReport（来源可追溯）
 *
 * 原则：搜索结果不是事实；网页内容不是自动可信；AI 不得编造来源/URL；
 * 无来源结论保持 NEEDS_VALIDATION；多来源冲突必须显式显示；证据不足明确告知。
 */
import type { AiProviderName } from "../ai/types";
import type { RunAiFn } from "./ai-call";
import { StageCallError } from "./ai-call";
import type { ResearchContext } from "./context";
import { bindAndEnforce } from "./evidence";
import { NO_EXTERNAL_EVIDENCE_NOTICE, toSourceDocuments } from "./sources";
import { withEnforcedEvidence } from "./scoring";
import { toEvidenceItems } from "./schema";
import type { SummaryOutput, ValidationPlanOutput } from "./schema";
import { computeSourceCredibility } from "./external/credibility";
import type { ExternalResearchFn, ExternalResearchOutput } from "./external/types";
import { runAnalyzerStage } from "./stages/analyzer";
import { runPlannerStage } from "./stages/planner";
import { runExternalResearchStage } from "./stages/external-research";
import { runEvidenceExtractionStage } from "./stages/evidence-extraction";
import { runEvidenceValidationStage } from "./stages/evidence-validation";
import { runSynthesisStage } from "./stages/synthesis";
import { runScoringStage } from "./stages/scoring";
import { runValidationPlanStage } from "./stages/validation-plan";
import { runSummaryStage } from "./stages/summary";
import { uid } from "../store/storage";
import type {
  CompetitorFinding,
  CompetitorMatrix,
  EvidenceItem,
  SourceReference,
  ResearchFinding,
  ResearchInput,
  ResearchReport,
  ResearchRun,
  ResearchSection,
  ResearchStageName,
  ReportMeta,
  ScoreResult,
  SourceDocument,
  StageRun,
  UserMaterial,
} from "./types";

export const TOTAL_STAGES = 9;

export interface PipelineOptions {
  /** AI 调用函数（必填：测试注入 fake；客户端传 /api/ai 适配器；服务端传 runAI） */
  runAi: RunAiFn;
  /** 外部研究函数（必填：客户端传 /api/external-research 适配器；测试注入 fake；服务端传真实 Provider） */
  externalResearch: ExternalResearchFn;
  /** 每完成一个阶段回调（UI 进度展示） */
  onStage?: (stage: StageRun, index: number) => void;
}

/** 归一化后的分析器输出（initialAssumptions 已应用 Evidence 规则） */
export interface NormalizedAnalyzer {
  definition: string;
  problem: string;
  targetUserHint: string;
  initialAssumptions: EvidenceItem[];
  unknowns: string[];
}

/** 归一化后的综合输出（evidence 已是 EvidenceItem[]） */
export interface NormalizedSynthesis {
  sections: Array<{
    area: ResearchSection["area"];
    title: string;
    content: string;
    confidence: number;
    evidence: EvidenceItem[];
  }>;
  competitors: CompetitorFinding[];
  competitorMatrix: CompetitorMatrix | undefined;
}

const SYNTHESIS_AREAS = new Set([
  "targetUser",
  "painPoint",
  "demandStrength",
  "market",
  "competition",
  "willingnessToPay",
  "businessModel",
  "moat",
  "risk",
]);

function safeStageError(error: unknown): string {
  if (error instanceof StageCallError) return error.message.slice(0, 300);
  if (error instanceof Error) return `${error.name}: ${error.message}`.slice(0, 300);
  return "未知错误";
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** 竞品矩阵单元格来源绑定（防 AI 伪造 URL）；sourceRef 为 null 时归一化 */
function bindCellSources(
  matrix:
    | {
        competitors?: string[];
        dimensions?: string[];
        rows?: Array<{ competitor: string; cells: Array<{ dimension: string; value: string; sourceRef?: SourceReference | null | string }> }>;
      }
    | undefined,
  docs: SourceDocument[],
): CompetitorMatrix | undefined {
  if (!matrix) return undefined;
  return {
    competitors: matrix.competitors ?? [],
    dimensions: matrix.dimensions ?? [],
    rows: (matrix.rows ?? []).map((row) => ({
      competitor: row.competitor,
      cells: row.cells.map((cell) => {
        const rawRef = cell.sourceRef;
        const ref = typeof rawRef === "string" ? { sourceType: "EXTERNAL_WEB" as const, sourceId: rawRef } : (rawRef ?? undefined);
        if (!ref) return { dimension: cell.dimension, value: cell.value };
        const doc = ref.sourceId
          ? docs.find((d) => d.id === ref.sourceId)
          : ref.url
            ? docs.find((d) => d.url === ref.url)
            : undefined;
        if (!doc) return { ...cell, sourceRef: undefined };
        return {
          ...cell,
          sourceRef: {
            sourceType: doc.sourceType,
            sourceId: doc.id,
            url: doc.url,
            title: doc.title,
            publisher: doc.publisher,
            retrievedAt: doc.retrievedAt ?? doc.createdAt,
          },
        };
      }),
    })),
  };
}

export async function runResearchPipeline(input: ResearchInput, options: PipelineOptions): Promise<ResearchRun> {
  const { runAi, externalResearch, onStage } = options;
  const sourceDocuments = toSourceDocuments(input.materials ?? []);
  const ctx: ResearchContext = { runAi, externalResearch, input, sourceDocuments };

  const runId = uid();
  const createdAt = new Date().toISOString();
  const stages: StageRun[] = [];
  let findings: ResearchFinding[] = [];
  let externalOutput: ExternalResearchOutput = { searches: [], documents: [] };
  let crossValidation: ResearchRun["evidenceValidation"];
  let status: ResearchRun["status"] = "running";
  let report: ResearchReport | undefined;
  let runError: ResearchRun["error"];

  interface StageResultLike {
    provider: AiProviderName | "external";
    provider_degraded: boolean;
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number;
    durationMs: number;
  }

  async function runStage<T>(stage: ResearchStageName, fn: () => Promise<{ data: T } & StageResultLike>): Promise<T> {
    const startedAt = Date.now();
    try {
      const result = await fn();
      const stageRun: StageRun = {
        stage,
        status: "completed",
        provider: result.provider,
        provider_degraded: result.provider_degraded,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        estimatedCost: result.estimatedCost,
        durationMs: result.durationMs,
      };
      stages.push(stageRun);
      onStage?.(stageRun, stages.length - 1);
      return result.data;
    } catch (error) {
      const failed: StageRun = {
        stage,
        status: "failed",
        provider: "deepseek",
        provider_degraded: false,
        inputTokens: 0,
        outputTokens: 0,
        estimatedCost: 0,
        durationMs: Date.now() - startedAt,
        error: safeStageError(error),
      };
      stages.push(failed);
      onStage?.(failed, stages.length - 1);
      throw error;
    }
  }

  try {
    // 1) Analyzer
    const analyzerCall = await runStage("analyzer", () => runAnalyzerStage(ctx));
    const analyzer: NormalizedAnalyzer = {
      ...analyzerCall,
      initialAssumptions: bindAndEnforce(
        toEvidenceItems(
          (analyzerCall.initialAssumptions ?? []).map((a) => ({
            claim: a.claim,
            evidenceClass: a.evidenceClass,
            confidence: a.confidence ?? 0.5,
            sourceRef: a.sourceRef ?? undefined,
          })),
        ),
        sourceDocuments,
      ),
    };

    // 2) Planner
    const plan = await runStage("planner", () => runPlannerStage(ctx, analyzer));

    // 3) External Research
    externalOutput = await runStage("external-research", () => runExternalResearchStage(ctx, plan.tasks));

    // 4) Evidence Extraction
    const extraction = await runStage("evidence-extraction", () =>
      runEvidenceExtractionStage(ctx, plan.tasks, externalOutput),
    );

    // 5) Evidence Validation（确定性）
    const validation = await runStage("evidence-validation", () =>
      runEvidenceValidationStage(ctx, extraction, plan.tasks, externalOutput),
    );
    findings = validation.findings;
    crossValidation = validation.crossValidation;

    // 6) Synthesis
    const synthesisCall = await runStage("synthesis", () => runSynthesisStage(ctx, analyzer, findings));
    const synthesis: NormalizedSynthesis = {
      sections: synthesisCall.sections.map((s) => ({
        ...s,
        confidence: clamp01(s.confidence),
        evidence: bindAndEnforce(toEvidenceItems(s.evidence), [...sourceDocuments, ...externalOutput.documents]),
      })),
      competitors: (synthesisCall.competitors ?? []).map((c) => ({
        ...c,
        evidence: bindAndEnforce(toEvidenceItems(c.evidence), [...sourceDocuments, ...externalOutput.documents]),
      })),
      competitorMatrix: bindCellSources(synthesisCall.competitorMatrix, [...sourceDocuments, ...externalOutput.documents]),
    };

    // 7) Scoring（确定性聚合）
    const scoring = await runStage("scoring", () => runScoringStage(ctx, synthesis.sections));
    const allDocs = [...sourceDocuments, ...externalOutput.documents];
    const score: ScoreResult = withEnforcedEvidence(
      scoring,
      scoring.score_breakdown.map((d) => ({
        ...d,
        evidence: bindAndEnforce(d.evidence, allDocs),
      })),
    );

    // 8) Validation Plan
    const validationPlan = await runStage("validation-plan", () => runValidationPlanStage(ctx, score));

    // 9) Final Summary
    const summary = await runStage("summary", () => runSummaryStage(ctx, analyzer, synthesis, validationPlan));

    // 组装报告
    report = buildReport({
      input,
      analyzer,
      synthesis,
      score,
      validationPlan,
      summary,
      sourceDocuments,
      externalOutput,
      crossValidation,
    });
    status = stages.some((s) => s.provider_degraded) ? "degraded" : "completed";
    report.meta = {
      ...report.meta,
      degraded: status === "degraded",
      providers: Object.fromEntries(
        stages.map((s) => [s.stage, { provider: s.provider, provider_degraded: s.provider_degraded }]),
      ) as ReportMeta["providers"],
    };
  } catch (error) {
    status = "failed";
    runError = {
      stage: stages[stages.length - 1]?.stage ?? "unknown",
      type: error instanceof StageCallError ? "StageCallError" : error instanceof Error ? error.name : "Unknown",
      message: safeStageError(error),
    };
  }

  return {
    runId,
    opportunityId: input.opportunity.id,
    status,
    createdAt,
    updatedAt: new Date().toISOString(),
    stages,
    findings,
    scoreHistory: report ? [report.score] : [],
    sourceDocuments: [...sourceDocuments, ...externalOutput.documents],
    evidenceValidation: crossValidation,
    report,
    error: runError,
  };
}

function buildReport(params: {
  input: ResearchInput;
  analyzer: NormalizedAnalyzer;
  synthesis: NormalizedSynthesis;
  score: ScoreResult;
  validationPlan: ValidationPlanOutput;
  summary: SummaryOutput;
  sourceDocuments: SourceDocument[];
  externalOutput: ExternalResearchOutput;
  crossValidation: ResearchRun["evidenceValidation"];
}): ResearchReport {
  const { input, analyzer, synthesis, score, validationPlan, summary, sourceDocuments, externalOutput, crossValidation } = params;
  const sections: ResearchSection[] = [];

  sections.push({
    area: "definition",
    title: "商机定义",
    content: analyzer.definition,
    evidence: analyzer.initialAssumptions,
    confidence: 0.9,
  });
  sections.push({
    area: "problem",
    title: "问题定义",
    content: analyzer.problem,
    evidence: [],
    confidence: 0.9,
  });

  const seenAreas = new Set<string>();
  for (const s of synthesis.sections) {
    if (SYNTHESIS_AREAS.has(s.area) && !seenAreas.has(s.area)) {
      seenAreas.add(s.area);
      sections.push({
        area: s.area,
        title: s.title,
        content: s.content,
        evidence: s.evidence,
        confidence: s.confidence,
      });
    }
  }

  sections.push({
    area: "mvp",
    title: "MVP建议",
    content: summary.mvpRecommendation,
    evidence: [],
    confidence: 0.5,
  });
  sections.push({
    area: "validation",
    title: "验证方案",
    content: validationPlan.items
      .map((i) => `- 假设：${i.assumption}\n  方法：${i.method}\n  成功标准：${i.successCriteria}（effort: ${i.effort}）`)
      .join("\n\n"),
    evidence: [],
    confidence: 0.9,
  });
  sections.push({
    area: "score",
    title: "商业机会评分",
    content: `综合评分 ${score.overall_score}/10，置信度 ${score.confidence}`,
    evidence: score.evidence,
    confidence: score.confidence,
  });
  sections.push({
    area: "nextAction",
    title: "下一步行动",
    content: summary.nextActions.map((a, i) => `${i + 1}. ${a}`).join("\n"),
    evidence: [],
    confidence: 0.9,
  });

  const allDocs = [...sourceDocuments, ...externalOutput.documents];
  const hasExternalEvidence = externalOutput.documents.length > 0;

  return {
    opportunityId: input.opportunity.id,
    opportunityName: input.opportunity.name,
    executiveSummary: summary.executiveSummary,
    sections,
    score,
    validationPlan: validationPlan.items,
    nextActions: summary.nextActions,
    sources: allDocs.map((d) => ({ ...d, credibility: computeSourceCredibility(d) })),
    conflicts: crossValidation?.conflicts ?? [],
    crossValidatedAreas: crossValidation?.crossValidatedAreas ?? [],
    insufficientEvidence: crossValidation?.insufficientEvidence ?? [],
    competitors: synthesis.competitors ?? [],
    competitorMatrix: synthesis.competitorMatrix,
    meta: {
      degraded: false,
      externalEvidenceAvailable: hasExternalEvidence,
      notice: hasExternalEvidence
        ? "部分结论来自真实外部来源；来源可信度与冲突已标注，请结合多来源判断。"
        : `${NO_EXTERNAL_EVIDENCE_NOTICE}。本报告的市场/竞品/数据类结论为 AI 推断，未经真实来源验证。`,
      generatedAt: new Date().toISOString(),
      providers: {},
    },
  };
}

export type { UserMaterial, ResearchInput };