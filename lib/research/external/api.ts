"use client";

/**
 * 客户端外部研究适配器：把搜索/读取转发到服务端 /api/external-research。
 * 外部请求统一走服务端（未来可接需 Key 的搜索 API，且便于走代理）。
 */
import type { ExternalResearchFn } from "./types";

export function createExternalResearchApi(baseUrl = "/api/external-research"): ExternalResearchFn {
  return async (input) => {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: input.query, area: input.area, limit: input.limit }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`外部研究失败 HTTP ${response.status}${body ? `: ${body.slice(0, 120)}` : ""}`);
    }
    return (await response.json()) as Awaited<ReturnType<ExternalResearchFn>>;
  };
}