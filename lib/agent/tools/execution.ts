/**
 * 工具：execution_tool（V0.4.2 Phase 9B-1）。
 * 调用现有 DecisionService（listOverdueTasks / getExecutionSummary）。
 */
import type { DecisionService } from "../../decision/service";
import type { AgentTool } from "../types";

export interface ExecutionToolDeps {
  decisionService?: DecisionService;
}

export function createExecutionTool(deps: ExecutionToolDeps): AgentTool {
  return {
    id: "execution_tool",
    name: "验证执行工具",
    description: "查询超期验证任务（overdue）或执行摘要（summary）",
    async execute(_ctx, input) {
      const service = deps.decisionService;
      if (!service) throw new Error("execution_tool 未注入 decisionService");
      const { action, decisionId } = (input ?? {}) as { action: "overdue" | "summary"; decisionId?: string };
      if (action === "overdue") {
        const overdue = await service.listOverdueTasks(decisionId);
        return { action, overdue: overdue.map((t) => ({ taskId: t.id, assumption: t.assumption, deadline: t.deadline })) };
      }
      if (action === "summary") {
        if (!decisionId) throw new Error("execution_tool summary 需要 decisionId");
        const summary = await service.getExecutionSummary(decisionId);
        return { action, status: summary.status, progress: summary.progress, tasks: summary.tasks.map((t) => ({ taskId: t.taskId, status: t.status, overdue: t.overdue, outcome: t.outcome })) };
      }
      throw new Error(`execution_tool 未知 action：${action}`);
    },
  };
}