/**
 * ResearchService：商机研究引擎的业务入口（UI 只依赖本服务）。
 * - 客户端：repository = LocalResearchRepository(localStorage)，runAi = createApiRunAi()
 * - 未来：repository 换成 SupabaseResearchRepository，UI 无需改动
 */
import type { RunAiFn } from "./ai-call";
import { detectDomain } from "../domain/detect";
import type { ExternalResearchFn } from "./external/types";
import { runResearchPipeline } from "./pipeline";
import { LocalResearchRepository } from "./repository";
import type { ResearchRepository } from "./repository";
import type { ResearchInput, ResearchRun, StageRun } from "./types";

export interface ResearchServiceDeps {
  repository?: ResearchRepository;
  /** AI 调用函数（客户端必须传 createApiRunAi()，服务端可传 runAI，测试可传 fake） */
  runAi: RunAiFn;
  /** 外部研究函数（客户端传 createExternalResearchApi()，测试可传 fake） */
  externalResearch: ExternalResearchFn;
}

export class ResearchService {
  private readonly repository: ResearchRepository;
  private readonly runAi: RunAiFn;
  private readonly externalResearch: ExternalResearchFn;

  constructor(deps: ResearchServiceDeps) {
    this.repository = deps.repository ?? new LocalResearchRepository();
    this.runAi = deps.runAi;
    this.externalResearch = deps.externalResearch;
  }

  /** 执行一次完整研究并保存结果 */
  async startResearch(input: ResearchInput, onStage?: (stage: StageRun, index: number) => void): Promise<ResearchRun> {
    // V0.4.1 Phase 6.1B：领域检测（规则优先，低置信才走 AI simple）→ 注入 Pipeline 上下文
    const domain = await detectDomain(
      { name: input.opportunity.name, description: input.opportunity.description },
      { runAi: this.runAi },
    );
    const run = await runResearchPipeline(input, {
      runAi: this.runAi,
      externalResearch: this.externalResearch,
      onStage,
      domain,
    });
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