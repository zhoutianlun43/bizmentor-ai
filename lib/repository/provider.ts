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

let cachedOpportunity: OpportunityRepository | undefined;

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

/** 测试用：重置缓存（注入替代实现） */
export function __resetRepositories(): void {
  cachedOpportunity = undefined;
}
