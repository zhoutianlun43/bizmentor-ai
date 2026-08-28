/**
 * Personal Growth Agent（V1.0）：Personal AI Life CEO。
 * LLM 调用 + 确定性兜底（零额外成本、可测）；知识沉淀自动分类。
 */
import { runAI } from "../ai/gateway";
import { extractJson } from "../research/schema";
import { buildBlueprintTask, buildDailyReviewTask, buildLifeCEOSystemPrompt } from "./prompt";
import { computeFallbackScore, normalizeScore } from "./score";
import { buildDeterministicReport, buildReportContext } from "./report";
import { MODELING_STAGES } from "./questions";
import type {
  DailyReview, GrowthBlueprint, GrowthExpertRole, GrowthInsight, GrowthReport, KnowledgeCategory, KnowledgeEntry, PersonalGrowthBrain,
} from "./types";

// ---------- 确定性工具（可测） ----------

/** 知识沉淀自动分类（01-07） */
export function categorizeKnowledge(text: string): KnowledgeCategory {
  const t = text ?? "";
  if (/(AI 发现|AI 主动|主动扫描|人生洞察)/.test(t)) return "07 人生洞察";
  if (/(性格|优势|弱点|压力|人格|思维模式|决策方式)/.test(t)) return "01 人格档案";
  if (/(价值|目标|五年|十年|愿景|人生方向|战略|长期)/.test(t)) return "02 人生战略";
  if (/(能力|技能|学习计划|训练|瓶颈|提升)/.test(t)) return "03 能力成长";
  if (/(学习方法|知识|课程|读书|笔记|刻意练习)/.test(t)) return "04 学习记录";
  if (/(复盘|今日|今天|执行|计划完成|情绪状态)/.test(t)) return "05 每日复盘";
  if (/(决定|决策|选择|取舍|投入)/.test(t)) return "06 决策记录";
  return "07 人生洞察";
}

/** 建模完成后：从回答确定性提取蓝图（无 LLM 时的兜底，保证画像有数据） */
export function extractBlueprintFallback(answers: string[]): GrowthBlueprint {
  const split = (s: string) => (s || "").split(/[，,、;；。\n]/).map((x) => x.trim()).filter((x) => x.length >= 2).slice(0, 5);
  const a = (i: number) => answers[i] || "";
  return {
    sections: {
      个人画像: a(0) ? `基于访谈：${a(0).slice(0, 60)}…` : "待完善",
      核心优势: split(a(3)).slice(0, 3).length ? split(a(3)).slice(0, 3) : ["待识别"],
      限制因素: split(a(2) + a(3)).slice(3, 6).length ? split(a(2) + a(3)).slice(3, 6) : ["待识别"],
      当前人生阶段判断: a(0) ? "成长与探索阶段（基于访谈推断，可后续校准）" : "待判断",
      核心成长方向: a(2) ? a(2).slice(0, 80) : "待明确",
      "12个月升级路线": [
        { phase: "第1-3月", goal: "自我认知与基线建立", actions: ["完成每日复盘", "明确核心优势与瓶颈"] },
        { phase: "第4-6月", goal: "核心能力突破", actions: ["围绕 1 项能力刻意练习", "每周复盘对齐目标"] },
        { phase: "第7-12月", goal: "成果与复利", actions: ["产出可验证成果", "沉淀为长期优势"] },
      ],
    },
    personality: { traits: split(a(1)).slice(0, 3), strengths: split(a(3)).slice(0, 3), weaknesses: split(a(3)).slice(3, 6), stressPatterns: split(a(1)).slice(3, 6), decisionStyle: a(1).slice(0, 60) || "待完善", summary: a(0) ? a(0).slice(0, 80) : "" },
    strategy: { values: split(a(5)).slice(0, 3), longTermGoal: a(5).slice(0, 80) || "待完善", fiveYearGoal: a(2).slice(0, 80) || "待完善", tenYearDirection: a(5).slice(0, 80) || "待完善" },
    abilities: { current: [{ name: "商业能力", current: 40, target: 70, note: "待校准" }, { name: "学习能力", current: 50, target: 75, note: "待校准" }, { name: "执行能力", current: 45, target: 75, note: "待校准" }, { name: "沟通能力", current: 50, target: 70, note: "待校准" }, { name: "领导能力", current: 40, target: 65, note: "待校准" }], toImprove: split(a(3)).slice(3, 6) },
    motivation: { energizes: split(a(4)).slice(0, 3), drains: split(a(4)).slice(3, 6), sustains: split(a(5)).slice(0, 3) },
  };
}

