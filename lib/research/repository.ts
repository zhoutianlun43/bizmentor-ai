/**
 * ResearchRepository 抽象：
 * - 现在：LocalResearchRepository（基于现有 localStorage 数据层）
 * - 未来：SupabaseResearchRepository 只新增实现，不改 UI / Pipeline
 */
import type { ResearchRun } from "./types";
import { readJSON, writeJSON } from "../store/storage";

const RESEARCH_RUNS_KEY = "researchRuns";

export interface ResearchRepository {
  saveRun(run: ResearchRun): Promise<void>;
  getRun(opportunityId: string): Promise<ResearchRun | undefined>;
  listRuns(): Promise<ResearchRun[]>;
}

/** 存储适配（便于测试注入内存实现） */
export interface ResearchStorage {
  load(): ResearchRun[];
  save(runs: ResearchRun[]): void;
}

/** 浏览器 localStorage 存储（写入后派发 storage 事件，UI 自动刷新） */
export function createBrowserResearchStorage(): ResearchStorage {
  return {
    load: () => readJSON<ResearchRun[]>(RESEARCH_RUNS_KEY, []),
    save: (runs) => writeJSON(RESEARCH_RUNS_KEY, runs),
  };
}

/** 内存存储（测试用） */
export function createMemoryResearchStorage(): ResearchStorage {
  let runs: ResearchRun[] = [];
  return {
    load: () => runs,
    save: (next) => {
      runs = next;
    },
  };
}

/** 同步读取指定商机的研究运行（浏览器 UI 配合 useLocalData 使用） */
export function readResearchRunSync(opportunityId: string): ResearchRun | undefined {
  return readJSON<ResearchRun[]>(RESEARCH_RUNS_KEY, []).find((r) => r.opportunityId === opportunityId);
}
export class LocalResearchRepository implements ResearchRepository {
  private readonly storage: ResearchStorage;

  constructor(storage?: ResearchStorage) {
    this.storage = storage ?? createBrowserResearchStorage();
  }

  async saveRun(run: ResearchRun): Promise<void> {
    const runs = this.storage.load();
    const index = runs.findIndex((r) => r.opportunityId === run.opportunityId);
    if (index >= 0) runs[index] = run;
    else runs.push(run);
    this.storage.save(runs);
  }

  async getRun(opportunityId: string): Promise<ResearchRun | undefined> {
    return this.storage.load().find((r) => r.opportunityId === opportunityId);
  }

  async listRuns(): Promise<ResearchRun[]> {
    return this.storage.load();
  }
}