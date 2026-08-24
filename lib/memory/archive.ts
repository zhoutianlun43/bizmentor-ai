/**
 * Learning Event 归档（V0.4.1 Phase 8A）。
 * 把既有学习事件归一化为可检索/可聚合结构（按 skill/signal/severity）。
 */
import type { AbilitySkill } from "../decision/types";
import type { ArchivedLearningEvent, SkillEventAggregate } from "./types";
import type { LearningEvent } from "../decision/types";

/** 归一化学习事件（补齐领域等索引字段） */
export function normalizeLearningEvent(event: LearningEvent, domain?: string): ArchivedLearningEvent {
  return {
    id: event.id,
    skill: event.skill,
    signal: event.signal,
    severity: event.severity,
    evidence: event.evidence,
    opportunityId: event.opportunityId,
    decisionId: event.decisionId,
    domain,
    createdAt: event.createdAt,
  };
}

/** 归档：归一化 + 按 id 去重 */
export function archiveLearningEvents(events: LearningEvent[], domainByOpportunity?: Map<string, string>): ArchivedLearningEvent[] {
  return events.map((e) => normalizeLearningEvent(e, domainByOpportunity?.get(e.opportunityId)));
}

/** 追加去重（已存在的 id 不重复归档） */
export function mergeArchivedEvents(existing: ArchivedLearningEvent[], incoming: ArchivedLearningEvent[]): ArchivedLearningEvent[] {
  const seen = new Set(existing.map((e) => e.id));
  const merged = [...existing];
  for (const e of incoming) {
    if (!seen.has(e.id)) {
      merged.push(e);
      seen.add(e.id);
    }
  }
  return merged;
}

/** 按 skill 聚合（确定性） */
export function aggregateLearningEvents(events: ArchivedLearningEvent[], skill?: AbilitySkill): SkillEventAggregate[] {
  const filtered = skill ? events.filter((e) => e.skill === skill) : events;
  const bySkill = new Map<AbilitySkill, ArchivedLearningEvent[]>();
  for (const e of filtered) {
    const list = bySkill.get(e.skill) ?? [];
    list.push(e);
    bySkill.set(e.skill, list);
  }
  return [...bySkill.entries()]
    .map(([s, list]) => ({
      skill: s,
      total: list.length,
      positive: list.filter((e) => e.signal === "positive").length,
      negative: list.filter((e) => e.signal === "negative").length,
      neutral: list.filter((e) => e.signal === "neutral").length,
      avgSeverity: Math.round((list.reduce((n, e) => n + e.severity, 0) / list.length) * 100) / 100,
    }))
    .sort((a, b) => b.total - a.total);
}