function str(v: unknown, fb = ""): string {
  return typeof v === "string" && v.trim() ? v.trim() : fb;
}
function strArr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((s) => s.trim()) : [];
}
function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/** 归一化 LLM 蓝图输出 */
export function normalizeBlueprint(raw: unknown): GrowthBlueprint | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const b = (o.blueprint && typeof o.blueprint === "object" ? o.blueprint : o) as Record<string, unknown>;
  const sec = (b.sections && typeof b.sections === "object" ? b.sections : {}) as Record<string, unknown>;
  const route = Array.isArray(sec["12个月升级路线"])
    ? (sec["12个月升级路线"] as Record<string, unknown>[]).filter((p) => p && typeof p === "object").map((p) => ({ phase: str(p.phase, "阶段"), goal: str(p.goal), actions: strArr(p.actions) })).slice(0, 6)
    : [];
  const p = o.personality && typeof o.personality === "object" ? o.personality as Record<string, unknown> : undefined;
  const s = o.strategy && typeof o.strategy === "object" ? o.strategy as Record<string, unknown> : undefined;
  const ab = o.abilities && typeof o.abilities === "object" ? o.abilities as Record<string, unknown> : undefined;
  const mo = o.motivation && typeof o.motivation === "object" ? o.motivation as Record<string, unknown> : undefined;
  const blueprint: GrowthBlueprint = {
    sections: {
      个人画像: str(sec["个人画像"], "待完善"),
      核心优势: strArr(sec["核心优势"]),
      限制因素: strArr(sec["限制因素"]),
      当前人生阶段判断: str(sec["当前人生阶段判断"], "待判断"),
      核心成长方向: str(sec["核心成长方向"], "待明确"),
      "12个月升级路线": route,
    },
  };
  if (p) blueprint.personality = { traits: strArr(p.traits), strengths: strArr(p.strengths), weaknesses: strArr(p.weaknesses), stressPatterns: strArr(p.stressPatterns), decisionStyle: str(p.decisionStyle), summary: str(p.summary) };
  if (s) blueprint.strategy = { values: strArr(s.values), longTermGoal: str(s.longTermGoal), fiveYearGoal: str(s.fiveYearGoal), tenYearDirection: str(s.tenYearDirection) };
  if (ab) {
    const current = Array.isArray(ab.current) ? (ab.current as Record<string, unknown>[]).filter((x) => x && typeof x === "object" && typeof x.name === "string").map((x) => ({ name: str(x.name, "能力"), current: num(x.current) ?? 40, target: num(x.target) ?? 70, note: str(x.note) || undefined })).slice(0, 8) : [];
    blueprint.abilities = { current, toImprove: strArr(ab.toImprove) };
  }
  if (mo) blueprint.motivation = { energizes: strArr(mo.energizes), drains: strArr(mo.drains), sustains: strArr(mo.sustains) };
  return blueprint;
}

/** 归一化每日复盘 AI 输出 */
export function normalizeDailyReviewOutput(raw: unknown): { deepAnalysis: string; expertBoard: DailyReview["expertBoard"]; tomorrowPlan: string[]; score: ReturnType<typeof normalizeScore> } | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const board = Array.isArray(o.expertBoard)
    ? (o.expertBoard as Record<string, unknown>[]).filter((x) => x && typeof x === "object" && typeof x.expert === "string").map((x) => ({ expert: x.expert as GrowthExpertRole, role: str(x.role, ""), insight: str(x.insight, "") })).filter((x) => x.insight).slice(0, 8)
    : undefined;
  return {
    deepAnalysis: str(o.deepAnalysis, ""),
    expertBoard: board,
    tomorrowPlan: strArr(o.tomorrowPlan).slice(0, 5),
    score: normalizeScore(o.score),
  };
}

// ---------- LLM 调用（带确定性兜底） ----------

/** 建模完成后生成蓝图（LLM + 兜底） */
export async function generateBlueprint(brain: PersonalGrowthBrain): Promise<{ blueprint: GrowthBlueprint; raw: string }> {
  const fallback = extractBlueprintFallback(brain.modeling.answers);
  try {
    const result = await runAI({
      capability: "reasoning",
      type: "conversation",
      agent: "personal-growth",
      task: buildBlueprintTask(brain.modeling.answers),
      system: "你是 Personal AI Life CEO。严格按用户要求的 JSON 结构输出；不要 Markdown 代码块。",
      allowDegrade: true,
      maxTokens: 2600,
    });
    const parsed = normalizeBlueprint(extractJson(result.content));
    if (parsed && (parsed.sections.核心优势.length || parsed.sections.个人画像 !== "待完善")) {
      return { blueprint: parsed, raw: result.content };
    }
    return { blueprint: fallback, raw: result.content };
  } catch {
    return { blueprint: fallback, raw: "" };
  }
}

