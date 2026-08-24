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
import type { PersonalProfile, PersonalProfileInput } from "../profile/types";
import { SupabaseBusinessProfileRepository } from "../business/supabase-repository";
import { LocalBusinessProfileRepository } from "../business/local-repository";
import type { BusinessProfileRepository } from "../business/repository";
import type { BusinessProfile, BusinessProfileInput } from "../business/types";

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
    cachedProfile = new FallbackProfileRepository(
      new SupabaseProfileRepository(getSupabaseBrowserClient(), { userId: getCurrentUserId() }),
      new LocalProfileRepository(),
    );
  } else {
    cachedProfile = new LocalProfileRepository();
  }
  return cachedProfile;
}

/** 获取经营画像仓库（配置 Supabase → Supabase，否则 Local） */
export function getBusinessRepository(): BusinessProfileRepository {
  if (cachedBusiness) return cachedBusiness;
  if (env.supabaseUrl && env.supabaseAnonKey) {
    cachedBusiness = new FallbackBusinessProfileRepository(
      new SupabaseBusinessProfileRepository(getSupabaseBrowserClient(), { userId: getCurrentUserId() }),
      new LocalBusinessProfileRepository(),
    );
  } else {
    cachedBusiness = new LocalBusinessProfileRepository();
  }
  return cachedBusiness;
}

/** 带本地回退的画像仓库：Supabase 失败（如尚未建表）→ 落到 localStorage */
class FallbackProfileRepository implements ProfileRepository {
  constructor(private readonly primary: ProfileRepository, private readonly fallback: ProfileRepository) {}
  async save(profile: PersonalProfile): Promise<void> {
    try { await this.primary.save(profile); } catch { await this.fallback.save(profile); }
  }
  async get(userId: string): Promise<PersonalProfile | undefined> {
    try { return await this.primary.get(userId); } catch { return this.fallback.get(userId); }
  }
  async update(userId: string, patch: PersonalProfileInput): Promise<PersonalProfile | undefined> {
    try { return await this.primary.update(userId, patch); } catch { return this.fallback.update(userId, patch); }
  }
}

class FallbackBusinessProfileRepository implements BusinessProfileRepository {
  constructor(private readonly primary: BusinessProfileRepository, private readonly fallback: BusinessProfileRepository) {}
  async save(profile: BusinessProfile): Promise<void> {
    try { await this.primary.save(profile); } catch { await this.fallback.save(profile); }
  }
  async get(userId: string): Promise<BusinessProfile | undefined> {
    try { return await this.primary.get(userId); } catch { return this.fallback.get(userId); }
  }
  async update(userId: string, patch: BusinessProfileInput): Promise<BusinessProfile | undefined> {
    try { return await this.primary.update(userId, patch); } catch { return this.fallback.update(userId, patch); }
  }
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
