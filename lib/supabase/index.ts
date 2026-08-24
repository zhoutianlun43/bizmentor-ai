/**
 * Supabase 数据层基础（V0.4.1 Phase 1 Task 1）。
 * - 仅建立 client 与 schema 定义，暂未被业务逻辑调用
 * - Phase 2：Repository 实现切换到 Supabase（Opportunity/Research/Decision），UI 改异步加载
 */
export { createBrowserSupabaseClient, getSupabaseBrowserClient } from "./client";
export { createSupabaseServerClient, getSupabaseServerClient } from "./server";
