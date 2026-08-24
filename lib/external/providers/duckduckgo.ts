/**
 * DuckDuckGo IntelligenceProvider（V0.4.1 Phase 6.2-A）。
 * 包装现有 V0.3-B duckduckgoProvider，作为默认/兜底 Provider（无需 API Key）。
 */
import { duckduckgoProvider } from "../../research/external/duckduckgo";
import type { IntelligenceProvider } from "../types";

export const duckduckgoIntelligenceProvider: IntelligenceProvider = {
  id: "duckduckgo",
  priority: 100,
  status: "configured",
  isConfigured: () => true,
  search: (query, opts) => duckduckgoProvider.search(query, { limit: opts?.limit }),
  read: (url) => duckduckgoProvider.read(url),
  healthCheck: async () => {
    try {
      const results = await duckduckgoProvider.search("health check", { limit: 1 });
      return results.length > 0;
    } catch {
      return false;
    }
  },
};