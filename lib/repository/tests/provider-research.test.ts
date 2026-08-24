import { test } from "node:test";
import assert from "node:assert/strict";
import { getResearchRepository, __resetRepositories } from "../provider";
import { LocalResearchRepositoryWrapper } from "../../research/local-repository";

/**
 * Repository Provider 测试（Research；未配置 Supabase → Local fallback）。
 */
test("provider：getResearchRepository 未配置 Supabase → LocalResearchRepositoryWrapper", () => {
  __resetRepositories();
  const repo = getResearchRepository();
  assert.ok(repo instanceof LocalResearchRepositoryWrapper);
});

test("provider：进程内单例（多次调用返回同一实例）", () => {
  __resetRepositories();
  const a = getResearchRepository();
  const b = getResearchRepository();
  assert.equal(a, b);
});
