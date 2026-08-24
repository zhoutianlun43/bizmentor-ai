/**
 * Tavily IntelligenceProvider（真实实现，V0.4.1 Phase 6.2-B）。
 * - 未配置 TAVILY_API_KEY → isConfigured()=false，路由自动跳过
 * - 已配置 → 调用 Tavily Search API（POST），结果统一标准化为 ExternalSearchResult
 * - 安全：Key 只从环境变量读取；错误只暴露 HTTP 状态/安全摘要，不暴露响应体
 * 文档：https://docs.tavily.com
 */
import { env } from "../../config/env";
import { ExternalIntelligenceError } from "../errors";
import { classifySourceType, toExternalSearchResult } from "../standardize";
import type { ExternalSearchResult, IntelligenceProvider, IntelligenceProviderStatus } from "../types";

export interface TavilyProviderOptions {
  apiKey?: string;
  baseUrl?: string;
}

interface TavilySearchResponse {
  results?: Array<{ title?: string; url?: string; content?: string; score?: number }>;
  answer?: string;
}

export function createTavilyProvider(opts: TavilyProviderOptions = {}): IntelligenceProvider {
  const apiKey = opts.apiKey ?? env.tavilyApiKey;
  const baseUrl = opts.baseUrl ?? env.tavilyBaseUrl;
  const configured = Boolean(apiKey);

  return {
    id: "tavily",
    priority: 10,
    status: (configured ? "configured" : "not_configured") as IntelligenceProviderStatus,
    isConfigured: () => configured,

    async search(query: string, searchOpts: { limit?: number; timeoutMs?: number } = {}): Promise<ExternalSearchResult[]> {
      if (!configured) {
        throw new ExternalIntelligenceError("tavily", "Tavily 未配置（TAVILY_API_KEY 缺失），路由应跳过");
      }
      const maxResults = Math.min(Math.max(searchOpts.limit ?? env.externalSearchLimit, 1), 10);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), searchOpts.timeoutMs ?? env.externalTimeoutMs);

      let response: Response;
      try {
        response = await fetch(baseUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: apiKey,
            query,
            search_depth: "basic",
            max_results: maxResults,
            include_answer: false,
            include_raw_content: false,
          }),
          signal: controller.signal,
        });
      } catch (error) {
        throw new ExternalIntelligenceError("tavily", "Tavily 请求失败", { cause: error });
      } finally {
        clearTimeout(timer);
      }

      if (!response.ok) {
        // 安全：只暴露 HTTP 状态，不暴露响应体 / Key
        throw new ExternalIntelligenceError("tavily", `Tavily search HTTP ${response.status}`);
      }

      let data: TavilySearchResponse;
      try {
        data = (await response.json()) as TavilySearchResponse;
      } catch (error) {
        throw new ExternalIntelligenceError("tavily", "Tavily 响应解析失败", { cause: error });
      }

      const now = new Date().toISOString();
      return (data.results ?? [])
        .map((r) =>
          toExternalSearchResult(
            {
              title: r.title ?? "",
              url: r.url ?? "",
              snippet: r.content ?? "",
              provider: "tavily",
              sourceType: classifySourceType(r.url ?? ""),
            },
            now,
          ),
        )
        .filter((r) => Boolean(r.url));
    },
  };
}