import { test } from "node:test";
import assert from "node:assert/strict";
import { runResearchPipeline } from "../pipeline";
import { createHappyRunAi, makeOptions, sampleInput } from "./helpers";

/** 端到端：正常流程（含外部研究）→ 完整 ResearchReport */
test("完整流水线正常流程：9 阶段完成，产出含真实来源的结构化报告", async () => {
  const runAi = createHappyRunAi();
  const run = await runResearchPipeline(sampleInput, makeOptions(runAi));

  assert.equal(run.status, "completed");
  assert.equal(run.stages.length, 9);
  assert.ok(run.stages.every((s) => s.status === "completed"), "所有阶段应 completed");

  assert.deepEqual(
    run.stages.map((s) => s.stage),
    ["analyzer", "planner", "external-research", "evidence-extraction", "evidence-validation", "synthesis", "scoring", "validation-plan", "summary"],
  );

  assert.ok(run.report, "应产出报告");
  assert.equal(run.report.sections.length, 15, "报告应包含 15 项研究内容");
  assert.equal(run.report.score.version, 1);
  assert.equal(run.scoreHistory.length, 1);
  assert.equal(run.report.meta.degraded, false);

  // 真实来源保存与展示
  assert.ok(run.report.sources.length > 0, "报告应包含外部来源");
  assert.ok(run.report.sources.some((s) => s.sourceType === "EXTERNAL_WEB"), "应包含 EXTERNAL_WEB 来源");
  assert.equal(run.report.meta.externalEvidenceAvailable, true);
  assert.ok(run.report.sources[0].url && run.report.sources[0].publisher, "来源应记录 url/publisher");

  // 确定性评分（fixture 固定值）
  assert.equal(run.report.score.overall_score, 7.3);
  assert.equal(run.report.score.confidence, 0.54);

  // 执行器按 planner 的 9 个任务执行
  assert.equal(run.findings.length, 9);
  // 证据绑定真实来源（doc-market 存在 → FACT 保留）
  const marketEvidence = run.findings.flatMap((f) => f.evidence).filter((e) => e.evidenceClass === "FACT");
  assert.ok(marketEvidence.length > 0, "外部证据应绑定真实来源");
  const bound = marketEvidence[0];
  assert.equal(bound.sourceRef?.sourceId, "doc-market");
  assert.equal(bound.sourceRef?.url, "https://example.com/market");
  assert.equal(bound.sourceRef?.publisher, "example.com");
  assert.ok(bound.sourceRef?.credibility, "来源应附带可信度");

  // external-research 阶段成本为 0（无 AI）
  const externalStage = run.stages.find((s) => s.stage === "external-research");
  assert.equal(externalStage?.provider, "external");
  assert.equal(externalStage?.estimatedCost, 0);
});

test("流水线记录每阶段 provider/tokens/cost（成本可追踪）", async () => {
  const runAi = createHappyRunAi();
  const run = await runResearchPipeline(sampleInput, makeOptions(runAi));

  for (const stage of run.stages) {
    assert.ok(stage.inputTokens >= 0);
    assert.ok(stage.estimatedCost >= 0);
    assert.ok(stage.durationMs >= 0);
  }
  const external = run.stages.find((s) => s.stage === "external-research");
  assert.equal(external?.inputTokens, 0);
  assert.equal(external?.estimatedCost, 0);
  const totalCost = run.stages.reduce((sum, s) => sum + s.estimatedCost, 0);
  assert.ok(totalCost > 0, "总成本应大于 0（AI 阶段）");
});