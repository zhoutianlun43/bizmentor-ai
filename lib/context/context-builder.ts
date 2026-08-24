/**
 * BusinessContextBuilder（V0.5.0 Phase 10A-3）。
 * 自动聚合：PersonalProfile + BusinessProfile + Confirmed Knowledge（仅 confirmed=true）
 * + Memory Pattern + 当前业务状态（Repository）→ 完整 BusinessOSContext。
 * 不绑定行业；只调用既有模块，不复制逻辑。
 */
import { getCurrentUserId } from "../identity/resolver";
import type { ProfileRepository } from "../profile/repository";
import type { BusinessProfileRepository } from "../business/repository";
import type { KnowledgeEngine } from "../knowledge/knowledge-engine";
import type { MemoryEngine } from "../memory/service";
import type { OpportunityRepository } from "../opportunity/repository";
import type { BusinessOSContext } from "./types";

export interface BusinessContextBuilderDeps {
  profileRepository?: ProfileRepository;
  businessRepository?: BusinessProfileRepository;
  knowledge?: KnowledgeEngine;
  memory?: MemoryEngine;
  /** 当前业务状态来源（activeProjects） */
  opportunityRepository?: OpportunityRepository;
  userId?: string;
  now?: Date;
}

export class BusinessContextBuilder {
  private readonly deps: BusinessContextBuilderDeps;

  constructor(deps: BusinessContextBuilderDeps) {
    this.deps = deps;
  }

  /** 构建完整 BusinessOSContext（每次从数据源聚合，不依赖页面状态） */
  async build(): Promise<BusinessOSContext> {
    const now = this.deps.now ?? new Date();
    const userId = this.deps.userId ?? getCurrentUserId();

    const personalProfile = this.deps.profileRepository ? await this.deps.profileRepository.get(userId) : undefined;
    const businessProfile = this.deps.businessRepository ? await this.deps.businessRepository.get(userId) : undefined;

    // 只允许 confirmed=true 的长期知识
    const confirmedKnowledge = this.deps.knowledge ? await this.deps.knowledge.confirmed() : [];

    const memoryPatterns = this.deps.memory ? await this.deps.memory.retrieve({}) : [];

    const activeProjects = this.deps.opportunityRepository ? (await this.deps.opportunityRepository.listOpportunities()) as unknown[] : [];

    const preferences: Record<string, unknown> = {
      ...(personalProfile?.preferences ?? {}),
      ...(businessProfile?.preferences ?? {}),
    };

    return {
      userId,
      personalProfile: personalProfile ?? null,
      businessProfile: businessProfile ?? null,
      confirmedKnowledge,
      memoryPatterns,
      activeProjects,
      preferences,
      updatedAt: now.toISOString(),
    };
  }
}