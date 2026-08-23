/**
 * 商机研究流水线（V0.3-A）。
 *
 * Opportunity
 *  → 1 Analyzer（商机/问题定义）
 *  → 2 Planner（研究任务）
 *  → 3 Research Tasks（逐任务 AI 研究，Finding→Evidence→Source 可追溯）
 *  → 4 Synthesis（15 项章节综合）
 *  → 5 Scoring（AI 提案 + 确定性聚合，Score v1）
 *  → 6 Validation Plan（验证方案）
 *  → 7 Final Summary（执行摘要 / MVP / 下一步）
 *  → ResearchReport
 *
 * - 所有 AI 调用必须通过注入的 runAi（生产 = runAI / 客户端 = /api/ai 适配器 / 测试 = fake）
 * - JSON 解析/schema 失败自动重试一次，两次失败 → 阶段 failed（禁止伪造）
 * - 任意阶段 provider 降级 → 最终 status=degraded，报告明确显示
 */
import type { AiProviderName } from "../ai/types";
import type { RunAiFn } from "./ai-call";
import { StageCallError } from "./ai-call";
import type { ResearchContext } from "./context";
import { NO_EXTERNAL_EVIDENCE_NOTICE, enforceEvidenceRules, toSourceDocuments } from "./sources";
import { runAnalyzerStage } from "./stages/analyzer";
import { runPlannerStage } from "./stages/planner";
import { runExecutorStage } from "./stages/executor";
import { runSynthesisStage } from "./stages/synthesis";
import { runScoringStage } from "./stages/scoring";
import { runValidationPlanStage } from "./stages/validation-plan";
import { runSummaryStage } from "./stages/summary";
import { withEnforcedEvidence } from "./scoring";
import { toEvidenceItems } from "./schema";
import type { SummaryOutput, ValidationPlanOutput } from "./schema";
import { uid } from "../store/storage";
import type {
  EvidenceItem,
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

export const TOTAL_STAGES = 7;

/** 归一化后的分析器输出（initialAssumptions 已应用 Evidence 规则） */
export interface NormalizedSynthesis {
  sections: Array<{
    area: ResearchSection["area"];
    title: string;
    content: string;
    confidence: number;
    evidence: EvidenceItem[];
  }>;
}

export interface NormalizedAnalyzer {
  definition: string;
  problem: string;
  targetUserHint: string;
  initialAssumptions: EvidenceItem[];
  unknowns: string[];
}

export interface PipelineOptions {
  /** AI 调用函数（必填：测试注入 fake；客户端传 /api/ai 适配器；服务端传 runAI） */
  runAi: RunAiFn;
  /** 每完成一个阶段回调（UI 进度展示） */
  onStage?: (stage: StageRun, index: number) => void;
}

/** 综合阶段产出中允许的章节领域（其余由 Analyzer/Summary/Scoring/Validation 提供） */
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

/** 把证据数组应用 Evidence 规则 */
function enforce(items: EvidenceItem[], docs: SourceDocument[]): EvidenceItem[] {
  return enforceEvidenceRules(items, docs);
}

export async function runResearchPipeline(input: ResearchInput, options: PipelineOptions): Promise<ResearchRun> {
  const { runAi, onStage } = options;
  const sourceDocuments = toSourceDocuments(input.materials ?? []);
  const ctx: ResearchContext = { runAi, input, sourceDocuments };

  const runId = uid();
  const createdAt = new Date().toISOString();
  const stages: StageRun[] = [];
  const findings: ResearchFinding[] = [];
  let status: ResearchRun["status"] = "running";
  let report: ResearchReport | undefined;
  let runError: ResearchRun["error"];

  /** 运行一个阶段：成功记录 completed，失败记录 failed 并中止 */
  async function runStage<T>(
    stage: ResearchStageName,
    fn: () => Promise<{ data: T; provider: AiProviderName; provider_degraded: boolean; inputTokens: number; outputTokens: number; estimatedCost: number; durationMs: number }>,
  ): Promise<T> {
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
      initialAssumptions: enforce(
        (analyzerCall.initialAssumptions ?? []).map((a) => ({
          claim: a.claim,
          evidenceClass: a.evidenceClass,
          confidence: a.confidence ?? 0.5,
          sourceRef: a.sourceRef ?? undefined,
        })),
        sourceDocuments,
      ),
    };

    // 2) Planner
    const plan = await runStage("planner", () => runPlannerStage(ctx, analyzer));

    // 3) Executor
    const executor = await runStage("executor", () => runExecutorStage(ctx, plan.tasks));
    for (const f of executor) {
      findings.push({
        taskId: f.taskId,
        area: f.area,
        summary: f.summary,
        evidence: enforce(toEvidenceItems(f.evidence), sourceDocuments),
        confidence: clamp01(f.confidence),
        unknowns: f.unknowns,
      });
    }

    // 4) Synthesis
    const synthesisCall = await runStage("synthesis", () => runSynthesisStage(ctx, analyzer, executor));
    const synthesis: NormalizedSynthesis = {
      sections: synthesisCall.sections.map((s) => ({
        ...s,
        confidence: clamp01(s.confidence),
        evidence: enforce(toEvidenceItems(s.evidence), sourceDocuments),
      })),
    };

    // 5) Scoring（确定性聚合）
    const scoring = await runStage("scoring", () => runScoringStage(ctx, synthesis.sections));
    const score: ScoreResult = withEnforcedEvidence(
      scoring,
      scoring.score_breakdown.map((d) => ({
        ...d,
        evidence: enforce(d.evidence, sourceDocuments),
      })),
    );

    // 6) Validation Plan
    const validationCall = await runStage("validation-plan", () => runValidationPlanStage(ctx, score));
    const validation: ValidationPlanOutput = validationCall;

    // 7) Final Summary（reasoning；允许降级但报告必须显示 degraded）
    const summaryCall = await runStage("summary", () => runSummaryStage(ctx, analyzer, synthesis, validation));
    const summary: SummaryOutput = summaryCall;

    // 组装报告
    report = buildReport({
      input,
      analyzer,
      synthesis,
      score,
      validation,
      summary,
      sourceDocuments,
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
    sourceDocuments,
    report,
    error: runError,
  };
}

function buildReport(params: {
  input: ResearchInput;
  analyzer: NormalizedAnalyzer;
  synthesis: NormalizedSynthesis;
  score: ScoreResult;
  validation: ValidationPlanOutput;
  summary: SummaryOutput;
  sourceDocuments: SourceDocument[];
}): ResearchReport {
  const { input, analyzer, synthesis, score, validation, summary, sourceDocuments } = params;
  const sections: ResearchSection[] = [];

  sections.push({
    area: "definition",
    title: "商机定义",
    content: analyzer.definition,
    evidence: enforce(analyzer.initialAssumptions, sourceDocuments),
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
    content: validation.items
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

  const hasExternalEvidence = sourceDocuments.some((d) => d.sourceType !== "USER_PROVIDED");

  return {
    opportunityId: input.opportunity.id,
    opportunityName: input.opportunity.name,
    executiveSummary: summary.executiveSummary,
    sections,
    score,
    validationPlan: validation.items,
    nextActions: summary.nextActions,
    meta: {
      degraded: false, // 由 pipeline 在返回前覆盖（这里先占位，pipeline 会重新设置 status）
      externalEvidenceAvailable: hasExternalEvidence,
      notice: hasExternalEvidence ? "部分结论有来源支撑。" : `${NO_EXTERNAL_EVIDENCE_NOTICE}。本报告的市场/竞品/数据类结论为 AI 推断，未经真实来源验证。`,
      generatedAt: new Date().toISOString(),
      providers: {},
    },
  };
}

/** 供 UI 调用的轻量包装（客户端） */
export function toResearchReport(run: ResearchRun): ResearchReport | undefined {
  return run.report;
}

export type { UserMaterial, ResearchInput };