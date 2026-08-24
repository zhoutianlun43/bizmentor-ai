/** LocalContextRepository（localStorage/内存，缓存/离线） */
import { readJSON, writeJSON } from "../store/storage";
import type { ContextSnapshot } from "./types";
import type { ContextRepository } from "./repository";

const CONTEXT_KEY = "contextSnapshots";

export interface ContextStorage {
  load(): ContextSnapshot[];
  save(snapshots: ContextSnapshot[]): void;
}

export function createBrowserContextStorage(): ContextStorage {
  return {
    load: () => readJSON<ContextSnapshot[]>(CONTEXT_KEY, []),
    save: (s) => writeJSON(CONTEXT_KEY, s),
  };
}

export function createMemoryContextStorage(): ContextStorage {
  let snapshots: ContextSnapshot[] = [];
  return {
    load: () => snapshots,
    save: (next) => {
      snapshots = next;
    },
  };
}

export class LocalContextRepository implements ContextRepository {
  private readonly storage: ContextStorage;

  constructor(storage?: ContextStorage) {
    this.storage = storage ?? createBrowserContextStorage();
  }

  async save(snapshot: ContextSnapshot): Promise<void> {
    const list = this.storage.load();
    const i = list.findIndex((s) => s.userId === snapshot.userId);
    if (i >= 0) list[i] = snapshot;
    else list.push(snapshot);
    this.storage.save(list);
  }

  async get(userId: string): Promise<ContextSnapshot | undefined> {
    return this.storage.load().find((s) => s.userId === userId);
  }

  async clear(userId: string): Promise<void> {
    const list = this.storage.load().filter((s) => s.userId !== userId);
    this.storage.save(list);
  }
}