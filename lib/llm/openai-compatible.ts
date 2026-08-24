/**
 * OpenAI Compatible Provider（V0.6.0 MVP）。
 * 兼容任何 OpenAI Chat Completions 接口（OpenAI / 自建 / 中转）。
 */
import { env } from "../config/env";
import type { LlmMessage, LlmProvider, LlmResponse } from "./types";

export interface OpenAICompatibleProviderOptions {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export function createOpenAICompatibleProvider(opts: OpenAICompatibleProviderOptions = {}): LlmProvider {
  const apiKey = opts.apiKey ?? env.openaiApiKey;
  const baseUrl = (opts.baseUrl ?? env.openaiBaseUrl).replace(/\/$/, "");
  const model = opts.model ?? env.openaiResearchModel;

  return {
    id: "openai-compatible",
    async generate(messages: LlmMessage[]): Promise<LlmResponse> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 60000);
      let response: Response;
      try {
        response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model, messages, temperature: 0.6 }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
      if (!response.ok) throw new Error(`LLM HTTP ${response.status}`);
      const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== "string" || content.length === 0) throw new Error("LLM 空响应");
      return { content, provider: this.id, model };
    },
  };
}