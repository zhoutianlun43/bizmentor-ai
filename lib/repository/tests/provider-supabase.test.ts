import { test } from "node:test";
import assert from "node:assert/strict";

/**
 * Repository Provider 测试（已配置 Supabase → SupabaseOpportunityRepository）。
 * 独立测试文件：先设置环境变量再加载 provider。
 */
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

test("provider：配置了 Supabase → SupabaseOpportunityRepository", async () => {
  const { getOpportunityRepository } = await import("../provider");
  const { SupabaseOpportunityRepository } = await import("../../opportunity/supabase-repository");
  const repo = getOpportunityRepository();
  assert.ok(repo instanceof SupabaseOpportunityRepository);
});
