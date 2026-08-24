/**
 * LocalOpportunityRepository（V0.4.1 Phase 3 Task 3A）。
 * 包装现有 localStorage 数据层（lib/store/opportunity-store.ts），
 * 与 SupabaseOpportunityRepository 实现同一接口，可切换。
 */
import {
  addOpportunity,
  findOpportunity,
  loadOpportunities,
  saveOpportunities,
} from "../store/opportunity-store";
import type { Opportunity, OpportunityInput } from "../types";
import type { OpportunityRepository } from "./repository";

export class LocalOpportunityRepository implements OpportunityRepository {
  async createOpportunity(input: OpportunityInput): Promise<Opportunity> {
    return addOpportunity(input);
  }

  async getOpportunity(id: string): Promise<Opportunity | undefined> {
    return findOpportunity(id);
  }

  async listOpportunities(): Promise<Opportunity[]> {
    return loadOpportunities();
  }

  async updateOpportunity(
    id: string,
    patch: Partial<Omit<Opportunity, "id" | "createdAt">>,
  ): Promise<Opportunity | undefined> {
    const list = loadOpportunities();
    const index = list.findIndex((o) => o.id === id);
    if (index < 0) return undefined;
    const updated: Opportunity = { ...list[index], ...patch, id, createdAt: list[index].createdAt };
    list[index] = updated;
    saveOpportunities(list);
    return updated;
  }

  async deleteOpportunity(id: string): Promise<boolean> {
    const list = loadOpportunities();
    const next = list.filter((o) => o.id !== id);
    if (next.length === list.length) return false;
    saveOpportunities(next);
    return true;
  }
}
