/**
 * Tool Registry（V0.4.2 Phase 9B-1）。
 * 注册/查找/列举 AgentTool；重复 id 抛错。
 */
import type { AgentTool } from "./types";

export class AgentToolRegistry {
  private readonly tools = new Map<string, AgentTool>();

  register(tool: AgentTool): void {
    if (this.tools.has(tool.id)) {
      throw new Error(`工具已注册：${tool.id}`);
    }
    this.tools.set(tool.id, tool);
  }

  registerMany(tools: AgentTool[]): void {
    for (const t of tools) this.register(t);
  }

  get(id: string): AgentTool | undefined {
    return this.tools.get(id);
  }

  has(id: string): boolean {
    return this.tools.has(id);
  }

  list(): AgentTool[] {
    return [...this.tools.values()];
  }
}