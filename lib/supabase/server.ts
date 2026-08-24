/**
 * Supabase 服务端客户端（V0.4.1 Phase 1 Task 1，仅建立基础，暂未被业务调用）。
 * - 使用 service role key（只存在于服务器环境变量，禁止 NEXT_PUBLIC_）
 * - 仅用于服务端：一次性数据迁移 / ai_usage 落库 / 后台任务
 */
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "../config/env";

let serverClient: SupabaseClient | undefined;

/** 创建服务端 Supabase 客户端（未配置时抛出明确错误） */
export function createSupabaseServerClient(): SupabaseClient {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error(
      "Supabase 服务端未配置：缺少 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** 获取服务端客户端单例 */
export function getSupabaseServerClient(): SupabaseClient {
  if (!serverClient) serverClient = createSupabaseServerClient();
  return serverClient;
}
