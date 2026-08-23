"use client";

import { useEffect } from "react";

/**
 * 注册 Service Worker（PWA 离线能力）。
 * 仅在 production 注册，避免开发模式下缓存干扰热更新。
 * 验证：pnpm build && pnpm start 后访问站点。
 */
export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("[PWA] Service Worker 注册失败", err);
    });
  }, []);

  return null;
}