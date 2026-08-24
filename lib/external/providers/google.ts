/**
 * Google IntelligenceProvider（骨架，V0.4.1 Phase 6.2-A）。
 * 接口就绪，暂不接入商业数据源：
 * - 未配置 GOOGLE_SEARCH_API_KEY / GOOGLE_SEARCH_CX → isConfigured()=false，路由自动跳过
 * - 配置后按 Custom Search JSON API 实现 search
 */
import { env } from "../../config/env";
import { ExternalIntelligenceError } from "../errors";
import type { IntelligenceProvider, IntelligenceProviderStatus } from "../types";

export interface GoogleProviderOptions {
  apiKey?: string;
  cx?: string;
  baseUrl?: string;
}

export function createGoogleProvider(opts: GoogleProviderOptions = {}): IntelligenceProvider {
  const apiKey = opts.apiKey ?? env.googleSearchApiKey;
  const cx = opts.cx ?? env.googleSearchCx;
 const configured = Boolean(apiKey && cx);

  return {
    id: "google",
    priority: 30,
    status: (configured ? "configured" : "not_configured") as IntelligenceProviderStatus,
    isConfigured: () => configured,
    async search() {
      if (!configured) throw new ExternalIntelligenceError("google", "Google 未配置（GOOGLE_SEARCH_API_KEY / CX 缺失），路由应跳过");
      // TODO(V0.4.2)：接入 Custom Search JSON API；GET { baseUrl }?key=&cx=&q=
      throw new ExternalIntelligenceError("google", "Google Provider 接口就绪，尚未接入商业数据源", {
        cause: new Error("NOT_IMPLEMENTED"),
      });
    },
  };
}