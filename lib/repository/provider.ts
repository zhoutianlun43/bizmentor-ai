/**
 * Repository Provider（V0.4.1 Phase 3 Task 3A）。
 * 统一获取数据仓库：
 * - 配置了 Supabase（NEXT_PUBLIC_SUPABASE_URL + ANON_KEY）→ SupabaseOpportunityRepository（浏览器 anon）
 * - 否则 → LocalOpportunityRepository（localStorage，开发默认）
 *
 * 说明：生产接入 Supabase 读取需要 RLS/Auth 就绪（后续任务）；当前未配置时行为与现状一致。
 */
import { env } from "../config/env";
import { getCurrentUserId } from "../identity/resolver";
import { getSupabaseBrowserClient } from "../supabase/client";
import { LocalOpportunityRepository } from "../opportunity/local-repository";
import { SupabaseOpportunityRepository } from "../opportunity/supabase-repository";
import type { OpportunityRepository } from "../opportunity/repository";
import { SupabaseResearchRepository } from "../research/supabase-repository";
import { LocalResearchRepositoryWrapper } from "../research/local-repository";
import type { ResearchRepository } from "../research/repository";
import { SupabaseDecisionRepository } from "../decision/supabase-repository";
import { LocalDecisionRepositoryWrapper } from "../decision/local-repository";
import type { DecisionRepository } from "../decision/repository";
import { SupabaseMemoryRepository } from "../memory/supabase-repository";
import { LocalMemoryRepository } from "../memory/repository";
import type { MemoryRepository } from "../memory/repository";
import { SupabaseProfileRepository } from "../profile/supabase-repository";
import { LocalProfileRepository } from "../profile/local-repository";
import type { ProfileRepository } from "../profile/repository";
import { SupabaseBusinessProfileRepository } from "../business/supabase-repository";
import { LocalBusinessProfileRepository } from "../business/local-repository";
import type { BusinessProfileRepository } from "../business/repository";

let cachedOpportunity: OpportunityRepository | undefined;
let cachedResearch: ResearchRepository | undefined;
let cachedDecision: DecisionRepository | undefined;
let cachedMemory: MemoryRepository | undefined;
let cachedProfile: ProfileRepository | undefined;
let cachedBusiness: BusinessProfileRepository | undefined;

/** 获取商机仓库（进程内单例；便于测试注入） */
export function getOpportunityRepository(): OpportunityRepository {
  if (cachedOpportunity) return cachedOpportunity;
  if (env.supabaseUrl && env.supabaseAnonKey) {
    cachedOpportunity = new SupabaseOpportunityRepository(getSupabaseBrowserClient(), {
      userId: getCurrentUserId(),
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
      userId: getCurrentUserId(),
    });
  } else {
    cachedResearch = new LocalResearchRepositoryWrapper();
  }
  return cachedResearch;
}

/** 获取决策仓库（进程内单例；配置 Supabase → Supabase，否则 Local fallback） */
export function getDecisionRepository(): DecisionRepository {
  if (cachedDecision) return cachedDecision;
  if (env.supabaseUrl && env.supabaseAnonKey) {
    cachedDecision = new SupabaseDecisionRepository(getSupabaseBrowserClient(), {
      userId: getCurrentUserId(),
    });
  } else {
    cachedDecision = new LocalDecisionRepositoryWrapper();
  }
  return cachedDecision;
}

/** 测试用：重置缓存（注入替代实现） */
/** 获取个人画像仓库（配置 Supabase → Supabase，否则 Local） */
export function getProfileRepository(): ProfileRepository {
  if (cachedProfile) return cachedProfile;
  if (env.supabaseUrl && env.supabaseAnonKey) {
    cachedProfile = new SupabaseProfileRepository(getSupabaseBrowserClient(), { userId: getCurrentUserId() });
  } else {
    cachedProfile = new LocalProfileRepository();
  }
  return cachedProfile;
}

/** 获取经营画像仓库（配置 Supabase → Supabase，否则 Local） */
export function getBusinessRepository(): BusinessProfileRepository {
  if (cachedBusiness) return cachedBusiness;
  if (env.supabaseUrl && env.supabaseAnonKey) {
    cachedBusiness = new SupabaseBusinessProfileRepository(getSupabaseBrowserClient(), { userId: getCurrentUserId() });
  } else {
    cachedBusiness = new LocalBusinessProfileRepository();
  }
  return cachedBusiness;
}

export function __resetRepositories(): void {
  cachedOpportunity = undefined;
  cachedResearch = undefined;
  cachedDecision = undefined;
  cachedMemory = undefined;
  cachedProfile = undefined;
  cachedBusiness = undefined;
}

/** 获取记忆仓库（配置 Supabase → SupabaseMemoryRepository，否则 Local fallback） */
export function getMemoryRepository(): MemoryRepository {
  if (cachedMemory) return cachedMemory;
  if (env.supabaseUrl && env.supabaseAnonKey) {
    cachedMemory = new SupabaseMemoryRepository(getSupabaseBrowserClient(), {
      userId: getCurrentUserId(),
    });
  } else {
    cachedMemory = new LocalMemoryRepository();
  }
  return cachedMemory;
}
