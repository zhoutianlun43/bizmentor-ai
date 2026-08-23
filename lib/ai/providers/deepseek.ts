/**
 * DeepSeek Provider（V0.2）。
 * - 仅服务端使用：DEEPSEEK_API_KEY 只存在于服务器环境变量
 * - 负责低成本任务：摘要 / 分类 / 结构化 / 商机初筛 / 简单研究 / 普通训练题评分等
 * - 业务 Agent 禁止直接调用本模块，统一通过 gateway.runAI
 */
import { env } from "../../config/env";
import { postChatCompletion } from "./transport";
import type { ChatProvider, ProviderChatRequest, ProviderChatResponse } from "../types";

export const deepseekProvider: ChatProvider = {
  name: "deepseek",
  async chat(req: ProviderChatRequest): Promise<ProviderChatResponse> {
    return postChatCompletion({
      baseUrl: env.deepseekBaseUrl,
      apiKey: env.deepseekApiKey,
      provider: "deepseek",
      model: req.model,
      messages: req.messages,
      temperature: req.temperature,
      maxTokens: req.maxTokens,
      timeoutMs: req.timeoutMs,
    });
  },
};