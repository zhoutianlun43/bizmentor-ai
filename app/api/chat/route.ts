/**
 * /api/chat —— AI 对话入口（V0.6.0 MVP）。
 * 浏览器 → BusinessContext（客户端构建）→ 本路由 → LLM（DeepSeek/OpenAI）→ 回复。
 * API Key 只存在于服务器环境变量；本路由不接收/不返回任何 Key。
 */
import { NextResponse } from "next/server";
import { buildBusinessSystemPrompt, getLlm } from "@/lib/llm";
import type { BusinessOSContext } from "@/lib/context/types";
import type { LlmMessage } from "@/lib/llm/types";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const { messages, context } = (body ?? {}) as { messages?: LlmMessage[]; context?: BusinessOSContext };
  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    messages.some((m) => !m || typeof m.content !== "string" || m.content.trim().length === 0)
  ) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  try {
    const llm = getLlm();
    const system = buildBusinessSystemPrompt(context);
    const result = await llm.generate([{ role: "system", content: system }, ...messages]);
    return NextResponse.json({ content: result.content, provider: result.provider, model: result.model });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 200) : "LLM 调用失败";
    return NextResponse.json({ error: "LLM_FAILED", message }, { status: 500 });
  }
}