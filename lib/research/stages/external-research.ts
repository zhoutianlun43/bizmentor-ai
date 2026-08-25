/**
 * 阶段 3：External Research（无 AI）。
 * 对 EXTERNAL_WEB 任务执行真实搜索 + 网页读取，产出 SourceDocument。
 * 搜索结果只是候选；单任务失败不中断（记为无来源）。
 */
import type { ResearchContext } from "../context";
import type { ExternalResearchOutput } from "../external/types";
import type { ResearchTask, SourceDocument } from "../types";

export interface ExternalResearchStageResult {
  data: ExternalResearchOutput;
  provider: "external";
  provider_degraded: boolean;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  durationMs: number;
  attempts: number;
  sourcesFound?: number;
}

export async function runExternalResearchStage(
  ctx: ResearchContext,
  tasks: ResearchTask[],
): Promise<ExternalResearchStageResult> {
  const startedAt = Date.now();
  const searches: ExternalResearchOutput["searches"] = [];
  const documents: SourceDocument[] = [];

  for (const task of tasks.filter((t) => t.dataSource === "EXTERNAL_WEB")) {
    try {
      const out = await ctx.externalResearch({
        query: task.question,
        area: task.area,
        limit: ctx.searchLimit ?? 5,
      });
      searches.push({
        taskId: task.id,
        area: task.area,
        query: task.question,
        results: out.searches[0]?.results ?? [],
        documents: out.documents,
      });
      for (const doc of out.documents) {
        if (!documents.some((d) => d.url === doc.url)) documents.push(doc);
      }
    } catch {
      // 搜索/读取失败：该任务无真实来源（后续 evidence 会标记证据不足）
      searches.push({ taskId: task.id, area: task.area, query: task.question, results: [], documents: [] });
    }
  }

  return {
    data: { searches, documents },
    provider: "external",
    provider_degraded: false,
    inputTokens: 0,
    outputTokens: 0,
    estimatedCost: 0,
    durationMs: Date.now() - startedAt,
    attempts: 0,
    sourcesFound: documents.length,
  };
}