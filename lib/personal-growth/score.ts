/**
 * 成长评分系统（V1.0）：每日生成 Growth Score（100 分制，6 维度）。
 * 优先使用 LLM 结构化评分；失败时用确定性规则兜底（零额外成本、稳定可测）。
 */
import type { DailyReview, GrowthScore } from "./types";

/** 简单文本情绪分（0-100）：正面词加分、负面词减分 */
function moodScore(text: string): number {
  const positive = ["好", "开心", "充实", "顺利", "满意", "积极", "平静", "专注", "兴奋", "成就感", "棒"];
  const negative = ["累", "焦虑", "沮丧", "烦躁", "压力", "疲惫", "崩溃", "拖延", "低落", "生气", "迷茫", "失眠"];
  let score = 70;
  for (const w of positive) if (text.includes(w)) score += 5;
  for (const w of negative) if (text.includes(w)) score -= 7;
  return Math.max(10, Math.min(98, score));
}

/** 文本深度分：长度与结构化关键词 */
function depthScore(text: string, keywords: string[]): number {
  const t = text ?? "";
  let s = Math.min(30, Math.floor(t.length / 12));
  for (const k of keywords) if (t.includes(k)) s += 12;
  return Math.min(98, s);
}

/** 确定性兜底评分（LLM 不可用时） */
export function computeFallbackScore(review: Pick<DailyReview, "plan" | "execution" | "reflection" | "mood" | "problems">): GrowthScore {
  const cognitive = depthScore(review.reflection, ["原因", "模式", "认知", "复盘", "学到", "洞察", "为什么"]);
  const execution = depthScore(review.execution, ["完成", "做了", "推进", "搞定", "交付", "执行"]) + (review.plan ? 20 : 0);
  const emotional = moodScore(review.mood + review.reflection);
  const learning = depthScore(review.problems + review.reflection, ["学习", "方法", "改进", "不足", "问题", "反馈"]) + (review.reflection ? 15 : 0);
  const health = moodScore(review.mood) - (review.mood.includes("失眠") || review.mood.includes("累") ? 15 : 0);
  const value = 70 + (review.reflection.length > 40 ? 10 : 0) + (review.problems ? -5 : 5);

  const dims = [
    { name: "认知成长", score: clamp(cognitive) },
    { name: "执行能力", score: clamp(execution) },
    { name: "情绪稳定", score: clamp(emotional) },
    { name: "学习成长", score: clamp(learning) },
    { name: "身体状态", score: clamp(health) },
    { name: "长期价值", score: clamp(value) },
  ];
  const overall = Math.round(dims.reduce((s, d) => s + d.score, 0) / dims.length);
  const sorted = [...dims].sort((a, b) => a.score - b.score);
  return {
    overall,
    dimensions: dims,
    strengths: dims.filter((d) => d.score >= 75).map((d) => `${d.name}表现良好（${d.score}）`),
    weaknesses: dims.filter((d) => d.score < 60).map((d) => `${d.name}偏弱（${d.score}）`),
    improvement: sorted.slice(0, 2).map((d) => `优先提升「${d.name}」：${improveHint(d.name)}`),
  };
}

function improveHint(name: string): string {
  const hints: Record<string, string> = {
    认知成长: "每天复盘时追问「为什么」，记录一个模式洞察",
    执行能力: "把明日目标拆成 3 个可勾选的小任务",
    情绪稳定: "记录情绪触发点，练习 3 次深呼吸",
    学习成长: "每天 20 分钟刻意练习 + 一次主动反馈",
    身体状态: "固定睡眠时间 + 每天 15 分钟运动",
    长期价值: "每周回顾一次五年/十年目标对齐情况",
  };
  return hints[name] ?? "设定一个可量化的小目标并跟踪";
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** 校验/归一化 LLM 结构化评分（防止幻觉越界） */
export function normalizeScore(raw: unknown): GrowthScore | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const overall = typeof o.overall === "number" ? clamp(o.overall) : undefined;
  const dims = Array.isArray(o.dimensions)
    ? (o.dimensions as Record<string, unknown>[]).filter((d) => d && typeof d === "object" && typeof d.name === "string")
        .map((d) => ({ name: String(d.name).slice(0, 12), score: typeof d.score === "number" ? clamp(d.score) : 0, note: typeof d.note === "string" ? d.note.slice(0, 60) : undefined }))
        .slice(0, 8)
    : [];
  if (!dims.length) return undefined;
  const total = dims.reduce((s, d) => s + d.score, 0);
  return {
    overall: overall ?? Math.round(total / dims.length),
    dimensions: dims,
    strengths: Array.isArray(o.strengths) ? o.strengths.filter((x): x is string => typeof x === "string").slice(0, 4) : [],
    weaknesses: Array.isArray(o.weaknesses) ? o.weaknesses.filter((x): x is string => typeof x === "string").slice(0, 4) : [],
    improvement: Array.isArray(o.improvement) ? o.improvement.filter((x): x is string => typeof x === "string").slice(0, 4) : [],
  };
}
