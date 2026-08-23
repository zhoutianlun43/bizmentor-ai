import { useCallback, useRef, useSyncExternalStore } from "react";

/**
 * 在客户端安全地读取本地数据（localStorage / 其他外部存储），
 * 避免 SSR / hydration 不一致，并兼容 React Compiler 的 lint 规则。
 *
 * - 服务端与首次 hydration 渲染使用 `serverFallback`（如 mock 数据）
 * - hydration 完成后自动切换为 `loader()` 的真实数据
 * - 监听跨标签页 storage 事件；写入后通过 storage 事件刷新
 *
 * 稳定性说明：getSnapshot 以「序列化结果」为判据做 memo，
 * 数据未变化时始终返回同一引用，避免 useSyncExternalStore 无限重渲染。
 */
export function useLocalData<T>(loader: () => T, serverFallback: T): T {
  const cache = useRef<T>(serverFallback);
  const cacheKey = useRef<string | null>(null);

  const subscribe = useCallback((onStoreChange: () => void) => {
    window.addEventListener("storage", onStoreChange);
    return () => window.removeEventListener("storage", onStoreChange);
  }, []);

  const getSnapshot = useCallback(() => {
    const next = loader();
    const key = JSON.stringify(next);
    if (key !== cacheKey.current) {
      cacheKey.current = key;
      cache.current = next;
    }
    return cache.current;
  }, [loader]);

  return useSyncExternalStore(subscribe, getSnapshot, () => serverFallback);
}