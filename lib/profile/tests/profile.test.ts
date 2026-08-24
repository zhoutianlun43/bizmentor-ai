/**
 * Personal Profile Layer 测试（V0.5.0 Phase 10A-1）。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { LocalProfileRepository, createMemoryProfileStorage, SupabaseProfileRepository } from "../index";
import { SupabaseRepositoryError } from "../../supabase/errors";
import type { PersonalProfile } from "../types";

const NOW = "2026-08-24T00:00:00.000Z";

function makeProfile(): PersonalProfile {
  return { id: "p1", userId: "user-1", name: "周", timezone: "Asia/Shanghai", language: "zh-CN", preferences: { theme: "dark" }, createdAt: NOW, updatedAt: NOW };
}

test("Local Profile：save/get/update", async () => {
  const repo = new LocalProfileRepository(createMemoryProfileStorage());
  await repo.save(makeProfile());
  const got = await repo.get("user-1");
  assert.equal(got?.name, "周");
  assert.equal(got?.timezone, "Asia/Shanghai");
  const updated = await repo.update("user-1", { name: "周天伦", language: "en" });
  assert.equal(updated?.name, "周天伦");
  assert.equal(updated?.language, "en");
  assert.equal(updated?.preferences.theme, "dark", "未传 preferences 保留原值");
  assert.equal(await repo.get("nobody"), undefined);
});

test("Supabase Profile：save/get/update（mock）+ 错误包装", async () => {
  const db: Array<Record<string, unknown>> = [];
  const client = {
    from: () => ({
      upsert: async (row: Record<string, unknown>) => { db.push(row); return { error: null }; },
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: db.find((r) => r.user_id === "user-1") ?? null, error: null }) }) }),
    }),
  } as never;
  const repo = new SupabaseProfileRepository(client, { userId: "user-1" });
  await repo.save(makeProfile());
  const got = await repo.get("user-1");
  assert.equal(got?.userId, "user-1");
  const updated = await repo.update("user-1", { name: "新名字" });
  assert.equal(updated?.name, "新名字");

  const badClient = { from: () => ({ upsert: async () => ({ error: { message: "db down" } }) }) } as never;
  const badRepo = new SupabaseProfileRepository(badClient, { userId: "u" });
  await assert.rejects(() => badRepo.save(makeProfile()), (e: unknown) => {
    assert.ok(e instanceof SupabaseRepositoryError);
    return true;
  });
});