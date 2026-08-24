/**
 * Agent Event System（V0.4.2 Phase 9B-2）。
 * 旁路事件总线：emit/subscribe，不侵入现有业务逻辑。
 * 预留事件：RESEARCH_COMPLETED / DECISION_CREATED / VALIDATION_COMPLETED / TASK_OVERDUE / MEMORY_CREATED。
 */
export type AgentEventType =
  | "RESEARCH_COMPLETED"
  | "DECISION_CREATED"
  | "VALIDATION_COMPLETED"
  | "TASK_OVERDUE"
  | "MEMORY_CREATED";

export interface AgentEvent {
  type: AgentEventType;
  payload?: unknown;
  at: string;
}

type Listener = (event: AgentEvent) => void;

const listeners = new Map<AgentEventType, Set<Listener>>();

/** 旁路发布事件 */
export function emit(type: AgentEventType, payload?: unknown): void {
  const event: AgentEvent = { type, payload, at: new Date().toISOString() };
  const set = listeners.get(type);
  if (set) for (const l of [...set]) l(event);
}

/** 订阅事件；返回取消订阅函数 */
export function subscribe(type: AgentEventType, listener: Listener): () => void {
  let set = listeners.get(type);
  if (!set) {
    set = new Set();
    listeners.set(type, set);
  }
  set.add(listener);
  return () => {
    set!.delete(listener);
  };
}

/** 测试用：清空所有订阅 */
export function __resetEventBus(): void {
  listeners.clear();
}