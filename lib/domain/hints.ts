/**
 * 领域提示注入（V0.4.1 Phase 6.1B）。
 * 把领域画像中的研究提示/搜索关键词注入到 Prompt（不改模板，直接拼接到 user 消息前）。
 */
import { getDomainProfile } from "./registry";
import type { DomainDetection } from "./types";

/** 生成领域提示文本（unknown / 未传入 → 空串，零行为变化） */
export function domainHintsText(domain: DomainDetection | undefined): string {
  if (!domain || domain.domain === "unknown") return "";
  const profile = getDomainProfile(domain.domain);
  const parts: string[] = [`【领域：${profile.label}】`];
  if (profile.researchHints) parts.push(profile.researchHints);
  if (profile.searchQueryHints) parts.push(`外部搜索关键词建议：${profile.searchQueryHints}`);
  return parts.join("\n");
}