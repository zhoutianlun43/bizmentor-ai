/**
 * 工具：decision_tool（V0.4.2 Phase 9B-1）。
 * 调用现有 DecisionService（generateThesis / generateUnitEconomics）。
 */
import type { DecisionService } from "../../decision/service";
import type { AgentTool } from "../types";

export interface DecisionToolDeps {
  decisionService?: DecisionService;
}

export function createDecisionTool(deps: DecisionToolDeps): AgentTool {
  return {
    id: "decision_tool",
    name: "决策工具",
    description: "生成投资论点（thesis）或单位经济模型（unitEconomics）",
    async execute(_ctx, input) {
      const service = deps.decisionService;
      if (!service) throw new Error("decision_tool 未注入 decisionService");
      const { action, opportunityId } = (input ?? {}) as { action: "thesis" | "unitEconomics"; opportunityId: string };
      if (!opportunityId) throw new Error("decision_tool 需要 opportunityId");
      if (action === "thesis") {
        const thesis = await service.generateInvestmentThesis(opportunityId);
        return { action, thesisId: thesis.id, coreHypothesis: thesis.coreHypothesis, confidence: thesis.confidence };
      }
      if (action === "unitEconomics") {
        const model = await service.generateUnitEconomics(opportunityId);
        return { action, domain: model.domain, ltvCac: model.derived.ltvCac, contributionRate: model.derived.contributionRate };
      }
      throw new Error(`decision_tool 未知 action：${action}`);
    },
  };
}