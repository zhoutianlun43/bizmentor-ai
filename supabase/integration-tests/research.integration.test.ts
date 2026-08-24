import { test } from "node:test";
import assert from "node:assert/strict";
import { loadEnvLocal, requireSupabaseClient, uid } from "./helpers";

/**
 * Research 集成测试：saveRun / getRun / listRuns（真实 Supabase）。
 */
loadEnvLocal();

test("Research save/get/list（真实数据库）", async () => {
  const client = requireSupabaseClient();
  const { SupabaseResearchRepository } = await import("../../lib/research/supabase-repository");
  const repo = new SupabaseResearchRepository(client, { userId: "local-user" });

  const oppId = uid("opp");
  const run = {
    runId: uid("run"),
    opportunityId: oppId,
    status: "completed" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    stages: [],
    findings: [],
    scoreHistory: [{ version: 1, overall_score: 7.3, confidence: 0.54, score_breakdown: [], assumptions: [], unknowns: [], validation_required: [], createdAt: new Date().toISOString() }],
    sourceDocuments: [],
  };
  await repo.saveRun(run);
  // get
  const got = await repo.getRun(oppId);
  assert.ok(got);
  assert.equal(got?.runId, run.runId);
  assert.equal(got?.status, "completed");
  // list（包含）
  const list = await repo.listRuns();
  assert.ok(list.some((r) => r.runId === run.runId), "list 应包含该研究");
});
