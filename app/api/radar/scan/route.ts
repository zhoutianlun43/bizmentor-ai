/**
 * /api/radar/scan —— AI 商业雷达扫描（V0.8；V1.2.1 持久化）。
 * 浏览器 → 本路由 → LLM（DeepSeek/OpenAI）→ 跨行业机会情报 → RadarFinding[]。
 * V1.2.1：生成机会后立即写入数据库（status=discovered，携带 scanId），返回保存结果。
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getLlm } from "@/lib/llm";
import { buildRadarScanPrompt, parseRadarReport } from "@/lib/radar";
import { saveRadarFindings } from "@/lib/radar/service";
import { SupabaseOpportunityRepository } from "@/lib/opportunity/supabase-repository";
import { env } from "@/lib/config/env";
import { getCurrentUserId } from "@/lib/identity";
import { uid } from "@/lib/store/storage";

export async function POST(request: Request) {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // 无 body 也允许
  }
  const { scanId } = (body ?? {}) as { scanId?: string };
  const sid = scanId || uid();

  try {
    const llm = getLlm();
    const { system, user } = buildRadarScanPrompt(5);
    const result = await llm.generate([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);
    const scannedAt = new Date().toISOString();
    const findings = parseRadarReport(result.content, scannedAt);

    // V1.2.1：所有 AI 发现的机会自动写入数据库
    let saved: Array<{ index: number; id: string }> = [];
    if (env.supabaseUrl && env.supabaseAnonKey) {
      const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey);
      const repo = new SupabaseOpportunityRepository(supabase, { userId: getCurrentUserId() });
      const items = await saveRadarFindings(findings, sid, repo);
      saved = items.map((it) => ({ index: it.index, id: it.opportunity.id }));
    }

    return NextResponse.json({
      date: scannedAt.slice(0, 10),
      provider: result.provider,
      model: result.model,
      summary: `今日发现 ${findings.length} 个商业机会`,
      scanId: sid,
      findings,
      saved,
      savedCount: saved.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 200) : "扫描失败";
    return NextResponse.json({ error: "RADAR_SCAN_FAILED", message }, { status: 500 });
  }
}
