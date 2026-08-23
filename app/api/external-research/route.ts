/**
 * /api/external-research —— 服务端外部研究代理。
 * 浏览器 → Next.js Server → ExternalResearchProvider（当前 DuckDuckGo + 通用网页读取）。
 * 搜索结果只是候选；网页读取返回元数据与正文；来源可追溯。
 */
import { NextResponse } from "next/server";
import { getExternalProvider } from "@/lib/research/external";
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
    const provider = getExternalProvider();
    const limit = typeof b.limit === "number" && b.limit > 0 ? Math.min(b.limit, 10) : undefined;
    const results = await provider.search(b.query, { limit });
    // 读取前 2 条（限制请求量）；读取失败跳过，不中断
    const documents = [];
    for (const r of results.slice(0, 2)) {
      try {
        documents.push(await provider.read(r.url));
      } catch {
        // 单个网页读取失败不影响其他来源
      }
    }
    return NextResponse.json({
      searches: [{ taskId: "", area: b.area as ResearchArea, query: b.query, results, documents }],
      documents,
    });
  } catch (error) {
    const message = (error as Error).message?.slice(0, 200) ?? "外部研究失败";
    return NextResponse.json({ error: "EXTERNAL_RESEARCH_FAILED", message }, { status: 502 });
  }
}