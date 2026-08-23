/**
 * Provider 共享的 HTTP 传输层。
 * OpenAI 与 DeepSeek 均提供 OpenAI 兼容的 /chat/completions 接口，
 * 这里统一用 fetch 完成请求，避免在业务代码中直接依赖任何 SDK。
 */
import { AiProviderError } from "../types";
import type { AiMessage, AiProviderName } from "../types";

export interface ChatCompletionResponse {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  raw: unknown;
}

export interface PostChatCompletionParams {
  baseUrl: string;
  apiKey: string;
  provider: AiProviderName;
  model: string;
  messages: AiMessage[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

/** 调用 OpenAI 兼容的 chat/completions 接口并归一化响应 */
export async function postChatCompletion(
  params: PostChatCompletionParams,
): Promise<ChatCompletionResponse> {
  const { baseUrl, apiKey, provider, model, messages, temperature, maxTokens } = params;
  const timeoutMs = params.timeoutMs ?? 60_000;

  if (!apiKey) {
    const envName = provider === "openai" ? "OPENAI_API_KEY" : "DEEPSEEK_API_KEY";
    throw new AiProviderError(
      "NOT_CONFIGURED",
      provider,
      `${envName} 未配置（API Key 只允许放在服务端环境变量）`,
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: temperature ?? 0.7,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = (await response.text()).slice(0, 300);
      throw new AiProviderError(
        "HTTP_ERROR",
        provider,
        `${provider} API ${response.status} ${response.statusText}: ${body}`,
      );
    }

    const data = (await response.json()) as Record<string, unknown>;
    const choices = data.choices as Array<{ message?: { content?: unknown } }> | undefined;
    const content = choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new AiProviderError(
        "INVALID_RESPONSE",
        provider,
        `${provider} 响应缺少 choices[0].message.content`,
      );
    }

    const usage = (data.usage ?? {}) as { prompt_tokens?: number; completion_tokens?: number };
    return {
      content,
      model: typeof data.model === "string" ? data.model : model,
      inputTokens: usage.prompt_tokens ?? 0,
      outputTokens: usage.completion_tokens ?? 0,
      raw: data,
    };
  } catch (error) {
    if (error instanceof AiProviderError) throw error;
    const name = (error as Error).name;
    if (name === "AbortError" || name === "TimeoutError") {
      throw new AiProviderError("TIMEOUT", provider, `${provider} 请求超时（>${timeoutMs}ms）`);
    }
    throw new AiProviderError("HTTP_ERROR", provider, `${provider} 网络错误: ${(error as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
}