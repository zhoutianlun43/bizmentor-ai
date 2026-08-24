import { test } from "node:test";
import assert from "node:assert/strict";

/**
 * Supabase 数据层基础测试（V0.4.1 Phase 1 Task 1）。
 * 已配置场景：验证 env 暴露与 client 工厂。
 */
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

test("env 暴露 Supabase 配置（URL / anon / service role）", async () => {
  const { env } = await import("../../config/env");
  assert.equal(env.supabaseUrl, "https://example.supabase.co");
  assert.equal(env.supabaseAnonKey, "anon-key");
  assert.equal(env.supabaseServiceRoleKey, "service-role-key");
});

test("浏览器客户端：已配置时创建成功", async () => {
  const { createBrowserSupabaseClient } = await import("../client");
  const client = createBrowserSupabaseClient();
  assert.ok(client);
});

test("服务端客户端：已配置时创建成功", async () => {
  const { createSupabaseServerClient } = await import("../server");
  const client = createSupabaseServerClient();
  assert.ok(client);
});

test("浏览器/服务端单例返回同一实例", async () => {
  const { getSupabaseBrowserClient } = await import("../client");
  const { getSupabaseServerClient } = await import("../server");
  assert.equal(getSupabaseBrowserClient(), getSupabaseBrowserClient());
  assert.equal(getSupabaseServerClient(), getSupabaseServerClient());
});
