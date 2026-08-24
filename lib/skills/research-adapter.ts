/**
 * Research → SkillResearchResult 适配器（V0.4.2 Phase 9B-3）。
 * 把 ResearchRun 的 report.sections 提取为技能需要的轻量结构（只读，不改引擎）。
 */
import type { ResearchRun } from "../research/types";
import type { SkillResearchResult } from "./types";

export function researchToSkillResult(run: ResearchRun): SkillResearchResult {
  const sections = (run.report?.sections ?? []).map((s) => ({ area: s.area, content: s.content }));
  return {
    sections,
    sources: run.report?.sources ?? [],
    score: run.report
      ? { overall_score: run.report.score.overall_score, confidence: run.report.score.confidence }
      : undefined,
  };
}

/** 取指定研究领域的结论（缺失回退文案） */
export function sectionOf(result: SkillResearchResult | undefined, area: string, fallback: string): string {
  const s = result?.sections.find((x) => x.area === area);
  return s && s.content.trim() ? s.content : fallback;
}