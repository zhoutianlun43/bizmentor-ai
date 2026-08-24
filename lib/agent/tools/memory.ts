/**
 * 工具：memory_tool（V0.4.2 Phase 9B-1）。
 * 调用现有 MemoryEngine（retrievePatterns / findSimilarDecisions）。
 */
import type { MemoryEngine } from "../../memory/service";
import type { AgentTool } from "../types";

export interface MemoryToolDeps {
  memoryEngine?: MemoryEngine;
}

export function createMemoryTool(deps: MemoryToolDeps): AgentTool {
  return {
    id: "memory_tool",
    name: "记忆工具",
    description: "检索历史模式（patterns）或相似决策（similar）",
    async execute(ctx, input) {
      const engine = deps.memoryEngine;
      if (!engine) throw new Error("memory_tool 未注入 memoryEngine");
      const { action, query, opportunity } = (input ?? {}) as {
        action: "patterns" | "similar";
        query?: Parameters<MemoryEngine["retrieve"]>[0];
        opportunity?: { domain?: string; name: string; description?: string };
      };
      if (action === "patterns") {
        const patterns = await engine.retrieve(query ?? {});
        return { action, patterns: patterns.map((p) => ({ domain: p.domain, decision: p.decision, count: p.count, confirmRate: p.confirmRate, commonLessons: p.commonLessons })) };
      }
      if (action === "similar") {
        const target = opportunity ?? (ctx.activeOpportunity ? { name: ctx.activeOpportunity.name, domain: undefined } : undefined);
        if (!target) throw new Error("memory_tool similar 需要 opportunity 或 activeOpportunity");
        const similar = await engine.similar(target);
        return { action, similar: similar.map((r) => ({ decisionId: r.decisionId, opportunityName: r.opportunityName, outcome: r.outcome, domain: r.domain })) };
      }
      throw new Error(`memory_tool 未知 action：${action}`);
    },
  };
}