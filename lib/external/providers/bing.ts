/**
 * Bing IntelligenceProvider（骨架，V0.4.1 Phase 6.2-A）。
 * 接口就绪，暂不接入商业数据源：
 * - 未配置 BING_API_KEY → isConfigured()=false，路由自动跳过
 * - 配置后按 Bing Web Search API v7 实现 search
 */
import { env } from "../../config/env";
import { ExternalIntelligenceError } from "../errors";
import type { IntelligenceProvider, IntelligenceProviderStatus } from "../types";

export interface BingProviderOptions {
  apiKey?: string;
  baseUrl?: string;
}

export function createBingProvider(opts: BingProviderOptions = {}): IntelligenceProvider {
  const apiKey = opts.apiKey ?? env.bingApiKey;
 const configured = Boolean(apiKey);

  return {
    id: "bing",
    priority: 20,
    status: (configured ? "configured" : "not_configured") as IntelligenceProviderStatus,
    isConfigured: () => configured,
    async search() {
      if (!configured) throw new ExternalIntelligenceError("bing", "Bing 未配置（BING_API_KEY 缺失），路由应跳过");
      // TODO(V0.4.2)：接入 Bing Web Search API；请求头 Ocp-Apim-Subscription-Key: <apiKey>
      throw new ExternalIntelligenceError("bing", "Bing Provider 接口就绪，尚未接入商业数据源", {
        cause: new Error("NOT_IMPLEMENTED"),
      });
    },
  };
}