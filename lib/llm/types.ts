/**
 * LLM Provider 抽象（V0.6.0 MVP）。
 * 产品层对话生成：OpenAI Compatible API + DeepSeek。
 * 不做固定模板：generate(messages, context) 由调用方自由构造消息。
 * 安全：API Key 只从环境变量读取，绝不输出。
 */
import type { BusinessOSContext } from "../context/types";

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** 对话上下文（可选：BusinessOSContext 快照，用于构建个性化 system 提示） */
export interface LlmContext {
  businessContext?: BusinessOSContext;
}

export interface LlmRequest {
  messages: LlmMessage[];
  context?: LlmContext;
}

export interface LlmResponse {
  content: string;
  provider: string;
  model: string;
}

export interface LlmProvider {
  id: string;
  generate(messages: LlmMessage[]): Promise<LlmResponse>;
}