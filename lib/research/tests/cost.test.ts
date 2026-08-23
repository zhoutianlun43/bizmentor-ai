import { test } from "node:test";
import assert from "node:assert/strict";
import { runResearchPipeline } from "../pipeline";
import { createHappyRunAi, makeOptions, sampleInput } from "./helpers";

/** ResearchRun 成本与用量记录（每阶段 provider/tokens/cost/duration/status/error） */
test("ResearchRun 记录完整阶段成本字段（含 external 阶段成本为 0）", async () => {
  const runAi = createHappyRunAi();
  const run = await runResearchPipeline(sampleInput, makeOptions(runAi));

  const requiredFields: Array<keyof typeof run.stages[0]> = [
    "stage",
    "provider",
    "provider_degraded",
    "inputTokens",
    "outputTokens",
    "estimatedCost",
    "durationMs",
    "status",
  ];
  for (const stage of run.stages) {
    for (const field of requiredFields) {
      assert.ok(field in stage, `阶段应包含字段 ${String(field)}`);
    }
  }

  const totalCost = run.stages.reduce((sum, s) => sum + s.estimatedCost, 0);
  assert.ok(totalCost > 0, "总成本应大于 0");
  const external = run.stages.find((s) => s.stage === "external-research");
  assert.equal(external?.provider, "external");
  assert.equal(external?.estimatedCost, 0);
  assert.ok(run.stages.every((s) => s.status === "completed"));
});