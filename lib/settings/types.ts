/**
 * Settings Repository（V0.4.2 Phase 9B-5-B）。
 * 用户设置：本地 localStorage（缓存/离线）+ Supabase（云端真相源）。
 */
export type UserSettings = Record<string, unknown>;

export interface SettingsRepository {
  save(settings: UserSettings): Promise<void>;
  load(): Promise<UserSettings>;
  update(patch: Partial<UserSettings>): Promise<UserSettings>;
  reset(): Promise<void>;
}