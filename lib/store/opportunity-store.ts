import { mockOpportunities } from "../data/mock/opportunities";
import { readJSON, writeJSON, uid } from "./storage";
import { parseRadarNotes, pickPoolFields } from "../radar/service";
import type { Opportunity, OpportunityInput } from "@/lib/types";

const KEY = "opportunities";

/**
 * 读取商机列表；首次访问时用 mock 数据填充并写入本地存储。
 * 未来：把这里替换为 Supabase 读写，页面代码无需改动。
 */
export function loadOpportunities(): Opportunity[] {
  const existing = readJSON<Opportunity[] | null>(KEY, null);
  if (existing) return existing;
  writeJSON(KEY, mockOpportunities);
  return mockOpportunities;
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