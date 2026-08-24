/**
 * External Intelligence Layer 工厂（V0.4.1 Phase 6.2-A）。
 * - createExternalIntelligence(providers?)：任意 Provider 列表 → Layer
 * - createDefaultExternalIntelligence()：按 env.EXTERNAL_INTELLIGENCE_PROVIDERS 顺序构建
 * - createExternalResearchFn(layer?)：生成 Pipeline 兼容的 ExternalResearchFn（不改主流程）
 */
import { env } from "../config/env";
import { readWebPage } from "../research/external/http-reader";
import type {
  ExternalResearchFn,
  ExternalResearchInput,
  ExternalResearchOutput,
} from "../research/external/types";
import type { SourceDocument } from "../research/types";
import { ExternalIntelligenceError } from "./errors";
import { createBingProvider } from "./providers/bing";
import { duckduckgoIntelligenceProvider } from "./providers/duckduckgo";
import { createGoogleProvider } from "./providers/google";
import { createTavilyProvider } from "./providers/tavily";
import { IntelligenceRegistry } from "./registry";
import { routeRead, routeSearch } from "./router";
import type { ExternalIntelligenceLayer, ExtractedDocument, IntelligenceProvider } from "./types";

const PROVIDER_BUILDERS: Record<string, () => IntelligenceProvider> = {
  duckduckgo: () => duckduckgoIntelligenceProvider,
  tavily: () => createTavilyProvider(),
  bing: () => createBingProvider(),
  google: () => createGoogleProvider(),
};

export function createExternalIntelligence(providers: IntelligenceProvider[]): ExternalIntelligenceLayer {
  const registry = new IntelligenceRegistry(providers);

  return {
    providers: () => registry.list(),
    enabled: () => registry.enabled(),
    get: (id) => registry.get(id),
    async search(query, opts) {
      const candidates = registry.enabled();
      if (candidates.length === 0) {
        throw new ExternalIntelligenceError("none", "没有已配置的外部情报 Provider");
      }
      return routeSearch(candidates, query, opts);
    },
    async read(url, opts) {
      const candidates = registry.enabled();
      if (candidates.length === 0) {
        // 无 Provider 时用通用 reader 兜底
        return readWebPage(url, { timeoutMs: opts?.timeoutMs });
      }
      return routeRead(candidates, url, opts);
    },
    createResearchFn() {
      return createExternalResearchFn(this);
    },
  };
}

/** 按 env 顺序构建默认 Layer（未来配 Tavily/Bing/Google Key 后自动生效） */
export function createDefaultExternalIntelligence(): ExternalIntelligenceLayer {
  const ids = env.externalIntelligenceProviders;
  const providers: IntelligenceProvider[] = [];
  for (const id of ids) {
    const builder = PROVIDER_BUILDERS[id];
    if (builder) providers.push(builder());
    // 未知 id：忽略（不因配置笔误而崩溃）
  }
  return createExternalIntelligence(providers);
}

/**
 * 生成 Research Pipeline 兼容的 ExternalResearchFn。
 * - 搜索：走 Layer 路由（多 Provider + fallback）
 * - 读取：Layer.read（Provider.read 链 → 通用 reader 兜底）
 * - 失败：不抛错，返回空结果（Pipeline 会标记「证据不足」，禁止伪造）
 */
export function createExternalResearchFn(layer?: ExternalIntelligenceLayer): ExternalResearchFn {
  const l = layer ?? createDefaultExternalIntelligence();
  return async (input: ExternalResearchInput): Promise<ExternalResearchOutput> => {
    const limit = input.limit ?? env.externalSearchLimit;
    let results: ExternalResearchOutput["searches"][number]["results"] = [];
    try {
      const outcome = await l.search(input.query, { limit });
      results = outcome.results;
    } catch {
      // 搜索失败：返回空结果（上层标记证据不足）
    }

    const readLimit = Math.min(results.length, env.externalReadLimit);
    const documents: SourceDocument[] = [];
    for (const r of results.slice(0, readLimit)) {
      try {
        const doc: ExtractedDocument = await l.read(r.url);
        documents.push(doc);
      } catch {
        // 单页读取失败：跳过，不影响整体
      }
    }

    return {
      searches: [
        {
          taskId: "",
          area: input.area,
          query: input.query,
          results,
          documents,
        },
      ],
      documents,
    };
  };
}