/**
 * OpportunityRepository 抽象（V0.4.1 Phase 2 Task 2B）。
 * Local / Supabase 可切换；V0.3-A/B/C 业务逻辑与 UI 保持使用现有 store，本接口为未来数据层预留。
 */
import type { Opportunity, OpportunityInput } from "../types";

export interface OpportunityRepository {
  createOpportunity(input: OpportunityInput): Promise<Opportunity>;
  getOpportunity(id: string): Promise<Opportunity | undefined>;
  listOpportunities(): Promise<Opportunity[]>;
  /** 部分更新（id 与 createdAt 不可改），返回更新后的商机；不存在返回 undefined */
  updateOpportunity(
    id: string,
    patch: Partial<Omit<Opportunity, "id" | "createdAt">>,
  ): Promise<Opportunity | undefined>;
  deleteOpportunity(id: string): Promise<boolean>;
}
