/**
 * MemoryRepository（V0.4.1 Phase 8B-2）。
 * 存储 Decision Memory 记录 + 归档学习事件。
 * - LocalMemoryRepository：localStorage（浏览器）/ 内存（测试）
 * - SupabaseMemoryRepository：memory_records 表 + learning_events（云端，另文件）
 * 接口统一为异步（对齐 Decision/Opportunity/Research 仓库）。
 */
import { readJSON, writeJSON } from "../store/storage";
import { mergeArchivedEvents } from "./archive";
import { upsertDecisionMemory } from "./builder";
import type { ArchivedLearningEvent, DecisionMemoryRecord } from "./types";

const MEMORY_KEY = "memory";

export interface MemoryStore {
  records: DecisionMemoryRecord[];
  archivedEvents: ArchivedLearningEvent[];
}

export interface MemoryStorage {
  load(): MemoryStore;
  save(store: MemoryStore): void;
}

export interface MemoryRepository {
  load(): Promise<MemoryStore>;
  saveRecords(records: DecisionMemoryRecord[]): Promise<void>;
  listRecords(): Promise<DecisionMemoryRecord[]>;
  archive(events: ArchivedLearningEvent[]): Promise<void>;
  listArchived(): Promise<ArchivedLearningEvent[]>;
  clear(): Promise<void>;
}

export function createBrowserMemoryStorage(): MemoryStorage {
  return {
    load: () => readJSON<MemoryStore>(MEMORY_KEY, { records: [], archivedEvents: [] }),
    save: (store) => writeJSON(MEMORY_KEY, store),
  };
}

export function createMemoryMemoryStorage(): MemoryStorage {
  let store: MemoryStore = { records: [], archivedEvents: [] };
  return {
    load: () => store,
    save: (next) => {
      store = next;
    },
  };
}

/** 本地实现（同步存储，异步接口） */
export class LocalMemoryRepository implements MemoryRepository {
  private readonly storage: MemoryStorage;

  constructor(storage?: MemoryStorage) {
    this.storage = storage ?? createBrowserMemoryStorage();
  }

  async load(): Promise<MemoryStore> {
    return this.storage.load();
  }

  async saveRecords(records: DecisionMemoryRecord[]): Promise<void> {
    const store = this.storage.load();
    store.records = upsertDecisionMemory(store.records, records);
    this.storage.save(store);
  }

  async listRecords(): Promise<DecisionMemoryRecord[]> {
    return this.storage.load().records;
  }

  async archive(events: ArchivedLearningEvent[]): Promise<void> {
    const store = this.storage.load();
    store.archivedEvents = mergeArchivedEvents(store.archivedEvents, events);
    this.storage.save(store);
  }

  async listArchived(): Promise<ArchivedLearningEvent[]> {
    return this.storage.load().archivedEvents;
  }

  async clear(): Promise<void> {
    this.storage.save({ records: [], archivedEvents: [] });
  }
}