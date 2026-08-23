/**
 * 未来 AI 模型路由配置（V0.1 仅占位，不调用任何真实模型）。
 * 设计原则：模型名称集中在环境变量 / 配置中，禁止硬编码进大量业务代码，便于未来随时替换。
 * 简单任务 → GPT-5.6 Luna；普通商业研究 → GPT-5.6 Terra；复杂商业推理 → GPT-5.6 Sol。
 */
export type AiTaskTier = "simple" | "research" | "reasoning";

export const aiModels = {
  simple: process.env.AI_MODEL_SIMPLE ?? "gpt-5.6-luna",
  research: process.env.AI_MODEL_RESEARCH ?? "gpt-5.6-terra",
  reasoning: process.env.AI_MODEL_REASONING ?? "gpt-5.6-sol",
} as const;

/** 根据任务复杂度返回模型名（未来由 AI Router 调用） */
export function resolveModel(tier: AiTaskTier): string {
  return aiModels[tier];
}