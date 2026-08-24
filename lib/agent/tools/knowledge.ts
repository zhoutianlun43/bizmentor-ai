/**
 * knowledge_tool（V0.4.2 Phase 9B-4）：Agent 调用个人知识（检索已确认 / 捕获候选）。
 * - retrieve：返回已确认 Knowledge（用户是谁/如何判断）
 * - capture：用户输入直接入知识（confirmed=true）
 */
import type { KnowledgeEngine } from "../../knowledge/knowledge-engine";
import type { KnowledgeType } from "../../knowledge/types";
import type { AgentTool } from "../types";

export function createKnowledgeTool(knowledge: KnowledgeEngine): AgentTool {
  return {
    id: "knowledge_tool",
    name: "个人知识工具",
    description: "检索已确认个人知识（retrieve）或捕获用户输入知识（capture）",
    async execute(ctx, input) {
      const { action, type, content } = (input ?? {}) as { action: "retrieve" | "capture"; type?: KnowledgeType; content?: string };
      if (action === "retrieve") {
        const records = await knowledge.confirmed();
        return { action, records: records.map((r) => ({ type: r.type, content: r.content, confidence: r.confidence })) };
      }
      if (action === "capture") {
        if (!content) throw new Error("knowledge_tool capture 需要 content");
        const record = await knowledge.captureFromUserInput({ content, type: type ?? "habit" });
        return { action, record: { id: record.id, type: record.type, content: record.content, confirmed: record.confirmed } };
      }
      throw new Error(`knowledge_tool 未知 action：${action}`);
    },
  };
}