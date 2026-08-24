/**
 * DuckDuckGo Provider（V0.3-B 首个稳定实现，无需 API Key）。
 * - search：html.duckduckgo.com/html/ 结果解析（标题/URL/摘要/站点）
 * - read：通用网页读取（http-reader）
 *
 * 注意：
 * - 搜索结果只是候选，不是事实
 * - 部分环境（如中国大陆）需要服务端代理（NODE_USE_ENV_PROXY + HTTPS_PROXY）
 */
import { env } from "../../config/env";
import { classifySourceType } from "../../external/standardize";
import { readWebPage } from "./http-reader";
import type { ExternalResearchProvider, ExternalSearchResult, ExtractedDocument } from "./types";

const SEARCH_URL = "https://html.duckduckgo.com/html/";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function decodeRedirectUrl(href: string): string {
  // DDG 结果链接为 //duckduckgo.com/l/?uddg=<encoded>
  try {
    const m = href.match(/[?&]uddg=([^&]+)/);
    if (m) return decodeURIComponent(m[1]);
    return href.startsWith("//") ? `https:${href}` : href;
  } catch {
    return href;
  }
}

/** 解析 DDG HTML 结果页 */
export function parseDuckDuckGoHtml(html: string): ExternalSearchResult[] {
  const results: ExternalSearchResult[] = [];
  const blocks = html.split(/<div class="result\s/i);
  for (const block of blocks.slice(1)) {
    const titleMatch = block.match(/<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    const snippetMatch = block.match(/<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);
    const urlMatch = block.match(/<a[^>]+class="result__url"[^>]*>([\s\S]*?)<\/a>/i);
    if (!titleMatch) continue;
    const title = stripTags(titleMatch[2]).trim();
    const url = decodeRedirectUrl(titleMatch[1]);
    const snippet = snippetMatch ? stripTags(snippetMatch[1]).trim() : "";
    const publisher = urlMatch ? stripTags(urlMatch[1]).trim() : hostname(url);
    if (!url || url.startsWith("javascript:")) continue;
    results.push({
      title,
      url,
      snippet,
      publisher,
      sourceType: classifySourceType(url),
      retrievedAt: new Date().toISOString(),
    });
  }
  return results;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

export const duckduckgoProvider: ExternalResearchProvider = {
  id: "duckduckgo",
  async search(query, opts = {}) {
    const limit = opts.limit ?? env.externalSearchLimit;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), env.externalTimeoutMs);
    try {
      const params = new URLSearchParams({ q: query, kl: "cn-zh" });
      const response = await fetch(`${SEARCH_URL}?${params}`, {
        headers: { "User-Agent": USER_AGENT, "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8" },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`DDG search HTTP ${response.status}`);
      }
      const html = await response.text();
      return parseDuckDuckGoHtml(html).slice(0, limit);
    } finally {
      clearTimeout(timer);
    }
  },
  async read(url: string): Promise<ExtractedDocument> {
    return readWebPage(url, { timeoutMs: env.externalTimeoutMs });
  },
};