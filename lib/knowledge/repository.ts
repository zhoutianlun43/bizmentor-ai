/**
 * KnowledgeRepository（V0.4.2 Phase 9B-4）。
 * - LocalKnowledgeRepository：localStorage / 内存（测试）
 * - 接口设计支持未来 SupabaseKnowledgeRepository（同 Decision/Memory 模式）
 */
import { readJSON, writeJSON } from "../store/storage";
import { uid } from "../store/storage";
import type { KnowledgeRecord, KnowledgeType } from "./types";

const KNOWLEDGE_KEY = "knowledge";

export interface KnowledgeStorage {
  load(): KnowledgeRecord[];
  save(records: KnowledgeRecord[]): void;
}

export interface KnowledgeRepository {
  save(record: KnowledgeRecord): Promise<void>;
  list(): Promise<KnowledgeRecord[]>;
  findByType(type: KnowledgeType): Promise<KnowledgeRecord[]>;
  /** 确认：confirmed=false → true */
  confirm(id: string): Promise<KnowledgeRecord | undefined>;
  remove(id: string): Promise<boolean>;
}

export function createBrowserKnowledgeStorage(): KnowledgeStorage {
  return {
    load: () => readJSON<KnowledgeRecord[]>(KNOWLEDGE_KEY, []),
    save: (records) => writeJSON(KNOWLEDGE_KEY, records),
  };
}

export function createMemoryKnowledgeStorage(): KnowledgeStorage {
  let records: KnowledgeRecord[] = [];
  return {
    load: () => records,
    save: (next) => {
      records = next;
    },
  };
}

export class LocalKnowledgeRepository implements KnowledgeRepository {
  private readonly storage: KnowledgeStorage;

  constructor(storage?: KnowledgeStorage) {
    this.storage = storage ?? createBrowserKnowledgeStorage();
  }

  async save(record: KnowledgeRecord): Promise<void> {
    const records = this.storage.load();
    const i = records.findIndex((r) => r.id === record.id);
    if (i >= 0) records[i] = record;
    else records.push(record);
    this.storage.save(records);
  }

  async list(): Promise<KnowledgeRecord[]> {
    return this.storage.load();
  }

  async findByType(type: KnowledgeType): Promise<KnowledgeRecord[]> {
    return this.storage.load().filter((r) => r.type === type);
  }

  async confirm(id: string): Promise<KnowledgeRecord | undefined> {
    const records = this.storage.load();
    const r = records.find((x) => x.id === id);
    if (!r) return undefined;
    r.confirmed = true;
    this.storage.save(records);
    return r;
  }

  async remove(id: string): Promise<boolean> {
    const records = this.storage.load();
    const next = records.filter((r) => r.id !== id);
    if (next.length === records.length) return false;
    this.storage.save(next);
    return true;
  }

  /** 测试/初始化辅助 */
  async clear(): Promise<void> {
    this.storage.save([]);
  }
}

export { uid };