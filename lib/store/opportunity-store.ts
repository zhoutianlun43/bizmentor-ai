import { mockOpportunities } from "../data/mock/opportunities";
import { readJSON, writeJSON, uid } from "./storage";
import { parseRadarNotes, pickPoolFields } from "../radar/service";
import { DEFAULT_PROJECT_TYPE, normalizeProjectType } from "../types";
import type { Opportunity, OpportunityInput } from "../types";

const KEY = "opportunities";

/**
 * 读取商机列表；首次访问时用 mock 数据填充并写入本地存储。
 * 未来：把这里替换为 Supabase 读写，页面代码无需改动。
 */
export function loadOpportunities(): Opportunity[] {
  const existing = readJSON<Opportunity[] | null>(KEY, null);
  if (existing) {
    // V2.0：旧数据无 projectType → 默认 OPPORTUNITY（兼容老项目，数据不丢失）
    const normalized = existing.map((o) => ({ ...o, projectType: normalizeProjectType(o.projectType) }));
    if (normalized.some((o, i) => o.projectType !== existing[i].projectType)) writeJSON(KEY, normalized);
    return normalized;
  }
  const seeded = mockOpportunities.map((o) => ({ ...o, projectType: DEFAULT_PROJECT_TYPE }));
  writeJSON(KEY, seeded);
  return seeded;
}

/** 保存商机列表 */
export function saveOpportunities(list: Opportunity[]): void {
  writeJSON(KEY, list);
}

/**
 * 新增商机。
 * 用户创建的商机暂无 AI 评分（score 为空），状态默认为「研究中」。
 */
export function addOpportunity(input: OpportunityInput): Opportunity {
  const opportunity: Opportunity = {
    id: uid(),
    name: input.name.trim(),
    description: input.description.trim(),
    source: input.source,
    status: input.status ?? (input.source === "ai" ? "discovered" : "researching"),
    projectType: normalizeProjectType(input.projectType),
    createdAt: new Date().toISOString(),
    notes: input.notes?.trim() || undefined,
    radar: input.radar,
    sourceType: input.radar ? "ai_radar" : "manual_create",
    scanId: input.radar?.scanId,
    opportunityStatus: input.opportunityStatus ?? (input.source === "ai" ? "discovered" : undefined),
    ...pickPoolFields(parseRadarNotes(input.notes)),
  };
  saveOpportunities([opportunity, ...loadOpportunities()]);
  return opportunity;
}

/** 按 id 查找商机 */
export function findOpportunity(id: string): Opportunity | undefined {
  return loadOpportunities().find((o) => o.id === id);
}