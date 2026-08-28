/**
 * 周期成长报告（V1.0）：周报/月报。
 * 确定性聚合（零额外 LLM 成本）提供数据；API 层可选 LLM 润色。
 */
import type { DailyReview, GrowthReport, GrowthInsight, KnowledgeEntry, PersonalGrowthBrain } from "./types";

export function isoWeek(date: Date): string {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const week = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

interface Aggregation {
  reviews: DailyReview[];
  insights: GrowthInsight[];
  knowledge: KnowledgeEntry[];
  avgScore: number | null;
  topProblems: Array<{ text: string; count: number }>;
  breakthroughs: string[];
  period: string;
}

function aggregate(brain: PersonalGrowthBrain, type: "weekly" | "monthly", now: Date): Aggregation {
  const period = type === "weekly" ? isoWeek(now) : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const inPeriod = (d: string) =>
    type === "weekly" ? isoWeek(new Date(d)) === period : d.slice(0, 7) === period;
  const reviews = (brain.dailyReviews ?? []).filter((r) => inPeriod(r.date));
  const insights = (brain.insights ?? []).filter((i) => inPeriod(i.time));
  const knowledge = (brain.knowledge ?? []).filter((k) => inPeriod(k.createdAt));
  const scores = reviews.map((r) => r.score?.overall).filter((x): x is number => typeof x === "number");
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const problemCount = new Map<string, number>();
  for (const r of reviews) {
    if (!r.problems) continue;
    for (const line of r.problems.split(/[。；;\n]/).map((s) => s.trim()).filter((s) => s.length >= 2)) {
      const key = line.slice(0, 24);
      problemCount.set(key, (problemCount.get(key) ?? 0) + 1);
    }
  }
  const topProblems = [...problemCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([text, count]) => ({ text, count }));
  const breakthroughs = reviews.map((r) => r.reflection).filter((t) => t.includes("突破") || t.includes("完成") || t.includes("进步")).slice(0, 3);
  return { reviews, insights, knowledge, avgScore, topProblems, breakthroughs, period };
}

/** 确定性周报/月报构建（数据不足时也能给出结构化报告） */
export function buildDeterministicReport(brain: PersonalGrowthBrain, type: "weekly" | "monthly", now = new Date()): GrowthReport {
  const agg = aggregate(brain, type, now);
  const unit = type === "weekly" ? "本周" : "本月";
  const title = type === "weekly" ? `个人成长周报（${agg.period}）` : `个人成长战略报告（${agg.period}）`;
  const summary =
    agg.reviews.length === 0
      ? `${unit}还没有成长记录。从今天开始记录一次每日复盘，AI 人生 CEO 会为你生成深度分析与成长评分。`
      : `${unit}共 ${agg.reviews.length} 次成长记录，平均成长评分 ${agg.avgScore ?? "—"}/100${agg.topProblems.length ? `；反复出现的问题：${agg.topProblems.map((p) => p.text).join("、")}` : ""}。`;
  const sections = [
    {
      title: `${unit}成长`,
      content:
        agg.reviews.length === 0
          ? "暂无记录。"
          : agg.reviews.map((r) => `· ${r.date}：${(r.score?.overall ?? "—")}分 ${(r.reflection || "—").slice(0, 60)}`).join("\n"),
    },
    {
      title: "核心问题",
      content: agg.topProblems.length ? agg.topProblems.map((p) => `· ${p.text}（出现 ${p.count} 次）`).join("\n") : "暂无重复出现的问题。",
    },
    {
      title: "能力变化",
      content:
        agg.knowledge.length
          ? agg.knowledge.slice(-5).map((k) => `· [${k.category}] ${k.title}：${k.content.slice(0, 50)}`).join("\n")
          : "暂无新知识沉淀。",
    },
    {
      title: "关键突破",
      content: agg.breakthroughs.length ? agg.breakthroughs.map((b) => `· ${b.slice(0, 80)}`).join("\n") : "暂无明确突破，建议下周聚焦一个关键目标。",
    },
    {
      title: "下周重点",
      content:
        agg.reviews.length
          ? (agg.reviews[agg.reviews.length - 1].tomorrowPlan ?? []).map((t) => `· ${t}`).join("\n") || "设定 3 个可量化的下周目标。"
          : "完成一次个人建模 + 每天一次复盘，让 AI 人生 CEO 开始了解你。",
    },
  ];
  return { id: `${type}-${agg.period}`, type, period: agg.period, title, summary, sections, createdAt: now.toISOString() };
}

/** 汇总大脑给 LLM 的数据快照（生成更高质量报告） */
export function buildReportContext(brain: PersonalGrowthBrain, type: "weekly" | "monthly", now = new Date()): string {
  const agg = aggregate(brain, type, now);
  const lines = [
    `周期：${agg.period}（${type === "weekly" ? "周报" : "月报"}）`,
    `成长记录数：${agg.reviews.length}`,
    `平均评分：${agg.avgScore ?? "—"}`,
    `最近记录：${agg.reviews.slice(-3).map((r) => `${r.date} ${r.reflection.slice(0, 60)}`).join("；") || "无"}`,
    `重复问题：${agg.topProblems.map((p) => `${p.text}(${p.count}次)`).join("；") || "无"}`,
    `知识沉淀：${agg.knowledge.slice(-5).map((k) => `[${k.category}] ${k.title}`).join("；") || "无"}`,
  ];
  return lines.join("\n");
}
