/**
 * 工具：research_tool（V0.4.2 Phase 9B-1）。
 * 调用现有 ResearchService（完整 Research Pipeline）；只编排，不复制逻辑。
 */
import type { ResearchService } from "../../research/service";
import type { AgentTool } from "../types";

export interface ResearchToolDeps {
  researchService?: ResearchService;
}

export function createResearchTool(deps: ResearchToolDeps): AgentTool {
  return {
    id: "research_tool",
    name: "研究工具",
    description: "对商机执行完整 Research Pipeline（runResearch）",
    async execute(_ctx, input) {
      const service = deps.researchService;
      if (!service) throw new Error("research_tool 未注入 researchService");
      const { opportunityId, name, description } = (input ?? {}) as {
        opportunityId: string;
        name?: string;
        description?: string;
      };
      if (!opportunityId) throw new Error("research_tool 需要 opportunityId");
      const run = await service.startResearch({
        opportunity: { id: opportunityId, name: name ?? opportunityId, description: description ?? "" },
        materials: [],
      });
      return {
        runId: run.runId,
        status: run.status,
        score: run.report?.score.overall_score,
        sources: run.report?.sources.length ?? 0,
        durationMs: run.stages.reduce((n, s) => n + s.durationMs, 0),
      };
    },
  };
}