/**
 * MemoryEngine（V0.4.1 Phase 8A）。
 * 从既有 Decision/Research 数据构建决策记忆 → 归档学习事件 → 模式检索。
 * 纯读取既有数据 + 本地记忆存储；不修改任何现有 Pipeline/Decision/Execution。
 */
import type { DecisionRepository } from "../decision/repository";
import type { ResearchRepository } from "../research/repository";
import type { LearningEvent } from "../decision/types";
import { archiveLearningEvents, aggregateLearningEvents } from "./archive";
import { buildDecisionMemory } from "./builder";
import { findSimilarDecisions, retrievePatterns } from "./retrieval";
import { LocalMemoryRepository } from "./repository";
import type { MemoryRepository } from "./repository";
import type { AbilitySkill } from "../decision/types";
import type { ArchivedLearningEvent, DecisionMemoryRecord, MemoryPattern, MemoryQuery } from "./types";

export interface MemoryEngineDeps {
  memoryRepository?: MemoryRepository;
  decisionRepository: DecisionRepository;
  researchRepository?: ResearchRepository;
  userId?: string;
}

export class MemoryEngine {
  private readonly memory: MemoryRepository;
  private readonly decisions: DecisionRepository;
  private readonly research: ResearchRepository | undefined;
  private readonly userId: string;

  constructor(deps: MemoryEngineDeps) {
    this.memory = deps.memoryRepository ?? new LocalMemoryRepository();
    this.decisions = deps.decisionRepository;
    this.research = deps.researchRepository;
    this.userId = deps.userId ?? "local-user";
  }

  /** Decision Memory：由既有决策/评审/结果/评分构建并归档一条记忆 */
  async recordDecision(decisionId: string): Promise<DecisionMemoryRecord> {
    const decision = await this.decisions.getDecision(decisionId);
    if (!decision) throw new Error("决策不存在");
    const review = await this.decisions.getReview(decisionId);
    const plan = await this.decisions.getPlan(decisionId);
    const results = plan ? await this.decisions.listResults(plan.id) : [];
    const updates = await this.decisions.listScoreUpdates(decisionId);
    const run = this.research ? await this.research.getRun(decision.opportunityId) : undefined;
    const domain = run?.report?.meta?.domain?.id;
    const opportunityName = run?.report?.opportunityName ?? "";

    const record = buildDecisionMemory({
      decision,
      review,
      results,
      scoreUpdate: updates[updates.length - 1],
      domain,
      opportunityName,
    });
    await this.memory.saveRecords([record]);
    return record;
  }

  /** Learning Event 归档：归一化 + 去重入记忆库 */
  async archiveEvents(events: LearningEvent[], domainByOpportunity?: Map<string, string>): Promise<number> {
    const archived = archiveLearningEvents(events, domainByOpportunity);
    await this.memory.archive(archived);
    return archived.length;
  }

  /** Pattern Retrieval：按领域/决策/技能聚合模式 */
  async retrieve(query: MemoryQuery): Promise<MemoryPattern[]> {
    return retrievePatterns(await this.memory.listRecords(), query);
  }

  /** 相似决策检索 */
  async similar(opportunity: { domain?: string; name: string; description?: string }, limit?: number): Promise<DecisionMemoryRecord[]> {
    return findSimilarDecisions(await this.memory.listRecords(), opportunity, limit);
  }

  /** 全部决策记忆 */
  async list(): Promise<DecisionMemoryRecord[]> {
    return this.memory.listRecords();
  }

  /** 归档事件列表（可按 skill 过滤） */
  async listArchived(skill?: AbilitySkill): Promise<ArchivedLearningEvent[]> {
    const events = await this.memory.listArchived();
    return skill ? events.filter((e) => e.skill === skill) : events;
  }

  /** 归档事件聚合（按 skill） */
  async aggregates(skill?: AbilitySkill): Promise<ReturnType<typeof aggregateLearningEvents>> {
    return aggregateLearningEvents(await this.memory.listArchived(), skill);
  }

  /** 清空记忆（测试/重置用） */
  async clear(): Promise<void> {
    await this.memory.clear();
  }
}