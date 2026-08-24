/**
 * LLM Provider 入口（V0.6.0 MVP）。
 * getLlm()：按配置返回 DeepSeek / OpenAI-compatible；都未配置时抛错（服务端调用）。
 * buildBusinessSystemPrompt()：把 BusinessOSContext 转成个性化 system 提示（不是固定模板）。
 */
import { env } from "../config/env";
import { createDeepSeekProvider } from "./deepseek";
import { createOpenAICompatibleProvider } from "./openai-compatible";
import type { BusinessOSContext } from "../context/types";
import type { LlmProvider } from "./types";

let cachedLlm: LlmProvider | undefined;

/** 获取可用 LLM Provider（DeepSeek 优先，其次 OpenAI；未配置抛错） */
export function getLlm(): LlmProvider {
  if (cachedLlm) return cachedLlm;
  if (env.deepseekApiKey) {
    cachedLlm = createDeepSeekProvider();
  } else if (env.openaiApiKey) {
    cachedLlm = createOpenAICompatibleProvider();
  } else {
    throw new Error("未配置 LLM API Key（DEEPSEEK_API_KEY / OPENAI_API_KEY）");
  }
  return cachedLlm;
}

/** 测试用：重置单例 */
export function __resetLlm(): void {
  cachedLlm = undefined;
}

/** 把经营上下文转成个性化 system 提示（不含模板化套话；只注入真实用户画像） */
export function buildBusinessSystemPrompt(ctx: BusinessOSContext | undefined): string {
  if (!ctx) return "你是 BizMentor，一位个人商业助手。";
  const lines: string[] = ["你是 BizMentor，用户的个人商业 AI 助手。基于以下用户经营上下文回答："];
  if (ctx.personalProfile?.name) lines.push(`- 用户：${ctx.personalProfile.name}`);
  if (ctx.businessProfile?.name) {
    lines.push(`- 经营：${ctx.businessProfile.name}${ctx.businessProfile.businessTypes.length ? `（${ctx.businessProfile.businessTypes.join("、")}）` : ""}`);
  }
  if (ctx.businessProfile?.description) lines.push(`- 经营描述：${ctx.businessProfile.description}`);
  const prefs = Object.entries(ctx.preferences)
    .filter(([, v]) => typeof v === "string" || typeof v === "number" || typeof v === "boolean")
    .map(([k, v]) => `${k}=${String(v)}`);
  if (prefs.length) lines.push(`- 偏好：${prefs.join("，")}`);
  if (ctx.confirmedKnowledge.length) {
    lines.push(`- 用户的长期认知（已确认）：`);
    for (const k of ctx.confirmedKnowledge.slice(0, 12)) lines.push(`  · [${k.type}] ${k.content}`);
  }
  if (ctx.memoryPatterns.length) {
    lines.push(`- 历史模式：`);
    for (const p of ctx.memoryPatterns.slice(0, 5)) {
      const rate = p.confirmRate === null ? "暂无验证" : `${Math.round(p.confirmRate * 100)}% 验证率`;
      lines.push(`  · ${p.domain ?? "全部"} ${p.decision ?? ""}（${p.count} 条，${rate}）`);
    }
  }
  if (ctx.activeProjects.length) {
    lines.push(`- 当前业务状态：${ctx.activeProjects.length} 个商机在册`);
  }
  lines.push("回答要基于上述真实上下文；不要编造用户没有的信息；结论区分事实与需验证。");
  return lines.join("\n");
}

export type { LlmContext, LlmMessage, LlmProvider, LlmRequest, LlmResponse } from "./types";