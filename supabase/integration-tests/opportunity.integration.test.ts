import { test } from "node:test";
import assert from "node:assert/strict";
import { loadEnvLocal, requireSupabaseClient, uid } from "./helpers";

/**
 * Opportunity 集成测试：create / list / get / update / delete（真实 Supabase，anon + RLS local-user）。
 */
loadEnvLocal();

test("Opportunity CRUD（真实数据库）", async () => {
  const client = requireSupabaseClient();
  const { SupabaseOpportunityRepository } = await import("../../lib/opportunity/supabase-repository");
  const repo = new SupabaseOpportunityRepository(client, { userId: "local-user" });

  const name = "集成测试-" + uid("opp");
  // create
  const created = await repo.createOpportunity({ name, description: "集成测试描述", source: "user", notes: "n" });
  assert.ok(created.id);
  assert.equal(created.status, "researching");
  // get
  const got = await repo.getOpportunity(created.id);
  assert.ok(got);
  assert.equal(got?.name, name);
  // list（包含）
  const list = await repo.listOpportunities();
  assert.ok(list.some((o) => o.id === created.id), "list 应包含新建商机");
  // update
  const updated = await repo.updateOpportunity(created.id, { status: "validating", name: name + "-upd" });
  assert.ok(updated);
  assert.equal(updated?.status, "validating");
  assert.equal(updated?.name, name + "-upd");
  // delete
  assert.equal(await repo.deleteOpportunity(created.id), true);
  assert.equal(await repo.getOpportunity(created.id), undefined);
});
