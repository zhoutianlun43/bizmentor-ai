import { test } from "node:test";
import assert from "node:assert/strict";
import { loadEnvLocal, requireSupabaseClient } from "./helpers";

/**
 * Schema 集成测试：验证 9 张业务表存在。
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
  const { data, error } = await client
    .from("information_schema.tables")
    .select("table_name")
    .eq("table_schema", "public");
  assert.equal(error, null, error?.message);
  const names = (data as Array<{ table_name: string }> | null)?.map((r) => r.table_name) ?? [];
  for (const t of EXPECTED_TABLES) {
    assert.ok(names.includes(t), "缺少表: " + t);
  }
  assert.ok(names.length >= 8, "数据表总数应 >= 8");
});
