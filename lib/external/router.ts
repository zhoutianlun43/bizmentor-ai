/**
 * 智能路由 + fallback（V0.4.1 Phase 6.2-A）。
 * - 按 priority 依次尝试 enabled Provider
 * - 主 Provider 失败 → 自动 fallback 到下一个，并标记 degraded
 * - 全部失败 → 抛 ExternalIntelligenceError（附 attempts，供上层安全记录）
 * - 网页读取：优先走各 Provider.read，通用 http-reader 兜底
 */
import { readWebPage } from "../research/external/http-reader";
import { ExternalIntelligenceError, safeMessage } from "./errors";
import type { ExtractedDocument, IntelligenceProvider, IntelligenceSearchOutcome } from "./types";

export async function routeSearch(
  providers: IntelligenceProvider[],
  query: string,
  opts: { limit?: number; timeoutMs?: number } = {},
): Promise<IntelligenceSearchOutcome> {
  const startedAt = Date.now();
  const attempts: IntelligenceSearchOutcome["attempts"] = [];

  for (const provider of providers) {
    const attemptStart = Date.now();
    try {
      const results = await provider.search(query, opts);
      attempts.push({ provider: provider.id, ok: true, durationMs: Date.now() - attemptStart });
      return {
        query,
        results,
        provider: provider.id,
        degraded: attempts.some((a) => !a.ok),
        attempts,
        durationMs: Date.now() - startedAt,
      };
    } catch (error) {
      attempts.push({
        provider: provider.id,
        ok: false,
        error: safeMessage(error),
        durationMs: Date.now() - attemptStart,
      });
      // 继续尝试下一个 Provider（fallback）
    }
  }

  const detail = attempts.map((a) => `${a.provider}:${a.ok ? "ok" : "fail"}`).join(" → ");
  throw new ExternalIntelligenceError(
    "all",
    `所有外部情报 Provider 搜索失败（${detail}）`,
    { cause: new Error(attempts.filter((a) => !a.ok).map((a) => a.error).join("; ")) },
  );
}

export async function routeRead(
  providers: IntelligenceProvider[],
  url: string,
  opts: { timeoutMs?: number } = {},
): Promise<ExtractedDocument> {
  const errors: string[] = [];
  for (const provider of providers) {
    if (!provider.read) continue;
    try {
      return await provider.read(url, opts);
    } catch (error) {
      errors.push(`${provider.id}: ${safeMessage(error)}`);
    }
  }
  // 通用 reader 兜底（所有 Provider 失败或均无 read 时）
  try {
    return await readWebPage(url, { timeoutMs: opts.timeoutMs });
  } catch (error) {
    throw new ExternalIntelligenceError("reader", "网页读取失败", { cause: error });
  }
}