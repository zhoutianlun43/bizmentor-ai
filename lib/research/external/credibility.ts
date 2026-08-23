/**
 * 来源可信度（确定性计算，可单测）。
 * 原则：网页内容不是自动可信；不同来源类型/域名具有不同可信度。
 */
import type { SourceCredibility, SourceDocument, SourceReference } from "../types";
export type { SourceCredibility } from "../types";

function hostname(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/** 计算单个来源的可信度 */
export function computeSourceCredibility(doc: Pick<SourceDocument, "sourceType" | "url">): SourceCredibility {
  const host = hostname(doc.url ?? "");
  switch (doc.sourceType) {
    case "OFFICIAL_SOURCE":
      return { score: 0.9, level: "official", reason: "官方来源" };
    case "PLATFORM_DATA":
      return { score: 0.8, level: "high", reason: "平台数据" };
    case "USER_PROVIDED":
      return { score: 0.7, level: "medium", reason: "用户资料" };
    case "EXTERNAL_WEB": {
      if (host.includes("wikipedia.org")) return { score: 0.6, level: "medium", reason: "百科类（需交叉验证）" };
      if (/\.gov\b|\.edu\b|\.gov\.|\.edu\./.test(host)) return { score: 0.85, level: "high", reason: "政府/教育机构" };
      if (/github\.io|medium\.com|blog\.|wordpress/.test(host)) return { score: 0.4, level: "low", reason: "个人博客/自媒体" };
      return { score: 0.5, level: "medium", reason: "一般网站（需交叉验证）" };
    }
    default:
      return { score: 0.4, level: "unknown", reason: "未知来源" };
  }
}

/** 为来源引用附加可信度 */
export function withSourceCredibility(ref: SourceReference): SourceReference & { credibility: SourceCredibility } {
  return {
    ...ref,
    credibility: computeSourceCredibility({ sourceType: ref.sourceType, url: ref.url ?? "" }),
  };
}