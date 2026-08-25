/**
 * /api/external-research —— 服务端外部研究代理（V1.1.1 修复）。
 * 浏览器 → Next.js Server → External Intelligence Layer（env 配置：tavily,duckduckgo 等，带 fallback）。
 * 修复：此前只接 DuckDuckGo（被反爬返回 202 → 0 结果）；现改用新情报层，Tavily 直连返回真实来源。
 * 搜索结果只是候选；网页读取返回元数据与正文；来源可追溯。
 */
import { NextResponse } from "next/server";
import { createExternalResearchFn } from "@/lib/external";
import type { ResearchArea } from "@/lib/research";

const VALID_AREAS = new Set([
  "definition", "problem", "targetUser", "painPoint", "demandStrength", "market",
  "competition", "willingnessToPay", "businessModel", "moat", "risk", "mvp",
  "validation", "score", "nextAction",
]);

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const b = body as { query?: unknown; area?: unknown; limit?: unknown };
  if (typeof b.query !== "string" || b.query.trim().length === 0) {
    return NextResponse.json({ error: "INVALID_QUERY" }, { status: 400 });
  }
  if (typeof b.area !== "string" || !VALID_AREAS.has(b.area)) {
    return NextResponse.json({ error: "INVALID_AREA" }, { status: 400 });
  }

  try {
    // 新情报层：按 env.EXTERNAL_INTELLIGENCE_PROVIDERS 顺序（tavily → duckduckgo 兜底）
    const external = createExternalResearchFn();
    const limit = typeof b.limit === "number" && b.limit > 0 ? Math.min(b.limit, 10) : undefined;
    const out = await external({ query: b.query, area: b.area as ResearchArea, limit });
    return NextResponse.json(out);
  } catch (error) {
    const message = (error as Error).message?.slice(0, 200) ?? "外部研究失败";
    return NextResponse.json({ error: "EXTERNAL_RESEARCH_FAILED", message }, { status: 502 });
  }
}
