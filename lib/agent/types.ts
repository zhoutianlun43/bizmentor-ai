/**
 * Personal Business Agent Runtime 类型（V0.4.2 Phase 9B-1）。
 * Agent 是编排层：引擎链是工具、Memory 是记忆、Identity 是身份。
 * 不复制任何业务逻辑。
 */
import type { Identity } from "../identity/types";
import type { Opportunity } from "../types";
import type { UserDecision, LearningEvent } from "../decision/types";
import type { PlanStatus, TaskExecutionSummary } from "../decision/execution";
import type { MemoryPattern } from "../memory/types";
import type { AgentEventType } from "./events";

/** 触发来源 */
export type AgentTrigger = "user" | "scheduled" | "event" | "manual";

/** Agent 生命周期状态 */
export type AgentLifecycleState =
  | "idle"
  | "planning"
  | "executing"
  | "observing"
  | "reflecting"
  | "failed";

/** Agent Run 状态（含终态 completed） */
export type AgentRunStatus =
  | "idle"
  | "planning"
  | "executing"
  | "observing"
  | "reflecting"
  | "failed"
  | "completed";

/** 执行摘要快照（来自 Execution Engine，只读复用） */
export interface ExecutionSummarySnapshot {
  planId: string;
  status: PlanStatus;
  progress: { done: number; cancelled: number; total: number; percent: number; overdue: number };
  tasks: TaskExecutionSummary[];
}

/** Agent 上下文：每次 Run 从 Repository/Memory/Execution 恢复，不依赖聊天窗口或页面状态 */
export interface AgentContext {
  userId: string;
  identity: Identity;
  activeOpportunity?: Opportunity;
  activeDecision?: UserDecision;
  executionSummary?: ExecutionSummarySnapshot;
  memoryPatterns: MemoryPattern[];
  recentEvents: LearningEvent[];
  createdAt: string;
}

/** 工具：现有引擎能力的薄封装（只编排，不复制逻辑） */
export interface AgentTool {
  id: string;
  name: string;
  description: string;
  execute(context: AgentContext, input: unknown): Promise<unknown>;
}

/** 单次工具调用审计 */
export interface AgentToolCall {
  toolId: string;
  input: unknown;
  result?: unknown;
  error?: string;
  durationMs: number;
}

/** Agent Run（可追踪；Local Repository 持久化，未来 Supabase agent_runs 表） */
export interface AgentRun {
  id: string;
  userId: string;
  trigger: AgentTrigger;
  status: AgentRunStatus;
  toolsUsed: AgentToolCall[];
  startedAt: string;
  completedAt?: string;
  result?: unknown;
  error?: string;
  /** V0.4.2 Phase 9B-2：触发类型细分（app_open / manual / scheduled / event / user） */
  triggerType?: string;
  /** V0.4.2 Phase 9B-2：运行期间观察到的事件 */
  events?: AgentEventType[];
  /** V0.4.2 Phase 9B-2：所属经营循环（morning_briefing / day_monitoring / evening_review） */
  loopType?: "morning_briefing" | "day_monitoring" | "evening_review";
  /** V0.4.2 Phase 9B-2：本次运行写入记忆的次数 */
  memoryWrites?: number;
  /** V0.4.2 Phase 9B-2：耗时（ms） */
  duration?: number;
}

/** Agent Run 输入（用户/调度传入） */
export interface AgentRunInput {
  /** 要执行的工具 id 列表（缺省 = 注册的全部工具） */
  tools?: string[];
  /** 每个工具的入参（key = tool id） */
  args?: Record<string, unknown>;
  /** V0.4.2 Phase 9B-2：触发类型细分 */
  triggerType?: string;
  /** V0.4.2 Phase 9B-2：本次运行观察/产生的事件 */
  events?: AgentEventType[];
  /** V0.4.2 Phase 9B-2：所属经营循环 */
  loopType?: AgentRun["loopType"];
  /** V0.4.2 Phase 9B-2：记忆写入次数（工具可上报） */
  memoryWrites?: number;
}