/** 每日复盘：深度分析 + 专家委员会 + 明日计划 + 评分 */
export async function runDailyReviewWithAI(
  brain: PersonalGrowthBrain,
  input: { plan: string; execution: string; reflection: string; mood: string; problems: string },
): Promise<{ deepAnalysis: string; expertBoard: DailyReview["expertBoard"]; tomorrowPlan: string[]; score: ReturnType<typeof normalizeScore> }> {
  const fallbackScore = computeFallbackScore(input);
  const empty = { deepAnalysis: "", expertBoard: undefined, tomorrowPlan: [], score: fallbackScore };
  try {
    const result = await runAI({
      capability: "reasoning",
      type: "conversation",
      agent: "personal-growth",
      task: buildDailyReviewTask(input),
      system: buildLifeCEOSystemPrompt(brain),
      allowDegrade: true,
      maxTokens: 2200,
    });
    const parsed = normalizeDailyReviewOutput(extractJson(result.content));
    if (parsed && (parsed.deepAnalysis || parsed.expertBoard)) {
      return { ...parsed, score: parsed.score ?? fallbackScore };
    }
    return empty;
  } catch {
    return empty;
  }
}

/** 与人生 CEO 对话（结构化输出） */
export async function chatWithLifeCEO(brain: PersonalGrowthBrain, message: string): Promise<string> {
  const result = await runAI({
    capability: "reasoning",
    type: "conversation",
    agent: "personal-growth",
    task: message,
    system: buildLifeCEOSystemPrompt(brain),
    allowDegrade: true,
    maxTokens: 2400,
  });
  return result.content;
}

/** 主动成长扫描：发现被忽略的问题/机会/风险/应学能力/应改习惯 */
export async function proactiveScan(brain: PersonalGrowthBrain): Promise<GrowthInsight[]> {
  const last = brain.dailyReviews?.[brain.dailyReviews.length - 1];
  const task = `请基于用户的成长档案与最近记录，主动发现需要优化的问题（被忽略的问题/成长机会/潜在风险/应学能力/应改习惯）。只输出 JSON：{"insights":[{"content":"问题描述（≤100字）","category":"problem|opportunity|risk|habit|strength","suggestion":"建议（≤80字）"}]}。最近复盘：${last ? `${last.date} ${last.reflection.slice(0, 100)}（评分 ${last.score?.overall ?? "—"}）` : "暂无"}`;
  try {
    const result = await runAI({ capability: "reasoning", type: "conversation", agent: "personal-growth", task, system: buildLifeCEOSystemPrompt(brain), allowDegrade: true, maxTokens: 1200 });
    const o = extractJson(result.content) as Record<string, unknown> | null;
    const list = o && Array.isArray(o.insights) ? o.insights : [];
    return (list as Record<string, unknown>[]).filter((x) => x && typeof x === "object" && typeof x.content === "string" && x.content.trim()).map((x) => ({
      time: new Date().toISOString(),
      content: str(x.content, "").slice(0, 120),
      category: (["problem", "opportunity", "risk", "habit", "strength"] as const).includes(x.category as never) ? (x.category as GrowthInsight["category"]) : "problem",
      source: "AI 主动扫描",
    })).slice(0, 5);
  } catch {
    return [];
  }
}

/** 生成周报/月报：LLM 润色 + 确定性兜底 */
export async function generateReportWithAI(brain: PersonalGrowthBrain, type: "weekly" | "monthly"): Promise<GrowthReport> {
  const deterministic = buildDeterministicReport(brain, type);
  try {
    const result = await runAI({
      capability: "reasoning",
      type: "conversation",
      agent: "personal-growth",
      task: `请基于以下数据生成《${type === "weekly" ? "个人成长周报" : "个人成长战略报告"}》。只输出 JSON：{"summary":"总结（≤120字）","sections":[{"title":"章节名","content":"内容（≤200字）"}]}\n数据：\n${buildReportContext(brain, type)}`,
      system: buildLifeCEOSystemPrompt(brain),
      allowDegrade: true,
      maxTokens: 1800,
    });
    const o = extractJson(result.content) as Record<string, unknown> | null;
    if (o && (typeof o.summary === "string" || Array.isArray(o.sections))) {
      const sections = Array.isArray(o.sections)
        ? (o.sections as Record<string, unknown>[]).filter((x) => x && typeof x === "object" && typeof x.title === "string" && typeof x.content === "string").map((x) => ({ title: str(x.title, "章节"), content: str(x.content, "") })).slice(0, 8)
        : deterministic.sections;
      if (sections.length) {
        return { ...deterministic, summary: str(o.summary, deterministic.summary), sections };
      }
    }
  } catch {
    // 兜底
  }
  return deterministic;
}

/** 建模阶段列表 */
export function modelingStages() {
  return MODELING_STAGES;
}

/** 生成知识沉淀条目 */
export function makeKnowledge(title: string, content: string, category?: KnowledgeCategory): KnowledgeEntry {
  return {
    id: `k-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    category: category ?? categorizeKnowledge(title + content),
    title: title.slice(0, 60),
    content: content.slice(0, 500),
    createdAt: new Date().toISOString(),
  };
}
