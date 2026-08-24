import { test } from "node:test";
import assert from "node:assert/strict";
import { loadEnvLocal, requireSupabaseClient, uid } from "./helpers";

/**
 * Decision 集成测试：saveDecision / getDecision / listDecisions（真实 Supabase）。
 */
loadEnvLocal();

test("Decision save/get/list（真实数据库）", async () => {
  const client = requireSupabaseClient();
  const { SupabaseDecisionRepository } = await import("../../lib/decision/supabase-repository");
  const repo = new SupabaseDecisionRepository(client, { userId: "local-user" });

  const oppId = uid("opp");
  const d = {
    id: uid("dec"),
    opportunityId: oppId,
    decision: "validate" as const,
    differentFromAi: true,
    judgment: { why: "w", coreJudgment: "先验证", keyEvidence: "e", biggestRisk: "r", mostImportantAssumption: "a", expectedOutcome: "o" },
    aiScoreSnapshot: { version: 1, overall_score: 7.3, confidence: 0.54 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await repo.saveDecision(d);
  // get
  const got = await repo.getDecision(d.id);
  assert.ok(got);
  assert.equal(got?.decision, "validate");
  assert.equal(got?.differentFromAi, true);
  // list（包含）
  const list = await repo.listDecisions(oppId);
  assert.ok(list.some((x) => x.id === d.id), "list 应包含该决策");

  // 清理决策行（DecisionRepository 无 delete，直接用 client）
  const { error } = await client.from("decisions").delete().eq("id", d.id);
  assert.equal(error, null, error?.message);
});
