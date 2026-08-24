/**
 * Settings Repository Provider（V0.4.2 Phase 9B-5-B）。
 * 同步策略：Supabase 成功 → 更新 local cache；Supabase 失败 → 读取 local cache。
 */
import { env } from "../config/env";
import { getSupabaseBrowserClient } from "../supabase/client";
import { LocalSettingsRepository, createBrowserSettingsStorage, createMemorySettingsStorage } from "./local-repository";
import { SupabaseSettingsRepository } from "./supabase-repository";
import type { SettingsRepository, UserSettings } from "./types";

/** 带本地缓存降级的设置仓库 */
export class CachedSettingsRepository implements SettingsRepository {
  private readonly primary: SettingsRepository;
  private readonly cache: LocalSettingsRepository;

  constructor(primary: SettingsRepository, cache: LocalSettingsRepository) {
    this.primary = primary;
    this.cache = cache;
  }

  async save(settings: UserSettings): Promise<void> {
    try {
      await this.primary.save(settings);
      await this.cache.save(settings); // 成功后更新本地缓存
    } catch {
      await this.cache.save(settings); // 云端失败 → 仅写本地缓存（离线降级）
    }
  }

  async load(): Promise<UserSettings> {
    try {
      const settings = await this.primary.load();
      await this.cache.save(settings);
      return settings;
    } catch {
      return this.cache.load(); // 云端失败 → 读取本地缓存
    }
  }

  async update(patch: Partial<UserSettings>): Promise<UserSettings> {
    const next = await this.load();
    const merged = { ...next, ...patch };
    await this.save(merged);
    return merged;
  }

  async reset(): Promise<void> {
    try {
      await this.primary.reset();
    } catch {
      // 云端失败：仅清本地
    }
    await this.cache.reset();
  }
}

let cachedSettings: SettingsRepository | undefined;

/** 获取设置仓库（配置 Supabase → 云端+缓存；否则本地） */
export function getSettingsRepository(storage?: ReturnType<typeof createMemorySettingsStorage>): SettingsRepository {
  if (cachedSettings && !storage) return cachedSettings;
  const cache = new LocalSettingsRepository(storage ?? createBrowserSettingsStorage());
  if (env.supabaseUrl && env.supabaseAnonKey) {
    const repo = new CachedSettingsRepository(new SupabaseSettingsRepository(getSupabaseBrowserClient()), cache);
    if (!storage) cachedSettings = repo;
    return repo;
  }
  const repo = cache;
  if (!storage) cachedSettings = repo;
  return repo;
}

/** 测试用：重置单例 */
export function __resetSettingsRepository(): void {
  cachedSettings = undefined;
}