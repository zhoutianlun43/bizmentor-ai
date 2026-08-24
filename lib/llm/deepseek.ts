/**
 * DeepSeek Provider（V0.6.0 MVP）。
 * DeepSeek 使用 OpenAI-compatible 接口，仅换 baseUrl/model。
 */
import { env } from "../config/env";
import { createOpenAICompatibleProvider } from "./openai-compatible";
import type { LlmProvider } from "./types";

export function createDeepSeekProvider(): LlmProvider {
  return createOpenAICompatibleProvider({
    apiKey: env.deepseekApiKey,
    baseUrl: env.deepseekBaseUrl,
    model: env.deepseekModel,
  });
}