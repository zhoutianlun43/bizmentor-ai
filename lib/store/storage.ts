/**
 * 极简本地存储工具（localStorage）。
 * V0.1 用它保存 mock 数据；未来替换为 Supabase 数据层，调用方无需感知差异。
 * 写入后派发 storage 事件，通知 useLocalData 等订阅者刷新。
 */
const STORAGE_PREFIX = "bizmentor:v1:";

/** 是否运行在浏览器端 */
export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** 读取 JSON；不存在或解析失败时返回 fallback */
export function readJSON<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** 写入 JSON，并通知本地数据订阅者刷新 */
export function writeJSON<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    window.dispatchEvent(new Event("storage"));
  } catch {
    // 存储不可用（隐私模式 / 配额满）时静默失败，不阻塞 UI
  }
}

/** 生成唯一 ID（优先使用 crypto.randomUUID） */
export function uid(): string {
  if (isBrowser() && typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}