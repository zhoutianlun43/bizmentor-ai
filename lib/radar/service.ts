/**
 * AI 商业雷达持久化 Service（V1.2.1）。
 * 所有 AI 发现的机会必须经过 API 写数据库：批量保存为 Opportunity（status=discovered，携带 scanId）。
 */
import type { Opportunity, OpportunityInput, RadarFinding } from "../types/opportunity";
import type { OpportunityRepository } from "../opportunity/repository";

export interface SavedRadarItem {
  index: number;
  opportunity: Opportunity;
}

/** scanId 标记（写入 notes，兼容缺 radar 列的表） */
const SCAN_ID_MARK = "scanId=";

/** 从 notes 还原雷达字段（缺 radar 列时降级展示用） */
export function parseRadarNotes(notes: string | undefined): { category?: string; score?: number; suggestion?: RadarFinding["suggestion"] } {
  if (!notes) return {};
  const m = notes.match(/^\[AI雷达\] (.+?) · 评分 (\d+) · (值得研究|继续观察|不建议进入)/);
  if (!m) return {};
  return { category: m[1], score: Number(m[2]), suggestion: m[3] as RadarFinding["suggestion"] };
}

/** 从 notes 解析 scanId（缺 radar 列时降级） */
export function extractScanIdFromNotes(notes: string | undefined): string | undefined {
  if (!notes) return undefined;
  const m = notes.match(new RegExp(SCAN_ID_MARK + "([A-Za-z0-9-]+)"));
  return m ? m[1] : undefined;
}

/** 把雷达发现批量保存为机会（默认 status=discovered；scanId 写入 radar 与 notes 双重保留） */
export async function saveRadarFindings(
  findings: RadarFinding[],
  scanId: string,
  repo: OpportunityRepository,
): Promise<SavedRadarItem[]> {
  const saved: SavedRadarItem[] = [];
  for (let i = 0; i < findings.length; i++) {
    const f = findings[i];
    const input: OpportunityInput = {
      name: f.name,
      description: f.description,
      source: "ai",
      status: "discovered",
      notes: `[AI雷达] ${f.category} · 评分 ${f.score} · ${f.suggestion} · ${SCAN_ID_MARK}${scanId}`,
      radar: { ...f, scanId },
    };
    const opportunity = await repo.createOpportunity(input);
    saved.push({ index: i, opportunity });
  }
  return saved;
}

/** 按 scanId 分组统计扫描历史（从机会列表推导，无需额外表） */
export function buildScanHistory(
  opportunities: Opportunity[],
): Array<{ scanId: string; scannedAt: string; found: number; researched: number }> {
  const map = new Map<string, Opportunity[]>();
  for (const o of opportunities) {
    if (!o.scanId) continue;
    const list = map.get(o.scanId) ?? [];
    list.push(o);
    map.set(o.scanId, list);
  }
  return Array.from(map.entries())
    .map(([scanId, list]) => ({
      scanId,
      scannedAt: list.reduce((min, o) => (o.createdAt < min ? o.createdAt : min), list[0].createdAt),
      found: list.length,
      researched: list.filter((o) => o.status !== "discovered" && o.status !== "reviewing").length,
    }))
    .sort((a, b) => (a.scannedAt < b.scannedAt ? 1 : -1));
}
