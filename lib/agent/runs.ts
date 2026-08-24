/**
 * Agent Run 审计存储（V0.4.2 Phase 9B-1）。
 * - LocalAgentRunRepository：localStorage / 内存（测试）
 * - 未来 Supabase agent_runs 表（预留，本阶段不做 schema）
 */
import { readJSON, writeJSON } from "../store/storage";
import type { AgentRun } from "./types";

const RUNS_KEY = "agentRuns";

export interface AgentRunStorage {
  load(): AgentRun[];
  save(runs: AgentRun[]): void;
}

export interface AgentRunRepository {
  save(run: AgentRun): Promise<void>;
  get(id: string): Promise<AgentRun | undefined>;
  list(): Promise<AgentRun[]>;
  clear(): Promise<void>;
}

export function createBrowserAgentRunStorage(): AgentRunStorage {
  return {
    load: () => readJSON<AgentRun[]>(RUNS_KEY, []),
    save: (runs) => writeJSON(RUNS_KEY, runs),
  };
}

export function createMemoryAgentRunStorage(): AgentRunStorage {
  let runs: AgentRun[] = [];
  return {
    load: () => runs,
    save: (next) => {
      runs = next;
    },
  };
}

export class LocalAgentRunRepository implements AgentRunRepository {
  private readonly storage: AgentRunStorage;

  constructor(storage?: AgentRunStorage) {
    this.storage = storage ?? createBrowserAgentRunStorage();
  }

  async save(run: AgentRun): Promise<void> {
    const runs = this.storage.load();
    const i = runs.findIndex((r) => r.id === run.id);
    if (i >= 0) runs[i] = run;
    else runs.unshift(run);
    this.storage.save(runs);
  }

  async get(id: string): Promise<AgentRun | undefined> {
    return this.storage.load().find((r) => r.id === id);
  }

  async list(): Promise<AgentRun[]> {
    return this.storage.load();
  }

  async clear(): Promise<void> {
    this.storage.save([]);
  }
}