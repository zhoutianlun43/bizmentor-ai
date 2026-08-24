/**
 * 搜索结果统一标准化（V0.4.1 Phase 6.2-B）。
 * Tavily / Bing / Google 等 Provider 的原始响应都转成统一 ExternalSearchResult：
 * { title, url, snippet, publisher, sourceType, retrievedAt, provider }
 * 原则：搜索结果不是事实；来源类型按 URL 域名分类（官方/一般）。
 */
import type { ExternalSearchResult } from "../research/external/types";

/** 按 URL 域名分类来源：政府/教育域名 → OFFICIAL_SOURCE，否则 EXTERNAL_WEB */
export function classifySourceType(url: string): ExternalSearchResult["sourceType"] {
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    return "EXTERNAL_WEB";
  }
  // gov/edu 作为独立域名标签（含 .gov.cn / .edu.cn / 子域）
  return /(^|\.)(gov|edu)(\.|$)/i.test(host) ? "OFFICIAL_SOURCE" : "EXTERNAL_WEB";
}

/** 标准化输入（各 Provider 自行映射到本结构） */
export interface StandardSearchInput {
  title: string;
  url: string;
  snippet: string;
  publisher?: string;
  /** 产生结果的 Provider id */
  provider: string;
  sourceType?: ExternalSearchResult["sourceType"];
}

/** 统一构建 ExternalSearchResult（retrievedAt 统一时间戳；provider 打标可追溯） */
export function toExternalSearchResult(input: StandardSearchInput, now = new Date().toISOString()): ExternalSearchResult {
  return {
    title: input.title,
    url: input.url,
    snippet: input.snippet,
    publisher: input.publisher ?? hostname(input.url),
    sourceType: input.sourceType ?? classifySourceType(input.url),
    retrievedAt: now,
    provider: input.provider,
  };
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}