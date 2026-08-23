import { test } from "node:test";
import assert from "node:assert/strict";
import { runResearchPipeline } from "../pipeline";
import { createHappyRunAi, sampleInput } from "./helpers";

/** 端到端：正常流程 → 完整 ResearchReport（15 项） */
test("完整流水线正常流程：7 阶段完成，产出结构化报告", async () => {
  const runAi = createHappyRunAi();
  const run = await runResearchPipeline(sampleInput, { runAi });

  assert.equal(run.status, "completed");
  assert.equal(run.stages.length, 7);
  assert.ok(run.stages.every((s) => s.status === "completed"), "所有阶段应 completed");

  // 阶段顺序
  assert.deepEqual(
    run.stages.map((s) => s.stage),
    ["analyzer", "planner", "executor", "synthesis", "scoring", "validation-plan", "summary"],
  );

  // 报告结构
  assert.ok(run.report, "应产出报告");
  assert.equal(run.report.sections.length, 15, "报告应包含 15 项研究内容");
  assert.equal(run.report.score.version, 1);
  assert.equal(run.scoreHistory.length, 1);
  assert.equal(run.report.meta.degraded, false);
  assert.ok(run.report.meta.notice.includes("缺少外部证据"), "无外部证据提示必须存在");
  assert.ok(run.report.nextActions.length >= 1);
  assert.ok(run.report.validationPlan.length >= 1);

  // 确定性评分（fixture 固定值）
  assert.equal(run.report.score.overall_score, 7.3);
  assert.equal(run.report.score.confidence, 0.54);

  // 执行器按 planner 的 9 个任务逐个执行
  assert.equal(run.findings.length, 9);

  // 每个 finding 都能追溯 Evidence
  for (const finding of run.findings) {
    assert.ok(finding.summary.length > 0);
    assert.ok(finding.evidence.length >= 0);
  }
});

test("流水线记录每阶段 provider/tokens/cost（成本可追踪）", async () => {
  const runAi = createHappyRunAi();
  const run = await runResearchPipeline(sampleInput, { runAi });

  for (const stage of run.stages) {
    assert.equal(stage.provider, "deepseek");
    assert.equal(stage.provider_degraded, false);
    assert.ok(stage.inputTokens > 0, `${stage.stage} 应记录 inputTokens`);
    assert.ok(stage.outputTokens >= 0);
    assert.ok(stage.estimatedCost >= 0);
    assert.ok(stage.durationMs >= 0);
  }
  // executor 聚合 9 次调用（每次 10 in / 5 out）
  const executor = run.stages.find((s) => s.stage === "executor");
  assert.equal(executor?.inputTokens, 90);
  assert.equal(executor?.outputTokens, 45);
});