import { test } from "node:test";
import assert from "node:assert/strict";

/** 两个 Provider 都未配置：simple 任务 → ALL_PROVIDERS_FAILED */

test("两个 Key 都缺失 → ALL_PROVIDERS_FAILED", async () => {
  const { runAI } = await import("../gateway");
  const { AiGatewayError } = await import("../types");
  await assert.rejects(
    () => runAI({ capability: "simple", task: "hi", agent: "test" }),
    (err: unknown) => err instanceof AiGatewayError && err.code === "ALL_PROVIDERS_FAILED",
  );
});