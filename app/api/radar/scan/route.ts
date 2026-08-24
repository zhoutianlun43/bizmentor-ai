/**
 * /api/radar/scan —— AI 商业雷达扫描（V0.8）。
 * 浏览器 → 本路由 → LLM（DeepSeek/OpenAI）→ 跨行业机会情报 → RadarFinding[]。
 * 行业无关：科技/消费/服务/制造/贸易/互联网/AI 应用等。
 */
import { NextResponse } from "next/server";
import { getLlm } from "@/lib/llm";
import { buildRadarScanPrompt, parseRadarReport } from "@/lib/radar";

export async function POST() {
  try {
    const llm = getLlm();
    const { system, user } = buildRadarScanPrompt(5);
    const result = await llm.generate([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);
    const scannedAt = new Date().toISOString();
    const findings = parseRadarReport(result.content, scannedAt);
    return NextResponse.json({
      date: scannedAt.slice(0, 10),
      provider: result.provider,
      model: result.model,
      summary: `今日发现 ${findings.length} 个商业机会`,
      findings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 200) : "扫描失败";
    return NextResponse.json({ error: "RADAR_SCAN_FAILED", message }, { status: 500 });
  }
}