/**
 * /api/ai —— 服务端 AI 代理路由。
 * 浏览器 → Next.js Server → runAI → Provider（OpenAI/DeepSeek）。
 * API Key 只存在服务器环境变量，本路由不接受、也绝不返回任何 Key。
 * 业务层（Research Engine）在客户端通过 lib/research/api-runai.ts 调用本路由。
 */
import { NextResponse } from "next/server";
import { runAI } from "@/lib/ai/gateway";
import type { AiTask } from "@/lib/ai/types";

const VALID_CAPABILITIES = new Set(["simple", "research", "reasoning"]);

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const b = body as Partial<AiTask>;
  if (
    !b ||
    typeof b.task !== "string" ||
    b.task.trim().length === 0 ||
    typeof b.capability !== "string" ||
    !VALID_CAPABILITIES.has(b.capability)
  ) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  try {
    const task: AiTask = {
      capability: b.capability as AiTask["capability"],
      task: b.task,
      type: b.type as AiTask["type"],
      agent: b.agent ?? "api",
      system: b.system,
      allowDegrade: b.allowDegrade,
      temperature: b.temperature,
      maxTokens: b.maxTokens,
      timeoutMs: b.timeoutMs,
    };
    const result = await runAI(task);
    return NextResponse.json(result);
  } catch (error) {
    // 只返回安全错误信息：错误码 + 截断消息，绝不包含 Key / Authorization
    const code = (error as { code?: string }).code ?? "AI_ERROR";
    const message = (error as Error).message?.slice(0, 200) ?? "AI 调用失败";
    return NextResponse.json({ error: code, message }, { status: 502 });
  }
}