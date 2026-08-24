import { test } from "node:test";
import assert from "node:assert/strict";
import { loadEnvLocal, requireSupabaseClient } from "./helpers";

/**
 * Schema 集成测试：验证 9 张业务表存在。
 * 说明：anon 无法查询 information_schema（PGRST205），改为逐表 select 探测：
 * 表不存在 → PostgREST "Could not find the table" 错误；存在 → 返回（可能为空）无错误。
 */
loadEnvLocal();

const EXPECTED_TABLES = [
  "opportunities",
  "research_runs",
  "decisions",
  "decision_reviews",
  "validation_plans",
  "validation_results",
  "learning_events",
  "ai_usage",
  "score_updates",
];

test("schema：9 张业务表均已创建", async () => {
  const client = requireSupabaseClient();
  for (const table of EXPECTED_TABLES) {
    const { error } = await client.from(table).select("*").limit(1);
    assert.equal(error, null, "表 " + table + " 不可访问: " + (error?.message ?? "未知错误"));
  }
});
