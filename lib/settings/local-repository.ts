/** 本地设置仓库（localStorage；测试用内存存储） */
import { readJSON, writeJSON } from "../store/storage";
import type { SettingsRepository, UserSettings } from "./types";

const SETTINGS_KEY = "settings";

export interface SettingsStorage {
  load(): UserSettings;
  save(settings: UserSettings): void;
}

export function createBrowserSettingsStorage(): SettingsStorage {
  return {
    load: () => readJSON<UserSettings>(SETTINGS_KEY, {}),
    save: (s) => writeJSON(SETTINGS_KEY, s),
  };
}

export function createMemorySettingsStorage(): SettingsStorage {
  let settings: UserSettings = {};
  return {
    load: () => settings,
    save: (next) => {
      settings = next;
    },
  };
}

export class LocalSettingsRepository implements SettingsRepository {
  private readonly storage: SettingsStorage;

  constructor(storage?: SettingsStorage) {
    this.storage = storage ?? createBrowserSettingsStorage();
  }

  async save(settings: UserSettings): Promise<void> {
    this.storage.save(settings);
  }

  async load(): Promise<UserSettings> {
    return this.storage.load();
  }

  async update(patch: Partial<UserSettings>): Promise<UserSettings> {
    const next = { ...this.storage.load(), ...patch };
    this.storage.save(next);
    return next;
  }

  async reset(): Promise<void> {
    this.storage.save({});
  }
}