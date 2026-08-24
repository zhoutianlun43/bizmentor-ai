/**
 * MemoryRepository（V0.4.1 Phase 8A）。
 * 存储 Decision Memory 记录 + 归档学习事件。
 * - LocalMemoryRepository：localStorage（浏览器）/ 内存（测试）
 * - 未来 Supabase：实现本接口（需新增表，暂缓，避免 schema 改动）
 * 存储键：bizmentor:v1:memory（jsonb 等价，纯前端）
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
  load(): MemoryStore;
  saveRecords(records: DecisionMemoryRecord[]): void;
  listRecords(): DecisionMemoryRecord[];
  archive(events: ArchivedLearningEvent[]): void;
  listArchived(): ArchivedLearningEvent[];
  clear(): void;
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

export class LocalMemoryRepository implements MemoryRepository {
  private readonly storage: MemoryStorage;

  constructor(storage?: MemoryStorage) {
    this.storage = storage ?? createBrowserMemoryStorage();
  }

  load(): MemoryStore {
    return this.storage.load();
  }

  saveRecords(records: DecisionMemoryRecord[]): void {
    const store = this.load();
    store.records = upsertDecisionMemory(store.records, records);
    this.storage.save(store);
  }

  listRecords(): DecisionMemoryRecord[] {
    return this.load().records;
  }

  archive(events: ArchivedLearningEvent[]): void {
    const store = this.load();
    store.archivedEvents = mergeArchivedEvents(store.archivedEvents, events);
    this.storage.save(store);
  }

  listArchived(): ArchivedLearningEvent[] {
    return this.load().archivedEvents;
  }

  clear(): void {
    this.storage.save({ records: [], archivedEvents: [] });
  }
}