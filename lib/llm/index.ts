/**
 * LLM Provider 入口（V0.6.0 MVP；V0.8.1 对话体验升级）。
 * getLlm()：按配置返回 DeepSeek / OpenAI-compatible；都未配置时抛错（服务端调用）。
 * buildBusinessSystemPrompt()：把 BusinessOSContext 转成个性化 system 提示（不是固定模板）。
 * 角色 = 个人 AI 商业伙伴：默认简洁对话（300-800 字）；用户主动触发高级指令时输出详细内容。
 */
import { env } from "../config/env";
import { createDeepSeekProvider } from "./deepseek";
import { createOpenAICompatibleProvider } from "./openai-compatible";
import type { BusinessOSContext } from "../context/types";
import type { LlmProvider } from "./types";
import type { ChatCommand } from "./commands";

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

export interface SystemPromptOptions {
  /** 用户主动触发高级指令（/深度分析 等）→ 允许输出更详细内容 */
  deep?: boolean;
  /** 具体高级指令（用于针对性输出引导） */
  command?: ChatCommand | null;
}

const COMMAND_GUIDANCE: Record<ChatCommand, string> = {
  deep: "用户本次明确要求「深度分析」：围绕问题输出结构化、有深度的分析。",
  report: "用户本次明确要求「商业报告」：输出一份结构化、可直接使用的商业报告。",
  market: "用户本次明确要求「市场研究」：输出市场环境、趋势、机会与风险的简要研究。",
  evaluate: "用户本次明确要求「机会评估」：对目标机会给出评估结论、理由与建议。",
};

/** 把经营上下文转成个性化 system 提示（角色 = 个人 AI 商业伙伴，默认轻量对话） */
export function buildBusinessSystemPrompt(
  ctx: BusinessOSContext | undefined,
  opts: SystemPromptOptions = {},
): string {
  const lines: string[] = [
    "你是用户的个人AI商业伙伴（BizMentor AI）。",
    "你的任务不是输出报告，而是陪伴用户进行商业判断。",
    "",
    "工作方式：",
    "1. 先理解用户问题",
    "2. 给出简洁判断",
    "3. 提出关键追问",
    "4. 根据上下文逐步深入",
    "",
    "回复要求：",
    "- 默认回复控制在 300-800 字，像 ChatGPT/DeepSeek 一样自然对话：简洁、口语化、直接",
    "- 不要默认输出长篇报告",
    "- 除非用户明确要求深度内容（/深度分析、/商业报告、/市场研究、/机会评估），否则保持轻量交互",
  ];
  if (ctx) {
    lines.push("", "以下是你对用户的真实了解（来自用户画像与长期记忆）：");
    const who: string[] = [];
    if (ctx.personalProfile?.name) who.push(ctx.personalProfile.name);
    if (ctx.personalProfile?.timezone) who.push(ctx.personalProfile.timezone);
    const role = ctx.personalProfile?.preferences?.role;
    if (typeof role === "string" && role.trim()) who.push(role);
    if (who.length) lines.push(`- 用户：${who.join("，")}`);

    if (ctx.businessProfile?.name) {
      const types = ctx.businessProfile.businessTypes.length ? `（${ctx.businessProfile.businessTypes.join("、")}）` : "";
      lines.push(`- 经营：${ctx.businessProfile.name}${types}`);
    }
    if (ctx.businessProfile?.description) lines.push(`- 产品/服务：${ctx.businessProfile.description}`);
    const goal = ctx.businessProfile?.preferences?.goal;
    if (typeof goal === "string" && goal.trim()) lines.push(`- 用户目标：${goal}`);

    const prefs = Object.entries(ctx.preferences)
      .filter(([, v]) => typeof v === "string" || typeof v === "number" || typeof v === "boolean")
      .map(([k, v]) => `${k}=${String(v)}`)
      .filter((s) => !s.startsWith("goal=") && !s.startsWith("role="));
    if (prefs.length) lines.push(`- 偏好：${prefs.join("，")}`);

    if (ctx.confirmedKnowledge.length) {
      lines.push("- 已验证的长期认知（用户确认过的行业经验/判断方式/优势/资源/目标/案例）：");
      for (const k of ctx.confirmedKnowledge.slice(0, 12)) lines.push(`  · [${k.type}] ${k.content}`);
    }
    if (ctx.memoryPatterns.length) {
      lines.push("- 历史决策模式（过去决策统计）：");
      for (const p of ctx.memoryPatterns.slice(0, 5)) {
        const rate = p.confirmRate === null ? "暂无验证" : `${Math.round(p.confirmRate * 100)}% 验证率`;
        const lessons = p.commonLessons.length ? `；经验：${p.commonLessons.slice(0, 3).join("、")}` : "";
        lines.push(`  · ${p.domain ?? "全部"} ${p.decision ?? ""}（${p.count} 条，${rate}${lessons}）`);
      }
    }
    if (ctx.activeProjects.length) {
      lines.push(`- 当前业务状态：${ctx.activeProjects.length} 个商机在册`);
    }
    lines.push(
      "",
      "回答原则：",
      "- 回答要体现「我了解你的情况」，基于上面真实上下文，不要编造用户没有的信息",
      "- 结论区分事实与需验证",
      "- 信息不足时主动提问补齐，不要强行输出长篇",
    );
  } else {
    lines.push("", "回答要基于用户实际情况，不要编造；信息不足时主动提问。");
  }

  if (opts.command && COMMAND_GUIDANCE[opts.command]) lines.push("", COMMAND_GUIDANCE[opts.command]);
  else if (opts.deep) lines.push("", "【深度模式】用户本次要求深入内容，可以输出更详细的结构化分析（仍围绕用户问题，不要泛泛而谈）。");

  return lines.join("\n");
}

export type { LlmContext, LlmMessage, LlmProvider, LlmRequest, LlmResponse } from "./types";
