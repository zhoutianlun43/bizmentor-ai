import { test } from "node:test";
import assert from "node:assert/strict";
import { LocalResearchRepository, createMemoryResearchStorage } from "../repository";
import { runResearchPipeline } from "../pipeline";
import { createHappyRunAi, makeOptions, sampleInput } from "./helpers";

test("LocalResearchRepository：save / get / list（内存存储，含外部来源）", async () => {
  const repo = new LocalResearchRepository(createMemoryResearchStorage());
  const run = await runResearchPipeline(sampleInput, makeOptions(createHappyRunAi()));

  await repo.saveRun(run);
  const got = await repo.getRun(sampleInput.opportunity.id);
  assert.ok(got);
  assert.equal(got?.status, "completed");
  assert.equal(got?.scoreHistory.length, 1);
  assert.ok(got?.sourceDocuments.some((d) => d.sourceType === "EXTERNAL_WEB"), "外部来源文档应被保存");

  const list = await repo.listRuns();
  assert.equal(list.length, 1);

  const run2 = await runResearchPipeline(sampleInput, makeOptions(createHappyRunAi()));
  await repo.saveRun(run2);
  assert.equal((await repo.listRuns()).length, 1);
});

test("getRun 不存在返回 undefined", async () => {
  const repo = new LocalResearchRepository(createMemoryResearchStorage());
  assert.equal(await repo.getRun("nope"), undefined);
});