/**
 * AI 商业雷达 Service（V1.2.1；V1.3 机会池管理）。
 * 所有 AI 发现的机会必须经过 API 写数据库；机会池状态/时间戳/原因编码进 notes（零迁移，兼容缺 radar 列）。
 */
import type { Opportunity, OpportunityInput, OpportunityPoolStatus, RadarFinding } from "../types/opportunity";
import type { OpportunityRepository } from "../opportunity/repository";

export interface SavedRadarItem {
  index: number;
  opportunity: Opportunity;
}

/** 机会池元数据（编码进 notes） */
export interface RadarMeta {
  category?: string;
  score?: number;
  suggestion?: RadarFinding["suggestion"];
  scanId?: string;
  opportunityStatus?: OpportunityPoolStatus;
  favoriteAt?: string;
  promotedAt?: string;
  rejectedAt?: string;
  deletedAt?: string;
  rejectReason?: string;
}

/** 挑选 Opportunity 兼容的机会池字段（避免 score/category 冲突） */
export function pickPoolFields(meta: RadarMeta): Pick<Opportunity, "scanId" | "opportunityStatus" | "favoriteAt" | "promotedAt" | "rejectedAt" | "deletedAt" | "rejectReason"> {
  return {
    scanId: meta.scanId,
    opportunityStatus: meta.opportunityStatus,
    favoriteAt: meta.favoriteAt,
    promotedAt: meta.promotedAt,
    rejectedAt: meta.rejectedAt,
    deletedAt: meta.deletedAt,
    rejectReason: meta.rejectReason,
  };
}

/** 从 notes 解析雷达元数据 */
export function parseRadarNotes(notes: string | undefined): RadarMeta {
  const meta: RadarMeta = {};
  if (!notes) return meta;
  const head = notes.match(/^\[AI雷达\] (.+?) · 评分 (\d+) · (值得研究|继续观察|不建议进入)/);
  if (head) {
    meta.category = head[1];
    meta.score = Number(head[2]);
    meta.suggestion = head[3] as RadarFinding["suggestion"];
  }
  const m = notes.match(new RegExp("scanId=([A-Za-z0-9-]+)"));
  if (m) meta.scanId = m[1];
  const st = notes.match(/oppStatus=([a-z]+)/);
  if (st) meta.opportunityStatus = st[1] as OpportunityPoolStatus;
  const at = (k: string, key: keyof RadarMeta) => {
    const r = notes.match(new RegExp(k + "=([^ ·]+)"));
    if (r) (meta[key] as string) = decodeURIComponent(r[1]);
  };
  at("favoriteAt", "favoriteAt");
  at("promotedAt", "promotedAt");
  at("rejectedAt", "rejectedAt");
  at("deletedAt", "deletedAt");
  at("rejectReason", "rejectReason");
  return meta;
}

/** 把雷达发现编码为 notes（显示头 + 元数据，零迁移持久化） */
export function buildRadarNotes(f: RadarFinding, scanId: string): string {
  return [
    `[AI雷达] ${f.category} · 评分 ${f.score} · ${f.suggestion}`,
    `scanId=${scanId}`,
    `oppStatus=discovered`,
  ].join(" · ");
}

/** 在 notes 上更新机会池元数据（保留显示头） */
export function setRadarMeta(notes: string | undefined, meta: RadarMeta): string {
  const parsed = parseRadarNotes(notes);
  const display = notes?.startsWith("[AI雷达]")
    ? notes.split(" · scanId=")[0]
    : `[AI雷达] ${meta.category ?? "未分类"} · 评分 ${meta.score ?? 0} · ${meta.suggestion ?? "继续观察"}`;
  const next: RadarMeta = { ...parsed, ...meta };
  const parts = [display];
  if (next.scanId) parts.push(`scanId=${next.scanId}`);
  if (next.opportunityStatus) parts.push(`oppStatus=${next.opportunityStatus}`);
  if (next.favoriteAt) parts.push(`favoriteAt=${encodeURIComponent(next.favoriteAt)}`);
  if (next.promotedAt) parts.push(`promotedAt=${encodeURIComponent(next.promotedAt)}`);
  if (next.rejectedAt) parts.push(`rejectedAt=${encodeURIComponent(next.rejectedAt)}`);
  if (next.deletedAt) parts.push(`deletedAt=${encodeURIComponent(next.deletedAt)}`);
  if (next.rejectReason) parts.push(`rejectReason=${encodeURIComponent(next.rejectReason)}`);
  return parts.join(" · ");
}

/** 从 notes 还原 scanId（兼容旧格式） */
export function extractScanIdFromNotes(notes: string | undefined): string | undefined {
  return parseRadarNotes(notes).scanId;
}

/** 把雷达发现批量保存为机会（默认 status=discovered + opportunityStatus=discovered） */
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
      opportunityStatus: "discovered",
      notes: buildRadarNotes(f, scanId),
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
      researched: list.filter((o) => o.opportunityStatus === "researching" || o.opportunityStatus === "promoting" || o.status === "researching").length,
    }))
    .sort((a, b) => (a.scannedAt < b.scannedAt ? 1 : -1));
}
