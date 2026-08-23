"use client";

/**
 * 客户端 AI 适配器：把 AI 调用转发到服务端 /api/ai 路由。
 * API Key 只存在于服务端，浏览器永不接触 Key。
 */
import type { AiResult, AiTask } from "../ai/types";
import type { RunAiFn } from "./ai-call";

export function createApiRunAi(baseUrl = "/api/ai"): RunAiFn {
  return async (task: AiTask): Promise<AiResult> => {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`AI API 调用失败 HTTP ${response.status}${body ? `: ${body.slice(0, 120)}` : ""}`);
    }
    return (await response.json()) as AiResult;
  };
}