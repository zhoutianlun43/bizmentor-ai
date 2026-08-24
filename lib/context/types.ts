/**
 * Business Context Layer（V0.5.0 Phase 10A-3）。
 * BusinessOSContext = Agent 每次运行的统一上下文入口：
 * 用户是谁（PersonalProfile）→ 经营什么（BusinessProfile）→ 长期认知（Confirmed Knowledge）
 * → 历史模式（Memory）→ 当前业务状态（Repository）。
 * 原则：不绑定行业；本地是缓存/离线，Supabase 未来唯一真相源。
 */
import type { PersonalProfile } from "../profile/types";
import type { BusinessProfile } from "../business/types";
import type { KnowledgeRecord } from "../knowledge/types";
import type { MemoryPattern } from "../memory/types";

export interface BusinessOSContext {
  userId: string;
  /** 用户是谁 */
  personalProfile: PersonalProfile | null;
  /** 用户经营什么 */
  businessProfile: BusinessProfile | null;
  /** 只含 confirmed=true 的长期知识 */
  confirmedKnowledge: KnowledgeRecord[];
  /** 历史决策模式 */
  memoryPatterns: MemoryPattern[];
  /** 当前业务状态（来源 Repository；不绑定行业） */
  activeProjects: unknown[];
  /** 合并后的偏好（personal + business） */
  preferences: Record<string, unknown>;
  updatedAt: string;
}

/** 上下文快照（预留：未来 Supabase business_context_snapshots 可选缓存；本阶段不建表） */
export interface ContextSnapshot {
  userId: string;
  context: BusinessOSContext;
  savedAt: string;
}