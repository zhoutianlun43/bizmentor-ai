/**
 * AI 商业雷达：LLM 输出解析（V0.8，行业无关）。
 * 纯函数：从 LLM 文本提取 JSON 数组 → 校验 → 归一化 RadarFinding。
 */
import type { RadarFinding } from "../types/opportunity";

const SUGGESTIONS: RadarFinding["suggestion"][] = ["值得研究", "继续观察", "不建议进入"];

function toNumber(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.round(Math.min(100, Math.max(0, n))) : fallback;
}

function toText(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function normalize(item: unknown, index: number, scannedAt: string): RadarFinding | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const name = toText(o.name);
  if (!name) return null;
  const suggestion = SUGGESTIONS.includes(o.suggestion as RadarFinding["suggestion"])
    ? (o.suggestion as RadarFinding["suggestion"])
    : "继续观察";
  return {
    name,
    description: toText(o.description, "值得关注的市场机会"),
    source: toText(o.source, "AI 雷达扫描"),
    category: toText(o.category, "综合"),
    marketSize: toText(o.marketSize, "待验证"),
    growth: toText(o.growth, "待验证"),
    competition: toText(o.competition, "待验证"),
    entryBarrier: toText(o.entryBarrier, "待验证"),
    profitability: toText(o.profitability, "待验证"),
    score: toNumber(o.score, 60),
    suggestion,
    scannedAt,
  };
}

/** 从 LLM 输出中提取雷达发现列表（提取 JSON 数组；解析失败返回 []） */
export function parseRadarReport(content: string, scannedAt: string = new Date().toISOString()): RadarFinding[] {
  const match = content.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const raw = JSON.parse(match[0]) as unknown[];
    return raw
      .map((item, i) => normalize(item, i, scannedAt))
      .filter((f): f is RadarFinding => f !== null)
      .sort((a, b) => b.score - a.score);
  } catch {
    return [];
  }
}

/** AI 雷达扫描提示词（行业无关；覆盖科技/消费/服务/制造/贸易/互联网/AI 应用/新平台/政策等） */
export function buildRadarScanPrompt(limit = 5): { system: string; user: string } {
  return {
    system:
      "你是 BizMentor 的 AI 商业雷达：主动探索全球市场机会，不绑定任何行业。只输出 JSON 数组，不要额外文字。每个机会：{name, description, source, category, marketSize, growth, competition, entryBarrier, profitability, score(0-100), suggestion(值得研究|继续观察|不建议进入)}。AI 负责筛选，人负责最终决策；不要编造具体数字，数据给区间或'待验证'。",
    user: `请扫描当前全球商业环境，找出 ${limit} 个值得关注的新兴市场机会，覆盖尽可能多样的领域（科技、消费、服务、制造、贸易、互联网、AI 应用、新平台、政策变化等）。每个机会说明：为什么现在值得关注、数据来源/发现逻辑、市场规模、增长速度、竞争程度、进入门槛、盈利可能性、综合评分、建议。`,
  };
}