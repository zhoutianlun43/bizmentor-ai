/** LocalBusinessProfileRepository（localStorage/内存，缓存/离线） */
import { readJSON, writeJSON } from "../store/storage";
import type { BusinessProfile, BusinessProfileInput } from "./types";
import type { BusinessProfileRepository } from "./repository";

const BUSINESS_KEY = "businessProfiles";

export interface BusinessProfileStorage {
  load(): BusinessProfile[];
  save(profiles: BusinessProfile[]): void;
}

export function createBrowserBusinessProfileStorage(): BusinessProfileStorage {
  return {
    load: () => readJSON<BusinessProfile[]>(BUSINESS_KEY, []),
    save: (p) => writeJSON(BUSINESS_KEY, p),
  };
}

export function createMemoryBusinessProfileStorage(): BusinessProfileStorage {
  let profiles: BusinessProfile[] = [];
  return {
    load: () => profiles,
    save: (next) => {
      profiles = next;
    },
  };
}

export class LocalBusinessProfileRepository implements BusinessProfileRepository {
  private readonly storage: BusinessProfileStorage;

  constructor(storage?: BusinessProfileStorage) {
    this.storage = storage ?? createBrowserBusinessProfileStorage();
  }

  async save(profile: BusinessProfile): Promise<void> {
    const list = this.storage.load();
    const i = list.findIndex((p) => p.userId === profile.userId);
    if (i >= 0) list[i] = profile;
    else list.push(profile);
    this.storage.save(list);
  }

  async get(userId: string): Promise<BusinessProfile | undefined> {
    return this.storage.load().find((p) => p.userId === userId);
  }

  async update(userId: string, patch: BusinessProfileInput): Promise<BusinessProfile | undefined> {
    const list = this.storage.load();
    const i = list.findIndex((p) => p.userId === userId);
    if (i < 0) return undefined;
    const current = list[i];
    const next: BusinessProfile = {
      ...current,
      ...patch,
      id: current.id,
      userId: current.userId,
      businessTypes: patch.businessTypes ?? current.businessTypes,
      preferences: patch.preferences ?? current.preferences,
      updatedAt: new Date().toISOString(),
    };
    list[i] = next;
    this.storage.save(list);
    return next;
  }
}