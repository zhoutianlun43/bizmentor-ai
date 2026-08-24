/**
 * Business Profile Layer 测试（V0.5.0 Phase 10A-2）。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { LocalBusinessProfileRepository, createMemoryBusinessProfileStorage, SupabaseBusinessProfileRepository } from "../index";
import type { BusinessProfile } from "../types";

const NOW = "2026-08-24T00:00:00.000Z";

function makeProfile(): BusinessProfile {
  return { id: "b1", userId: "user-1", name: "我的小店", description: "个人经营", businessTypes: ["commerce", "service"], preferences: { riskTolerance: "low" }, createdAt: NOW, updatedAt: NOW };
}

test("Local Business：save/get/update（businessTypes 通用、不绑定行业）", async () => {
  const repo = new LocalBusinessProfileRepository(createMemoryBusinessProfileStorage());
  await repo.save(makeProfile());
  const got = await repo.get("user-1");
  assert.equal(got?.name, "我的小店");
  assert.deepEqual(got?.businessTypes, ["commerce", "service"]);
  const updated = await repo.update("user-1", { description: "跨境+服务" });
  assert.equal(updated?.description, "跨境+服务");
  assert.deepEqual(updated?.businessTypes, ["commerce", "service"], "未传 businessTypes 保留");
  assert.equal(await repo.get("nobody"), undefined);
});

test("Supabase Business：save/get/update（mock）", async () => {
  const db: Array<Record<string, unknown>> = [];
  const client = {
    from: () => ({
      upsert: async (row: Record<string, unknown>) => { db.push(row); return { error: null }; },
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: db.find((r) => r.user_id === "user-1") ?? null, error: null }) }) }),
    }),
  } as never;
  const repo = new SupabaseBusinessProfileRepository(client, { userId: "user-1" });
  await repo.save(makeProfile());
  const got = await repo.get("user-1");
  assert.equal(got?.businessTypes[0], "commerce");
  const updated = await repo.update("user-1", { businessTypes: ["content"] });
  assert.deepEqual(updated?.businessTypes, ["content"]);
});