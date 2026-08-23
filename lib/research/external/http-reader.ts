/**
 * 通用网页读取：fetch + 轻量 HTML→文本提取（无第三方解析器）。
 * 返回标题/正文/发布者/抓取时间；失败抛错由调用方转为安全错误。
 */
import type { ExtractedDocument } from "./types";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 BizMentor/0.3";

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html: string): string {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i);
  if (og) return og[1];
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return title ? stripTags(title[1]) : "";
}

export function parsePublisher(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

/** 读取网页并提取元数据与正文（正文截断到 maxChars） */
export async function readWebPage(
  url: string,
  opts: { timeoutMs?: number; maxChars?: number } = {},
): Promise<ExtractedDocument> {
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const maxChars = opts.maxChars ?? 6000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const html = await response.text();
    const title = extractTitle(html);
    const text = stripTags(html).slice(0, maxChars);
    return {
      id: `ext-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: title || url,
      sourceType: "EXTERNAL_WEB",
      content: text,
      url,
      publisher: parsePublisher(url),
      createdAt: new Date().toISOString(),
      retrievedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timer);
  }
}