import { test } from "node:test";
import assert from "node:assert/strict";

/**
 * 未配置场景：不设置任何 Supabase 环境变量。
 */
test("浏览器客户端：未配置时抛出明确错误", async () => {
  const { createBrowserSupabaseClient } = await import("../client");
  assert.throws(() => createBrowserSupabaseClient(), /NEXT_PUBLIC_SUPABASE_URL/);
});

test("服务端客户端：未配置时抛出明确错误", async () => {
  const { createSupabaseServerClient } = await import("../server");
  assert.throws(() => createSupabaseServerClient(), /SUPABASE_SERVICE_ROLE_KEY/);
});
