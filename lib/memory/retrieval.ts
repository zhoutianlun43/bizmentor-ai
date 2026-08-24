/**
 * Pattern Retrieval（V0.4.1 Phase 8A）。
 * 从决策记忆中检索跨行业模式：按领域/决策/技能聚合，计算验证率、高频经验。
 */
import type { DecisionType } from "../decision/types";
import type { DecisionMemoryRecord, MemoryPattern, MemoryQuery } from "./types";

const round2 = (v: number): number => Math.round(v * 100) / 100;

function matches(record: DecisionMemoryRecord, query: MemoryQuery): boolean {
  if (query.domain && record.domain !== query.domain) return false;
  if (query.decision && record.decision !== query.decision) return false;
  if (query.skill && !record.skills.some((s) => s.skill === query.skill)) return false;
  if (query.signal && !record.skills.some((s) => s.signal === query.signal)) return false;
  return true;
}

/** 按 (domain, decision) 分组聚合模式 */
export function retrievePatterns(records: DecisionMemoryRecord[], query: MemoryQuery): MemoryPattern[] {
  const filtered = records.filter((r) => matches(r, query));
  const groups = new Map<string, DecisionMemoryRecord[]>();
  for (const r of filtered) {
    const key = `${r.domain ?? "unknown"}|${r.decision}`;
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }

  return [...groups.entries()]
    .map(([key, list]) => {
      const [domain, decision] = key.split("|");
      const decided = list.filter((r) => r.outcome === "confirmed" || r.outcome === "rejected");
      const confirmed = decided.filter((r) => r.outcome === "confirmed").length;
      const scored = list.filter((r) => r.aiPrediction?.score !== undefined);
      const lessons = new Map<string, number>();
      for (const r of list) lessons.set(r.lesson, (lessons.get(r.lesson) ?? 0) + 1);
      const commonLessons = [...lessons.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([lesson]) => lesson);
      return {
        domain: domain === "unknown" ? undefined : domain,
        decision: decision as DecisionType,
        count: list.length,
        confirmRate: decided.length > 0 ? round2(confirmed / decided.length) : null,
        avgScore: scored.length > 0 ? round2(scored.reduce((n, r) => n + (r.aiPrediction?.score ?? 0), 0) / scored.length) : undefined,
        commonLessons,
        records: list.map((r) => r.decisionId),
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, query.limit ?? 10);
}

/** 字符 bigram 重叠（对中英文商机名做轻量相似度） */
export function nameOverlap(a: string, b: string): number {
  const ta = a.toLowerCase().trim();
  const tb = b.toLowerCase().trim();
  if (!ta || !tb) return 0;
  const bigrams = (s: string): Set<string> => {
    const set = new Set<string>();
    if (s.length <= 2) {
      set.add(s);
    } else {
      for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    }
    return set;
  };
  const A = bigrams(ta);
  const B = bigrams(tb);
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** 相似决策检索：领域匹配 + 决策类型 + 名称相似度 */
export function findSimilarDecisions(
  records: DecisionMemoryRecord[],
  opportunity: { domain?: string; name: string; description?: string },
  limit = 5,
): DecisionMemoryRecord[] {
  return [...records]
    .map((r) => {
      let score = 0;
      if (opportunity.domain && r.domain === opportunity.domain) score += 0.4;
      score += nameOverlap(r.opportunityName, opportunity.name) * 0.3;
      return { r, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.r);
}