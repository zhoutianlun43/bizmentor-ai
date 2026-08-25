/**
 * Task Engine 测试（V1.4）：生命周期 / 失败 checkpoint / 文件持久化（跨重启）。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { registerTaskExecutor, createAndStartTask } from "../engine";
import { taskStore, TaskStore } from "../store";
import type { TaskType } from "../types";

const tmp = path.join(os.tmpdir(), "bizmentor-tasks-test-" + Date.now());
process.env.AI_USAGE_FILE = path.join(tmp, "usage.jsonl");

async function waitStatus(id: string, statuses: string[], ms = 2000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    await new Promise((r) => setTimeout(r, 10));
    const cur = taskStore.get(id);
    if (cur && statuses.includes(cur.status)) return cur;
  }
  return taskStore.get(id);
}

test("任务完成：进度更新 + completed + result", async () => {
  registerTaskExecutor("test_ok", async (task, update) => {
    update({ progress: 30, currentStage: "s1", currentStageLabel: "第一步", stages: [{ stage: "s1", label: "第一步", status: "completed" }] });
    await new Promise((r) => setTimeout(r, 20));
    update({ progress: 100, result: { ok: true } });
  });
  const t = createAndStartTask({ type: "test_ok" as TaskType, title: "测试任务", payload: {} });
  const done = await waitStatus(t.id, ["completed", "failed"]);
  assert.equal(done?.status, "completed");
  assert.equal(done?.progress, 100);
  assert.deepEqual(done?.result, { ok: true });
  assert.equal(done?.stages.length, 1);
});

test("任务失败：error + checkpoint（已完成阶段数）", async () => {
  registerTaskExecutor("test_fail", async (task, update) => {
    update({ progress: 50, currentStage: "s2", stages: [{ stage: "s1", status: "completed" }, { stage: "s2", status: "failed" }] });
    throw new Error("模型超时");
  });
  const t = createAndStartTask({ type: "test_fail" as TaskType, title: "失败测试", payload: {} });
  const done = await waitStatus(t.id, ["failed"]);
  assert.equal(done?.status, "failed");
  assert.ok(done?.error?.includes("模型超时"));
  assert.equal(done?.checkpoint?.completedStages, 1);
  assert.equal(done?.checkpoint?.failedStage, "s2");
});

test("未知任务类型：立即失败", async () => {
  const t = createAndStartTask({ type: "not_exist" as TaskType, title: "x", payload: {} });
  const done = await waitStatus(t.id, ["failed"]);
  assert.equal(done?.status, "failed");
  assert.ok(done?.error?.includes("未知任务类型"));
});

test("持久化：新 Store 实例读到同一批任务（模拟服务器重启）", async () => {
  const fresh = new TaskStore();
  const list = fresh.list();
  assert.ok(list.some((x) => (x.taskType as string) === "test_ok" && x.status === "completed"));
  assert.ok(list.some((x) => (x.taskType as string) === "test_fail" && x.status === "failed"));
});
