import { test } from "node:test";
import assert from "node:assert/strict";
import { getDecisionRepository, __resetRepositories } from "../provider";
import { LocalDecisionRepositoryWrapper } from "../../decision/local-repository";

/**
 * Repository Provider 测试（Decision；未配置 Supabase → Local fallback）。
 */
test("provider：getDecisionRepository 未配置 Supabase → LocalDecisionRepositoryWrapper", () => {
  __resetRepositories();
  const repo = getDecisionRepository();
  assert.ok(repo instanceof LocalDecisionRepositoryWrapper);
});

test("provider：进程内单例（多次调用返回同一实例）", () => {
  __resetRepositories();
  const a = getDecisionRepository();
  const b = getDecisionRepository();
  assert.equal(a, b);
});
