/**
 * 默认模型路由表（V0.2 多 Provider 架构）。
 * 规则：模型名称必须来自环境变量 / 配置文件，禁止硬编码进业务代码，便于随时替换。
 * simple → DeepSeek；research → OpenAI Research；reasoning → OpenAI Reasoning。
 */
import type { AiCapability, AiProviderName } from "../ai/types";

/** 一条模型路由：Provider + 具体模型 */
export interface ModelRoute {
  provider: AiProviderName;
  model: string;
}

export const DEFAULT_MODEL_ROUTING: Record<AiCapability, ModelRoute> = {
  simple: {
    provider: "deepseek",
    model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
  },
  research: {
    provider: "openai",
    model: process.env.OPENAI_RESEARCH_MODEL ?? "gpt-5.6-terra",
  },
  reasoning: {
    provider: "openai",
    model: process.env.OPENAI_REASONING_MODEL ?? "gpt-5.6-sol",
  },
};