import { test } from "node:test";
import assert from "node:assert/strict";
import { runResearchPipeline } from "../pipeline";
import { createFakeRunAi, happyContentFor, sampleInput } from "./helpers";

/** OpenAI 不可用：research/reasoning 阶段降级 DeepSeek，报告必须显式标记 degraded（不静默） */
test("OpenAI 不可用 → 阶段降级 DeepSeek，run.status=degraded 且报告显式标记", async () => {
  const runAi = createFakeRunAi({
    contentFor: (task) => happyContentFor(task),
    providerFor: () => "deepseek",
    degradedFor: (task) => task.capability !== "simple",
  });

  const run = await runResearchPipeline(sampleInput, { runAi });

  assert.equal(run.status, "degraded");
  assert.ok(run.report);
  assert.equal(run.report.meta.degraded, true, "报告必须显式标记 degraded");

  // research / reasoning 阶段都降级
  const degradedStages = run.stages.filter((s) => s.provider_degraded);
  assert.ok(degradedStages.length >= 4, "降级阶段应被记录");
  for (const s of degradedStages) {
    assert.equal(s.provider, "deepseek");
    assert.equal(s.provider_degraded, true);
  }
  // 最终报告不静默降级：summary 阶段降级必须被记录到报告 meta
  const summary = run.stages.find((s) => s.stage === "summary");
  assert.equal(summary?.provider_degraded, true);
  assert.equal(run.report.meta.providers.summary?.provider_degraded, true);
});

/** 最终报告硬失败（runAI 抛错，无降级结果）→ 不伪造报告 */
test("最终报告硬失败 → run.status=failed，不伪造报告", async () => {
  const runAi = createFakeRunAi({
    contentFor: (task) => {
      if (task.type === "final_summary") return undefined; // Provider 抛错
      return happyContentFor(task);
    },
  });

  const run = await runResearchPipeline(sampleInput, { runAi });

  assert.equal(run.status, "failed");
  assert.equal(run.report, undefined, "最终报告失败时禁止伪造");
  const summary = run.stages.find((s) => s.stage === "summary");
  assert.equal(summary?.status, "failed");
  // 前 6 个阶段已完成（保留部分结果）
  assert.ok(run.stages.slice(0, 6).every((s) => s.status === "completed"));
});