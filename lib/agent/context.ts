/**
 * Agent Context 恢复（V0.4.2 Phase 9B-1）。
 * 每次 Run 从 Repository / Memory / Execution 自动重建上下文；
 * 不依赖当前聊天窗口或前端页面状态。
 */
import { getCurrentIdentity } from "../identity/resolver";
import { buildExecutionSummary } from "../decision/execution";
import { MemoryEngine } from "../memory/service";
import type { KnowledgeEngine } from "../knowledge/knowledge-engine";
import type { OpportunityRepository } from "../opportunity/repository";
import type { DecisionRepository } from "../decision/repository";
import type { MemoryPattern } from "../memory/types";
import type { AgentContext, ExecutionSummarySnapshot } from "./types";

export interface ContextRecoveryDeps {
  /** 商机仓库（可选；提供 activeOpportunityId 时需要） */
  opportunityRepository?: OpportunityRepository;
  /** 决策仓库（可选；提供 activeDecisionId 时需要） */
  decisionRepository?: DecisionRepository;
  /** 记忆引擎（可选；缺省不检索模式/事件） */
  memory?: MemoryEngine;
  /** 个人知识引擎（可选；缺省不加载已确认知识） */
  knowledge?: KnowledgeEngine;
  /** 主动商机 id */
  activeOpportunityId?: string;
  /** 主动决策 id */
  activeDecisionId?: string;
}

/** 从 Repository/Memory/Execution 恢复 Agent 上下文 */
export async function recoverContext(deps: ContextRecoveryDeps): Promise<AgentContext> {
  const identity = getCurrentIdentity();
  const createdAt = new Date().toISOString();

  let activeOpportunity;
  if (deps.activeOpportunityId && deps.opportunityRepository) {
    activeOpportunity = await deps.opportunityRepository.getOpportunity(deps.activeOpportunityId);
  }

  let activeDecision;
  if (deps.activeDecisionId && deps.decisionRepository) {
    activeDecision = await deps.decisionRepository.getDecision(deps.activeDecisionId);
  }

  let executionSummary: ExecutionSummarySnapshot | undefined;
  if (deps.activeDecisionId && deps.decisionRepository) {
    const plan = await deps.decisionRepository.getPlan(deps.activeDecisionId);
    if (plan) {
      const results = await deps.decisionRepository.listResults(plan.id);
      executionSummary = buildExecutionSummary(plan, results);
    }
  }

  let memoryPatterns: MemoryPattern[] = [];
  if (deps.memory) {
    memoryPatterns = activeOpportunity
      ? await deps.memory.retrieve({ domain: undefined, limit: 5 })
      : await deps.memory.retrieve({ limit: 5 });
  }

  let recentEvents: AgentContext["recentEvents"] = [];
  if (deps.decisionRepository) {
    recentEvents = (await deps.decisionRepository.listEvents()).slice(0, 10);
  } else if (deps.memory) {
    recentEvents = (await deps.memory.listArchived()).slice(0, 10) as unknown as AgentContext["recentEvents"];
  }

  // V0.4.2 Phase 9B-4：只加载已确认 Knowledge（未确认不影响核心决策）
  const knowledgeRecords = deps.knowledge ? await deps.knowledge.confirmed() : [];

  return {
    userId: identity.userId,
    identity,
    activeOpportunity,
    activeDecision,
    executionSummary,
    memoryPatterns,
    recentEvents,
    knowledgeRecords,
    createdAt,
  };
}