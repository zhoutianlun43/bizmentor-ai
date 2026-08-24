/** LocalProfileRepository（localStorage/内存，缓存/离线） */
import { readJSON, writeJSON } from "../store/storage";
import type { PersonalProfile, PersonalProfileInput } from "./types";
import type { ProfileRepository } from "./repository";

const PROFILE_KEY = "profiles";

export interface ProfileStorage {
  load(): PersonalProfile[];
  save(profiles: PersonalProfile[]): void;
}

export function createBrowserProfileStorage(): ProfileStorage {
  return {
    load: () => readJSON<PersonalProfile[]>(PROFILE_KEY, []),
    save: (p) => writeJSON(PROFILE_KEY, p),
  };
}

export function createMemoryProfileStorage(): ProfileStorage {
  let profiles: PersonalProfile[] = [];
  return {
    load: () => profiles,
    save: (next) => {
      profiles = next;
    },
  };
}

export class LocalProfileRepository implements ProfileRepository {
  private readonly storage: ProfileStorage;

  constructor(storage?: ProfileStorage) {
    this.storage = storage ?? createBrowserProfileStorage();
  }

  async save(profile: PersonalProfile): Promise<void> {
    const list = this.storage.load();
    const i = list.findIndex((p) => p.userId === profile.userId);
    if (i >= 0) list[i] = profile;
    else list.push(profile);
    this.storage.save(list);
  }

  async get(userId: string): Promise<PersonalProfile | undefined> {
    return this.storage.load().find((p) => p.userId === userId);
  }

  async update(userId: string, patch: PersonalProfileInput): Promise<PersonalProfile | undefined> {
    const list = this.storage.load();
    const i = list.findIndex((p) => p.userId === userId);
    if (i < 0) return undefined;
    const current = list[i];
    const next: PersonalProfile = {
      ...current,
      ...patch,
      id: current.id,
      userId: current.userId,
      preferences: patch.preferences ?? current.preferences,
      updatedAt: new Date().toISOString(),
    };
    list[i] = next;
    this.storage.save(list);
    return next;
  }
}