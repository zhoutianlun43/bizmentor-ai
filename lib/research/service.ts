/**
 * ResearchService：商机研究引擎的业务入口（UI 只依赖本服务）。
 * - 客户端：repository = LocalResearchRepository(localStorage)，runAi = createApiRunAi()
 * - 未来：repository 换成 SupabaseResearchRepository，UI 无需改动
 */
import type { RunAiFn } from "./ai-call";
import { runResearchPipeline } from "./pipeline";
import { LocalResearchRepository } from "./repository";
import type { ResearchRepository } from "./repository";
import type { ResearchInput, ResearchRun, StageRun } from "./types";

export interface ResearchServiceDeps {
  repository?: ResearchRepository;
  /** AI 调用函数（客户端必须传 createApiRunAi()，服务端可传 runAI，测试可传 fake） */
  runAi: RunAiFn;
}

export class ResearchService {
  private readonly repository: ResearchRepository;
  private readonly runAi: RunAiFn;

  constructor(deps: ResearchServiceDeps) {
    this.repository = deps.repository ?? new LocalResearchRepository();
    this.runAi = deps.runAi;
  }

  /** 执行一次完整研究并保存结果 */
  async startResearch(input: ResearchInput, onStage?: (stage: StageRun, index: number) => void): Promise<ResearchRun> {
    const run = await runResearchPipeline(input, { runAi: this.runAi, onStage });
    await this.repository.saveRun(run);
    return run;
  }

  async getRun(opportunityId: string): Promise<ResearchRun | undefined> {
    return this.repository.getRun(opportunityId);
  }

  async listRuns(): Promise<ResearchRun[]> {
    return this.repository.listRuns();
  }
}