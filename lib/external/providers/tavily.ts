/**
 * Tavily IntelligenceProvider（骨架，V0.4.1 Phase 6.2-A）。
 * 接口就绪，暂不接入商业数据源：
 * - 未配置 TAVILY_API_KEY → isConfigured()=false，路由自动跳过
 * - 配置后按 https://docs.tavily.com 实现 search / read
 * 禁止硬编码 Key；只从环境变量读取。
 */
import { env } from "../../config/env";
import { ExternalIntelligenceError } from "../errors";
import type { IntelligenceProvider, IntelligenceProviderStatus } from "../types";

export interface TavilyProviderOptions {
  apiKey?: string;
  baseUrl?: string;
}

export function createTavilyProvider(opts: TavilyProviderOptions = {}): IntelligenceProvider {
  const apiKey = opts.apiKey ?? env.tavilyApiKey;
 const configured = Boolean(apiKey);

  return {
    id: "tavily",
    priority: 10,
    status: (configured ? "configured" : "not_configured") as IntelligenceProviderStatus,
    isConfigured: () => configured,
    async search() {
      if (!configured) throw new ExternalIntelligenceError("tavily", "Tavily 未配置（TAVILY_API_KEY 缺失），路由应跳过");
      // TODO(V0.4.2)：接入 Tavily Search API；请求体示例：
      // POST { baseUrl }  { api_key, query, search_depth, max_results, include_raw_content }
      throw new ExternalIntelligenceError("tavily", "Tavily Provider 接口就绪，尚未接入商业数据源", {
        cause: new Error("NOT_IMPLEMENTED"),
      });
    },
  };
}