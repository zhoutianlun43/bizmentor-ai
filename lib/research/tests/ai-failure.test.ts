import { test } from "node:test";
import assert from "node:assert/strict";
import { runResearchPipeline } from "../pipeline";
import {
  analyzerJson,
  createFakeRunAi,
  findingJson,
  plannerJson,
  sampleInput,
  scoringJson,
  summaryJson,
  synthesisJson,
  validationPlanJson,
} from "./helpers";

function happyExcept(handler: (task: { type?: string }, callIndex: number) => string | undefined) {
  return createFakeRunAi({
    contentFor: (task, idx) => {
      const overridden = handler(task, idx);
      if (overridden !== undefined) return overridden;
      switch (task.type) {
        case "opportunity_analyzer":
          return analyzerJson();
        case "research_planner":
          return plannerJson();
        case "research_task":
          return findingJson("targetUser");
        case "research_synthesis":
          return synthesisJson();
        case "opportunity_scoring":
          return scoringJson();
        case "validation_plan":
          return validationPlanJson();
        case "final_summary":
          return summaryJson();
        default:
          return undefined;
      }
    },
  });
}

test("AI 输出非法 JSON：重试一次后仍失败 → 阶段 failed，运行 failed，不伪造报告", async () => {
  const runAi = happyExcept(() => "这不是 JSON");
  const run = await runResearchPipeline(sampleInput, { runAi });

  assert.equal(run.status, "failed");
  assert.equal(run.report, undefined, "失败时禁止伪造报告");
  assert.equal(run.stages[0].stage, "analyzer");
  assert.equal(run.stages[0].status, "failed");
  assert.ok(run.stages[0].error?.includes("两次"), "错误信息应说明两次失败");
  // 第一次失败 → 自动重试一次 → 共 2 次调用
  assert.equal(runAi.calls.filter((c) => c.type === "opportunity_analyzer").length, 2);
});

test("第一次失败第二次成功：阶段自动重试并完成", async () => {
  let analyzerCalls = 0;
  const runAi = happyExcept((task) => {
    if (task.type === "opportunity_analyzer") {
      analyzerCalls += 1;
      return analyzerCalls === 1 ? "非法 JSON" : analyzerJson();
    }
    return undefined;
  });
  const run = await runResearchPipeline(sampleInput, { runAi });

  assert.equal(run.status, "completed");
  assert.equal(analyzerCalls, 2);
  assert.equal(run.stages[0].status, "completed");
  assert.ok(run.report);
});

test("schema 校验失败（缺字段）也会重试一次", async () => {
  let analyzerCalls = 0;
  const runAi = happyExcept((task) => {
    if (task.type === "opportunity_analyzer") {
      analyzerCalls += 1;
      // 第一次：缺少 definition 字段（schema 校验失败）
      if (analyzerCalls === 1) {
        return JSON.stringify({
          problem: "问题",
          targetUserHint: "用户",
          initialAssumptions: [],
          unknowns: [],
        });
      }
      return analyzerJson();
    }
    return undefined;
  });
  const run = await runResearchPipeline(sampleInput, { runAi });
  assert.equal(run.status, "completed");
  assert.equal(analyzerCalls, 2);
  assert.equal(run.stages[0].status, "completed");
});

test("executor 阶段任务失败：两次失败 → executor failed，运行 failed", async () => {
  let taskCalls = 0;
  const runAi = happyExcept((task) => {
    if (task.type === "research_task") {
      taskCalls += 1;
      if (taskCalls <= 2) return "坏 JSON"; // 第一个任务两次都失败
      return findingJson("targetUser");
    }
    return undefined;
  });
  const run = await runResearchPipeline(sampleInput, { runAi });
  assert.equal(run.status, "failed");
  const executor = run.stages.find((s) => s.stage === "executor");
  assert.equal(executor?.status, "failed");
  assert.equal(run.report, undefined);
});