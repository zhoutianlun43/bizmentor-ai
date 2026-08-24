/**
 * Repository Provider（V0.4.1 Phase 3 Task 3A）。
 * 统一获取数据仓库：
 * - 配置了 Supabase（NEXT_PUBLIC_SUPABASE_URL + ANON_KEY）→ SupabaseOpportunityRepository（浏览器 anon）
 * - 否则 → LocalOpportunityRepository（localStorage，开发默认）
 *
 * 说明：生产接入 Supabase 读取需要 RLS/Auth 就绪（后续任务）；当前未配置时行为与现状一致。
 */
import { env } from "../config/env";
import { getSupabaseBrowserClient } from "../supabase/client";
import { LocalOpportunityRepository } from "../opportunity/local-repository";
import { SupabaseOpportunityRepository } from "../opportunity/supabase-repository";
import type { OpportunityRepository } from "../opportunity/repository";
import { SupabaseResearchRepository } from "../research/supabase-repository";
import { LocalResearchRepositoryWrapper } from "../research/local-repository";
import type { ResearchRepository } from "../research/repository";

let cachedOpportunity: OpportunityRepository | undefined;
let cachedResearch: ResearchRepository | undefined;

/** 获取商机仓库（进程内单例；便于测试注入） */
export function getOpportunityRepository(): OpportunityRepository {
  if (cachedOpportunity) return cachedOpportunity;
  if (env.supabaseUrl && env.supabaseAnonKey) {
    cachedOpportunity = new SupabaseOpportunityRepository(getSupabaseBrowserClient(), {
      userId: "local-user",
    });
  } else {
    cachedOpportunity = new LocalOpportunityRepository();
  }
  return cachedOpportunity;
}

/** 获取研究仓库（进程内单例；配置 Supabase → Supabase，否则 Local fallback） */
export function getResearchRepository(): ResearchRepository {
  if (cachedResearch) return cachedResearch;
  if (env.supabaseUrl && env.supabaseAnonKey) {
    cachedResearch = new SupabaseResearchRepository(getSupabaseBrowserClient(), {
      userId: "local-user",
    });
  } else {
    cachedResearch = new LocalResearchRepositoryWrapper();
  }
  return cachedResearch;
}

/** 测试用：重置缓存（注入替代实现） */
export function __resetRepositories(): void {
  cachedOpportunity = undefined;
  cachedResearch = undefined;
}
