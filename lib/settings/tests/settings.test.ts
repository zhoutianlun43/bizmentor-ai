/**
 * Settings Repository 测试（V0.4.2 Phase 9B-5-B）。
 * 覆盖：CRUD / 本地 fallback（云端失败读本地缓存）/ 缓存策略。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { CachedSettingsRepository, createMemorySettingsStorage, LocalSettingsRepository } from "../index";
import type { SettingsRepository } from "../types";

class FailingSettingsRepository implements SettingsRepository {
  async save(): Promise<void> { throw new Error("db down"); }
  async load(): Promise<Record<string, unknown>> { throw new Error("db down"); }
  async update(): Promise<Record<string, unknown>> { throw new Error("db down"); }
  async reset(): Promise<void> { throw new Error("db down"); }
}

test("Local Settings：CRUD（save/load/update/reset）", async () => {
  const repo = new LocalSettingsRepository(createMemorySettingsStorage());
  await repo.save({ theme: "dark", region: "cn" });
  assert.deepEqual(await repo.load(), { theme: "dark", region: "cn" });
  const next = await repo.update({ theme: "light" });
  assert.equal(next.theme, "light");
  assert.equal(next.region, "cn");
  await repo.reset();
  assert.deepEqual(await repo.load(), {});
});

test("Cached Settings：云端失败 → 读取本地缓存（离线降级）", async () => {
  const cache = new LocalSettingsRepository(createMemorySettingsStorage());
  await cache.save({ offline: true, note: "cached" });
  const repo = new CachedSettingsRepository(new FailingSettingsRepository(), cache);
  // 云端失败 → 返回本地缓存
  const loaded = await repo.load();
  assert.equal(loaded.note, "cached");
  // 保存：云端失败 → 写本地缓存
  await repo.save({ newKey: 1 });
  assert.equal((await cache.load()).newKey, 1);
});

test("Cached Settings：云端成功 → 更新本地缓存", async () => {
  const memory = createMemorySettingsStorage();
  const primary = new LocalSettingsRepository(memory);
  const cache = new LocalSettingsRepository(createMemorySettingsStorage());
  const repo = new CachedSettingsRepository(primary, cache);
  await repo.save({ theme: "dark" });
  assert.deepEqual(await cache.load(), { theme: "dark" }, "成功后更新本地缓存");
});