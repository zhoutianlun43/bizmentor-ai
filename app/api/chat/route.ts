/**
 * /api/chat —— AI 对话入口（V0.6.0 MVP；V0.8.1 对话体验升级）。
 * 浏览器 → BusinessContext（客户端构建）→ 本路由 → LLM（DeepSeek/OpenAI）→ 回复。
 * 角色 = 个人 AI 商业伙伴：默认简洁对话；/深度分析、/商业报告、/市场研究、/机会评估 触发深度输出。
 * API Key 只存在于服务器环境变量；本路由不接收/不返回任何 Key。
 */
import { NextResponse } from "next/server";
import { buildBusinessSystemPrompt, getLlm } from "@/lib/llm";
import { detectChatCommand, stripChatCommand } from "@/lib/llm/commands";
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
    const last = messages[messages.length - 1];
    const command = detectChatCommand(last.content);
    const system = buildBusinessSystemPrompt(context, { deep: command !== null, command });
    // 触发高级指令时：从消息中去掉指令令牌，只把正文交给模型
    const cleaned = command
      ? [
          ...messages.slice(0, -1),
          { ...last, content: stripChatCommand(last.content) || "请基于我的业务上下文进行深入分析" },
        ]
      : messages;
    const result = await llm.generate([{ role: "system", content: system }, ...cleaned]);
    return NextResponse.json({ content: result.content, provider: result.provider, model: result.model });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 200) : "LLM 调用失败";
    return NextResponse.json({ error: "LLM_FAILED", message }, { status: 500 });
  }
}
