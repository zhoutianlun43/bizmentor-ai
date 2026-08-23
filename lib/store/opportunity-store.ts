import { mockOpportunities } from "@/lib/data/mock/opportunities";
import { readJSON, writeJSON, uid } from "./storage";
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
    status: "researching",
    createdAt: new Date().toISOString(),
    notes: input.notes?.trim() || undefined,
  };
  saveOpportunities([opportunity, ...loadOpportunities()]);
  return opportunity;
}

/** 按 id 查找商机 */
export function findOpportunity(id: string): Opportunity | undefined {
  return loadOpportunities().find((o) => o.id === id);
}