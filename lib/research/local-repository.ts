/**
 * LocalResearchRepository 包装（V0.4.1 Phase 3 Task 3B）。
 * 作为 ResearchRepository 的本地 fallback（localStorage），
 * 供 Repository Provider 在未配置 Supabase 时返回。
 */
import { LocalResearchRepository, createBrowserResearchStorage } from "./repository";
import type { ResearchRepository, ResearchStorage } from "./repository";
import type { ResearchRun } from "./types";

export class LocalResearchRepositoryWrapper implements ResearchRepository {
  private readonly inner: LocalResearchRepository;

  constructor(storage?: ResearchStorage) {
    this.inner = new LocalResearchRepository(storage ?? createBrowserResearchStorage());
  }

  async saveRun(run: ResearchRun): Promise<void> {
    return this.inner.saveRun(run);
  }

  async getRun(opportunityId: string): Promise<ResearchRun | undefined> {
    return this.inner.getRun(opportunityId);
  }

  async listRuns(): Promise<ResearchRun[]> {
    return this.inner.listRuns();
  }
}
