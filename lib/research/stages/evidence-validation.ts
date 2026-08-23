/**
 * 阶段 5：Evidence Validation（确定性，无 AI）。
 * - Evidence ↔ Source 绑定（真实文档元数据写入，AI 无法伪造 URL）
 * - 来源可信度计算
 * - 多来源交叉验证 / 冲突检测 / 证据不足提示
 */
import type { ResearchContext } from "../context";
import { bindAndEnforce } from "../evidence";
import { detectConflicts, markInsufficientEvidence } from "../external/conflicts";
import { toEvidenceItems } from "../schema";
import type { ResearchFindingOutput } from "../schema";
import type { CrossValidationResult, ResearchFinding, ResearchTask, SourceDocument } from "../types";
import type { ExternalResearchOutput } from "../external/types";

export interface EvidenceValidationOutput {
  findings: ResearchFinding[];
  crossValidation: CrossValidationResult;
}

export interface EvidenceValidationStageResult {
  data: EvidenceValidationOutput;
  provider: "external";
  provider_degraded: boolean;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  durationMs: number;
  attempts: number;
}

export async function runEvidenceValidationStage(
  ctx: ResearchContext,
  findings: ResearchFindingOutput[],
  tasks: ResearchTask[],
  external: ExternalResearchOutput,
): Promise<EvidenceValidationStageResult> {
  const startedAt = Date.now();
  const docs: SourceDocument[] = [...ctx.sourceDocuments, ...external.documents];

  const enrichedFindings: ResearchFinding[] = findings.map((f) => ({
    ...f,
    evidence: bindAndEnforce(toEvidenceItems(f.evidence), docs),
  }));

  const cross = detectConflicts(enrichedFindings);
  const externalAreas = tasks.filter((t) => t.dataSource === "EXTERNAL_WEB").map((t) => t.area);
  const crossValidation = markInsufficientEvidence(cross, externalAreas, enrichedFindings);

  return {
    data: { findings: enrichedFindings, crossValidation },
    provider: "external",
    provider_degraded: false,
    inputTokens: 0,
    outputTokens: 0,
    estimatedCost: 0,
    durationMs: Date.now() - startedAt,
    attempts: 0,
  };
}