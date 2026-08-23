import { test } from "node:test";
import assert from "node:assert/strict";
import { buildScoreResult, nextScoreVersion } from "../scoring";
import { SCORE_DIMS } from "./helpers";

const proposal = { dimensions: SCORE_DIMS.map((d) => ({ ...d, rationale: "r", evidence: [] })) };

test("首次评分生成 Score v1", () => {
  const score = buildScoreResult(proposal, []);
  assert.equal(score.version, 1);
});

test("nextScoreVersion 生成 Score v2 并保留原因", () => {
  const v1 = buildScoreResult(proposal, []);
  const v2 = nextScoreVersion(v1, v1, "用户验证结果：10/10 访谈愿意付费，需求维度上调", "2026-08-24T00:00:00.000Z");
  assert.equal(v2.version, 2);
  assert.equal(v2.reason, "用户验证结果：10/10 访谈愿意付费，需求维度上调");
  assert.equal(v2.createdAt, "2026-08-24T00:00:00.000Z");
});

test("scoreHistory 追加 v1 → v2（未来验证更新路径）", () => {
  const v1 = buildScoreResult(proposal, []);
  const v2 = nextScoreVersion(v1, { ...v1, overall_score: 8 }, "验证后更新");
  const history = [v1, v2];
  assert.equal(history.length, 2);
  assert.equal(history[0].version, 1);
  assert.equal(history[1].version, 2);
  assert.equal(history[history.length - 1].overall_score, 8);
});