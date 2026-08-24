import { test } from "node:test";
import assert from "node:assert/strict";
import { getOpportunityRepository, __resetRepositories } from "../provider";
import { LocalOpportunityRepository } from "../../opportunity/local-repository";

/**
 * Repository Provider 测试（未配置 Supabase → Local fallback）。
 * 注意：本文件不设置 Supabase 环境变量，provider 应返回 LocalOpportunityRepository。
 */
test("provider：未配置 Supabase → LocalOpportunityRepository（本地回退）", () => {
  __resetRepositories();
  const repo = getOpportunityRepository();
  assert.ok(repo instanceof LocalOpportunityRepository);
});

test("provider：进程内单例（多次调用返回同一实例）", () => {
  __resetRepositories();
  const a = getOpportunityRepository();
  const b = getOpportunityRepository();
  assert.equal(a, b);
});

test("LocalOpportunityRepository：list 返回 mock 数据（local 行为保持）", async () => {
  const repo = new LocalOpportunityRepository();
  const list = await repo.listOpportunities();
  assert.ok(list.length > 0);
  assert.ok(list.some((o) => o.name.includes("AI")));
});
