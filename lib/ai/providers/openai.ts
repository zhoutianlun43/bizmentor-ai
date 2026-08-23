/**
 * OpenAI Provider（V0.2）。
 * - 仅服务端使用：OPENAI_API_KEY 只存在于服务器环境变量
 * - 负责深度研究 / 复杂推理 / 最终决策类任务
 * - 业务 Agent 禁止直接调用本模块，统一通过 gateway.runAI
 */
import { env } from "../../config/env";
import { postChatCompletion } from "./transport";
import type { ChatProvider, ProviderChatRequest, ProviderChatResponse } from "../types";

export const openaiProvider: ChatProvider = {
  name: "openai",
  async chat(req: ProviderChatRequest): Promise<ProviderChatResponse> {
    return postChatCompletion({
      baseUrl: env.openaiBaseUrl,
      apiKey: env.openaiApiKey,
      provider: "openai",
      model: req.model,
      messages: req.messages,
      temperature: req.temperature,
      maxTokens: req.maxTokens,
      timeoutMs: req.timeoutMs,
    });
  },
};