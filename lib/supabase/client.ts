"use client";

/**
 * Supabase 浏览器客户端（V0.4.1 Phase 1 Task 1，仅建立基础，暂未被业务调用）。
 * - 使用 anon key（NEXT_PUBLIC_，可安全暴露到浏览器）
 * - 访问受 RLS 保护；Phase 2 数据层接入后使用
 */
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "../config/env";

let browserClient: SupabaseClient | undefined;

/** 创建浏览器 Supabase 客户端（未配置时抛出明确错误） */
export function createBrowserSupabaseClient(): SupabaseClient {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error(
      "Supabase 浏览器端未配置：缺少 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  return createClient(env.supabaseUrl, env.supabaseAnonKey);
}

/** 获取浏览器客户端单例 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!browserClient) browserClient = createBrowserSupabaseClient();
  return browserClient;
}
