/**
 * 经营状态收集器（V0.4.2 Phase 9B-2）。
 * 从 Repository / Execution / Memory 一次性收集当前经营状态（晨报/晚报共用）。
 * 只读既有数据；不依赖聊天窗口或页面状态。
 */
import { isOverdue } from "../../decision/execution";
import type { OpportunityRepository } from "../../opportunity/repository";
import type { DecisionRepository } from "../../decision/repository";
import type { ResearchRepository } from "../../research/repository";
import type { MemoryEngine } from "../../memory/service";
import type {
  ScoreUpdate,
  UserDecision,
  ValidationPlan,
  ValidationResult,
  ValidationTask,
} from "../../decision/types";
import type { DecisionMemoryRecord, MemoryPattern } from "../../memory/types";

export interface LoopDeps {
  opportunityRepository?: OpportunityRepository;
  decisionRepository?: DecisionRepository;
  researchRepository?: ResearchRepository;
  memory?: MemoryEngine;
  userId?: string;
  /** 测试注入当前时间 */
  now?: Date;
}

export interface CollectedState {
  opportunities: Awaited<ReturnType<OpportunityRepository["listOpportunities"]>>;
  plans: ValidationPlan[];
  results: ValidationResult[];
  decisions: Array<{ decision: UserDecision; hasPlan: boolean; scoreUpdates: ScoreUpdate[] }>;
  overdueTasks: ValidationTask[];
  failedTasks: ValidationTask[];
  rejectedResults: ValidationResult[];
  scoreDrops: ScoreUpdate[];
  memoryPatterns: MemoryPattern[];
  memoryRecords: DecisionMemoryRecord[];
}

export async function collectState(deps: LoopDeps, now: Date = new Date()): Promise<CollectedState> {
  const opportunities = deps.opportunityRepository ? await deps.opportunityRepository.listOpportunities() : [];
  const plans = deps.decisionRepository ? await deps.decisionRepository.listPlans() : [];
  const results: ValidationResult[] = [];
  for (const p of plans) {
    results.push(...(await deps.decisionRepository!.listResults(p.id)));
  }

  const decisions: CollectedState["decisions"] = [];
  for (const opp of opportunities) {
    if (!deps.decisionRepository) break;
    const list = await deps.decisionRepository.listDecisions(opp.id);
    for (const decision of list) {
      const hasPlan = plans.some((p) => p.decisionId === decision.id);
      const scoreUpdates = await deps.decisionRepository.listScoreUpdates(decision.id);
      decisions.push({ decision, hasPlan, scoreUpdates });
    }
  }

  const allTasks = plans.flatMap((p) => p.tasks);
  const overdueTasks = allTasks.filter((t) => isOverdue(t, now));
  const failedTasks = allTasks.filter((t) => t.status === "failed");
  const rejectedResults = results.filter((r) => r.outcome === "rejected");
  const scoreDrops = decisions.flatMap((d) => d.scoreUpdates).filter((u) => u.after.overall_score < u.before.overall_score);

  const memoryPatterns = deps.memory ? await deps.memory.retrieve({}) : [];
  const memoryRecords = deps.memory ? await deps.memory.list() : [];

  return { opportunities, plans, results, decisions, overdueTasks, failedTasks, rejectedResults, scoreDrops, memoryPatterns, memoryRecords };
}

/** 把 Date 转成 YYYY-MM-DD */
export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}