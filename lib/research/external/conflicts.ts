/**
 * 多来源交叉验证与冲突检测（V0.3-B）。
 * 第一版为确定性启发式：按领域分组，提取数值+单位，
 * 同一领域+同一单位下出现不同数值（来自不同来源）→ 判定数值冲突。
 */
import type { CrossValidationResult, EvidenceConflict, EvidenceItem, ResearchArea, ResearchFinding } from "../types";
export type { EvidenceConflict, CrossValidationResult } from "../types";


const NUMBER_RE = /(\d+(?:\.\d+)?)\s*(亿|万|%|％|元|美元|人|家|个|年|倍|单)?/g;

function extractNumbers(claim: string): Array<{ value: number; unit: string }> {
  const out: Array<{ value: number; unit: string }> = [];
  for (const m of claim.matchAll(NUMBER_RE)) {
    const value = Number(m[1]);
    if (Number.isFinite(value)) out.push({ value, unit: m[2] ?? "" });
  }
  return out;
}

function sourceLabel(e: EvidenceItem): string {
  return e.sourceRef?.url ?? e.sourceRef?.title ?? e.sourceRef?.sourceId ?? "未知来源";
}

/** 多来源冲突检测（确定性） */
export function detectConflicts(findings: ResearchFinding[]): CrossValidationResult {
  const byArea = new Map<ResearchArea, EvidenceItem[]>();
  for (const f of findings) {
    const list = byArea.get(f.area) ?? [];
    list.push(...f.evidence);
    byArea.set(f.area, list);
  }

  const conflicts: EvidenceConflict[] = [];
  const crossValidatedAreas: ResearchArea[] = [];

  for (const [area, items] of byArea) {
    const withSource = items.filter((e) => e.sourceRef);
    const distinctSources = new Set(withSource.map(sourceLabel));
    if (distinctSources.size >= 2) crossValidatedAreas.push(area);

    // 数值冲突：同一 area + 同一 unit 下，不同来源给出不同数值
    const byUnit = new Map<string, Array<{ e: EvidenceItem; value: number }>>();
    for (const e of withSource) {
      for (const n of extractNumbers(e.claim)) {
        const key = `${area}:${n.unit}`;
        const list = byUnit.get(key) ?? [];
        list.push({ e, value: n.value });
        byUnit.set(key, list);
      }
    }
    for (const [key, list] of byUnit) {
      const values = new Set(list.map((x) => x.value));
      const sources = new Set(list.map((x) => sourceLabel(x.e)));
      if (values.size > 1 && sources.size > 1) {
        const unit = key.split(":")[1] || "";
        conflicts.push({
          area,
          type: "numeric",
          description: `同一指标（${unit ? `单位 ${unit}` : "数值"}）在不同来源中不一致`,
          claims: list.map((x) => x.e.claim),
          sources: [...sources],
        });
      }
    }
  }

  // 证据不足：有 EXTERNAL 需求但没有来源证据的领域（由调用方补充 unknownAreas）
  return { conflicts, crossValidatedAreas, insufficientEvidence: [] };
}

/** 结合「需要外部证据但无来源」的领域，生成证据不足提示 */
export function markInsufficientEvidence(
  base: CrossValidationResult,
  externalAreas: ResearchArea[],
  findings: ResearchFinding[],
): CrossValidationResult {
  const covered = new Set<string>();
  for (const f of findings) {
    for (const e of f.evidence) if (e.sourceRef) covered.add(f.area);
  }
  const insufficient = externalAreas.filter((a) => !covered.has(a));
  return {
    conflicts: base.conflicts,
    crossValidatedAreas: base.crossValidatedAreas,
    insufficientEvidence: insufficient.map((a) => `领域「${a}」缺少外部来源证据，结论为推断，需验证`),
  };
}