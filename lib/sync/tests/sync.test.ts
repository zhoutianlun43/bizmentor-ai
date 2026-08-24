/**
 * 数据同步基础层测试（V0.4.2 Phase 9B-5-D）。
 * 覆盖：SyncManager push/pull/sync + LWW 冲突策略。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { SyncManager, lwwWins } from "../manager";
import type { SyncEntity, SyncSource } from "../types";

function memorySource(initial: SyncEntity[] = []): SyncSource & { items: SyncEntity[] } {
  const items = [...initial];
  return {
    items,
    async list() { return [...items]; },
    async upsert(e) {
      const i = items.findIndex((x) => x.id === e.id);
      if (i >= 0) items[i] = e;
      else items.push(e);
    },
  };
}

test("LWW：按 updatedAt 判定", () => {
  const old = { id: "1", updatedAt: "2026-01-01T00:00:00.000Z" };
  const newer = { id: "1", updatedAt: "2026-02-01T00:00:00.000Z" };
  assert.equal(lwwWins(newer, old), "local");
  assert.equal(lwwWins(old, newer), "remote");
  assert.equal(lwwWins(newer, { ...newer }), "equal");
});

test("SyncManager：push（本地较新覆盖远端）+ pull（远端较新覆盖本地）", async () => {
  const local = memorySource([
    { id: "a", updatedAt: "2026-03-01T00:00:00.000Z", value: "local-new" },
    { id: "b", updatedAt: "2026-01-01T00:00:00.000Z", value: "local-old" },
  ]);
  const remote = memorySource([
    { id: "a", updatedAt: "2026-01-01T00:00:00.000Z", value: "remote-old" },
    { id: "b", updatedAt: "2026-02-01T00:00:00.000Z", value: "remote-new" },
  ]);
  const manager = new SyncManager(local, remote);
  const push = await manager.push();
  assert.equal(push.pushed, 1, "只有本地较新的 a 被推送");
  assert.equal(push.skipped, 1, "b 远端较新，跳过");
  assert.equal(remote.items.find((x) => x.id === "a")?.value, "local-new");

  const pull = await manager.pull();
  assert.equal(pull.pulled, 1, "只有远端较新的 b 被拉取");
  assert.equal(local.items.find((x) => x.id === "b")?.value, "remote-new");
});

test("SyncManager：sync = push + pull", async () => {
  const local = memorySource([{ id: "x", updatedAt: "2026-05-01T00:00:00.000Z", from: "local" }]);
  const remote = memorySource([{ id: "y", updatedAt: "2026-05-02T00:00:00.000Z", from: "remote" }]);
  const manager = new SyncManager(local, remote);
  const { push, pull } = await manager.sync();
  assert.equal(push.pushed, 1);
  assert.equal(pull.pulled, 1);
  assert.ok(remote.items.some((r) => r.id === "x"));
  assert.ok(local.items.some((l) => l.id === "y"));
});