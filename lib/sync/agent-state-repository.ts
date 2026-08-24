/**
 * AgentStateRepository（V0.4.2 Phase 9B-5-E：Agent 状态同步预留）。
 * 预留 agent_state / agent_runs / knowledge_records 未来进入 Supabase。
 * 当前：Local 实现（组合现有 LocalAgentRunRepository + LocalKnowledgeRepository + localStorage state）。
 */
import { readJSON, writeJSON } from "../store/storage";
import { LocalAgentRunRepository, createBrowserAgentRunStorage, createMemoryAgentRunStorage } from "../agent/runs";
import { LocalKnowledgeRepository, createBrowserKnowledgeStorage, createMemoryKnowledgeStorage } from "../knowledge/repository";
import type { AgentRun } from "../agent/types";
import type { KnowledgeRecord } from "../knowledge/types";

const AGENT_STATE_KEY = "agentState";

export interface AgentStateSnapshot {
  version: string;
  savedAt: string;
  [key: string]: unknown;
}

export interface AgentStateRepository {
  saveState(state: AgentStateSnapshot): Promise<void>;
  loadState(): Promise<AgentStateSnapshot | undefined>;
  saveRuns(runs: AgentRun[]): Promise<void>;
  listRuns(): Promise<AgentRun[]>;
  saveKnowledge(records: KnowledgeRecord[]): Promise<void>;
  listKnowledge(): Promise<KnowledgeRecord[]>;
}

export class LocalAgentStateRepository implements AgentStateRepository {
  private readonly runs: LocalAgentRunRepository;
  private readonly knowledge: LocalKnowledgeRepository;

  constructor(opts: { runsStorage?: ReturnType<typeof createMemoryAgentRunStorage>; knowledgeStorage?: ReturnType<typeof createMemoryKnowledgeStorage> } = {}) {
    this.runs = new LocalAgentRunRepository(opts.runsStorage ?? createBrowserAgentRunStorage());
    this.knowledge = new LocalKnowledgeRepository(opts.knowledgeStorage ?? createBrowserKnowledgeStorage());
  }

  async saveState(state: AgentStateSnapshot): Promise<void> {
    writeJSON<AgentStateSnapshot>(AGENT_STATE_KEY, state);
  }

  async loadState(): Promise<AgentStateSnapshot | undefined> {
    const raw = readJSON<AgentStateSnapshot | null>(AGENT_STATE_KEY, null);
    return raw ?? undefined;
  }

  async saveRuns(runs: AgentRun[]): Promise<void> {
    for (const r of runs) await this.runs.save(r);
  }

  async listRuns(): Promise<AgentRun[]> {
    return this.runs.list();
  }

  async saveKnowledge(records: KnowledgeRecord[]): Promise<void> {
    for (const r of records) await this.knowledge.save(r);
  }

  async listKnowledge(): Promise<KnowledgeRecord[]> {
    return this.knowledge.list();
  }
}