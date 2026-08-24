/**
 * Validation Execution Engine（V0.4.1 Phase 7B-2）。
 * 纯函数核心：任务状态机 / 超期检测 / 计划派生状态 / 进度 / 执行摘要。
 * - 全部扩展字段落在 validation_plans.tasks（jsonb），零 schema 改动
 * - actor / priority / stateHistory / resultId / outcome / startedAt / completedAt
 * 原则：状态转移白名单 + 每次转移记录历史（可审计）；语义化方法走严格子集。
 */
import type { TaskPriority, TaskStateEntry, ValidationPlan, ValidationResult, ValidationTask, ValidationTaskStatus } from "./types";

export class ValidationExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationExecutionError";
  }
}

/** 状态转移白名单（宽松兼容 UI 常见流转，但拒绝明显非法跳转；同状态视为 no-op） */
export const TRANSITIONS: Record<ValidationTaskStatus, readonly ValidationTaskStatus[]> = {
  pending: ["running", "completed", "failed", "cancelled"],
  running: ["pending", "completed", "failed", "cancelled"],
  completed: ["pending", "failed", "cancelled"],
  failed: ["pending", "running", "cancelled"],
  cancelled: ["pending", "running"],
};

export function canTransition(from: ValidationTaskStatus, to: ValidationTaskStatus): boolean {
  if (from === to) return true; // 同状态 no-op
  return TRANSITIONS[from].includes(to);
}

export function isTerminal(status: ValidationTaskStatus): boolean {
  return status === "completed" || status === "cancelled";
}

/** 纯函数：应用状态转移，返回新任务（非法转移抛错；同状态原样返回） */
export function applyTaskTransition(
  task: ValidationTask,
  to: ValidationTaskStatus,
  opts: { actor?: string; note?: string; at?: string } = {},
): ValidationTask {
  if (task.status === to) return task;
  if (!canTransition(task.status, to)) {
    throw new ValidationExecutionError(`非法状态转移：${task.status} → ${to}`);
  }
  const at = opts.at ?? new Date().toISOString();
  const entry: TaskStateEntry = { from: task.status, to, at, actor: opts.actor, note: opts.note };
  const next: ValidationTask = {
    ...task,
    status: to,
    updatedAt: at,
    stateHistory: [...(task.stateHistory ?? []), entry],
  };
  if (to === "running" && !next.startedAt) next.startedAt = at;
  if (to === "completed") next.completedAt = at;
  return next;
}

/** 超期检测：deadline 已过且任务未完成/未取消 */
export function isOverdue(task: ValidationTask, now: Date = new Date()): boolean {
  if (task.status === "completed" || task.status === "cancelled") return false;
  if (!task.deadline) return false;
  const deadline = new Date(task.deadline).getTime();
  if (Number.isNaN(deadline)) return false;
  return now.getTime() > deadline;
}

/** 计划级派生状态（不落库，确定性） */
export type PlanStatus = "not_started" | "in_progress" | "completed" | "failed" | "blocked" | "cancelled";

export function derivePlanStatus(tasks: ValidationTask[]): PlanStatus {
  if (tasks.length === 0) return "not_started";
  const statuses = new Set(tasks.map((t) => t.status));
  if (statuses.size === 1) {
    const only = [...statuses][0];
    if (only === "cancelled") return "cancelled";
    if (only === "completed") return "completed";
    if (only === "pending") return "not_started";
    if (only === "failed") return "failed";
  }
  if (statuses.has("failed")) return "blocked";
  return "in_progress";
}

/** 计划进度（done / cancelled / total / percent / overdue） */
export function computeProgress(tasks: ValidationTask[], now: Date = new Date()) {
  const done = tasks.filter((t) => t.status === "completed").length;
  const cancelled = tasks.filter((t) => t.status === "cancelled").length;
  const total = tasks.length;
  const active = total - cancelled;
  const percent = active === 0 ? (total === 0 ? 0 : 100) : Math.round((done / active) * 100);
  const overdue = tasks.filter((t) => isOverdue(t, now)).length;
  return { done, cancelled, total, percent, overdue };
}

/** 超期且未完成的任务 */
export function listOverdueTasks(tasks: ValidationTask[], now: Date = new Date()): ValidationTask[] {
  return tasks.filter((t) => isOverdue(t, now));
}

/** 单任务执行摘要 */
export interface TaskExecutionSummary {
  taskId: string;
  assumption: string;
  status: ValidationTaskStatus;
  priority?: TaskPriority;
  owner?: string;
  deadline: string;
  overdue: boolean;
  outcome?: ValidationResult["outcome"];
  resultId?: string;
  startedAt?: string;
  completedAt?: string;
  lastTransition?: TaskStateEntry;
}

/** 计划执行摘要（含进度与每任务状态/结果） */
export function buildExecutionSummary(
  plan: ValidationPlan,
  results: ValidationResult[] = [],
  now: Date = new Date(),
): { planId: string; status: PlanStatus; progress: ReturnType<typeof computeProgress>; tasks: TaskExecutionSummary[] } {
  const resultByTask = new Map(results.map((r) => [r.taskId, r]));
  const tasks: TaskExecutionSummary[] = plan.tasks.map((t) => {
    const r = resultByTask.get(t.id);
    return {
      taskId: t.id,
      assumption: t.assumption,
      status: t.status,
      priority: t.priority,
      owner: t.owner,
      deadline: t.deadline,
      overdue: isOverdue(t, now),
      outcome: t.outcome ?? r?.outcome,
      resultId: t.resultId ?? r?.id,
      startedAt: t.startedAt,
      completedAt: t.completedAt,
      lastTransition: t.stateHistory?.[t.stateHistory.length - 1],
    };
  });
  return { planId: plan.id, status: derivePlanStatus(plan.tasks), progress: computeProgress(plan.tasks, now), tasks };
}