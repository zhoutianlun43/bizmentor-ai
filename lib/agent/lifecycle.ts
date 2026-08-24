/**
 * Agent 生命周期状态机（V0.4.2 Phase 9B-1）。
 * idle → planning → executing → observing → reflecting → idle；任意执行阶段可失败 → failed → idle。
 * 白名单限制转换；非法转换抛错；每次转换记录历史。
 */
import type { AgentLifecycleState } from "./types";

export class AgentLifecycleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentLifecycleError";
  }
}

/** 状态转换白名单 */
export const AGENT_TRANSITIONS: Record<AgentLifecycleState, readonly AgentLifecycleState[]> = {
  idle: ["planning"],
  planning: ["executing", "failed"],
  executing: ["observing", "failed"],
  observing: ["reflecting", "failed"],
  reflecting: ["idle", "failed"],
  failed: ["idle"],
};

export function canTransition(from: AgentLifecycleState, to: AgentLifecycleState): boolean {
  if (from === to) return true;
  return AGENT_TRANSITIONS[from].includes(to);
}

export interface LifecycleEntry {
  from: AgentLifecycleState;
  to: AgentLifecycleState;
  at: string;
}

export class AgentLifecycle {
  private state: AgentLifecycleState;
  private history: LifecycleEntry[] = [];

  constructor(initial: AgentLifecycleState = "idle") {
    this.state = initial;
  }

  getState(): AgentLifecycleState {
    return this.state;
  }

  getHistory(): readonly LifecycleEntry[] {
    return this.history;
  }

  /** 转换状态；同状态 no-op；非法抛 AgentLifecycleError */
  transition(to: AgentLifecycleState, at: string = new Date().toISOString()): void {
    if (this.state === to) return;
    if (!canTransition(this.state, to)) {
      throw new AgentLifecycleError(`非法状态转换：${this.state} → ${to}`);
    }
    this.history.push({ from: this.state, to, at });
    this.state = to;
  }

  /** 重置（新 Run 用） */
  reset(): void {
    this.state = "idle";
    this.history = [];
  }
}