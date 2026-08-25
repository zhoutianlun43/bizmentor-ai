/**
 * /api/knowledge-candidate（V0.6.1）：AI 从最近对话提取「关于用户的重要信息」。
 * 返回学习候选 { type, content }；用户确认后才进入 Knowledge（AI 不自动学习）。
 */
import { NextResponse } from "next/server";
import { getLlm } from "@/lib/llm";
import type { LlmMessage } from "@/lib/llm/types";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const { messages } = (body ?? {}) as { messages?: LlmMessage[] };
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  try {
    const llm = getLlm();
    const recent = messages.slice(-6).map((m) => `${m.role}: ${m.content}`).join("\n");
    const result = await llm.generate([
      {
        role: "system",
        content: "你是个人商业助手的知识提炼器。从对话中找出「关于用户本人」的重要、可长期记忆的信息，包括：优势/资源、目标、商业偏好、判断方式、行业经验、成功或失败案例。如果没有可提炼的信息，输出 {\"found\":false}。只输出 JSON：{\"found\":true,\"type\":\"habit|judgment_style|industry_experience|success_case|failure_case\",\"content\":\"一句话\"}。类型映射：优势/资源/经验→industry_experience，目标/习惯→habit，判断方式→judgment_style，成功案例→success_case，失败案例→failure_case。不要编造。",
      },
      { role: "user", content: `最近对话：\n${recent}` },
    ]);
    const match = result.content.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : null;
    if (!parsed || parsed.found !== true || !parsed.content) {
      return NextResponse.json({ found: false });
    }
    return NextResponse.json({ found: true, type: parsed.type ?? "habit", content: parsed.content });
  } catch {
    return NextResponse.json({ error: "CANDIDATE_FAILED" }, { status: 500 });
  }
}