/**
 * Agent Runtime Foundation 测试（V0.4.2 Phase 9B-1）。
 * 覆盖：生命周期状态机 / Tool Registry / Context 恢复 / Runtime 完整流程 / Run 记录。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { AgentLifecycle, AgentLifecycleError, AGENT_TRANSITIONS, canTransition } from "../lifecycle";
import { AgentToolRegistry } from "../tool-registry";
import { recoverContext } from "../context";
import { AgentRuntime } from "../runtime";
import { LocalAgentRunRepository, createMemoryAgentRunStorage } from "../runs";
import { createMemoryTool } from "../tools/memory";
import { createExecutionTool } from "../tools/execution";
import { LocalDecisionRepository, createMemoryDecisionStorage } from "../../decision/repository";
import { LocalResearchRepository, createMemoryResearchStorage } from "../../research/repository";
import { LocalMemoryRepository, createMemoryMemoryStorage } from "../../memory/repository";
import { MemoryEngine } from "../../memory/service";
import { DecisionService } from "../../decision/service";
import { createReviewRunAi, makeResearchRun } from "../../decision/tests/helpers";
import type { AgentTool } from "../types";

// ---------- 1. 生命周期 ----------
test("生命周期：合法流转 idle→planning→executing→observing→reflecting→idle", () => {
  const lc = new AgentLifecycle();
  lc.transition("planning");
  lc.transition("executing");
  lc.transition("observing");
  lc.transition("reflecting");
  lc.transition("idle");
  assert.equal(lc.getState(), "idle");
  assert.equal(lc.getHistory().length, 5);
  assert.equal(lc.getHistory()[0].from, "idle");
  assert.equal(lc.getHistory()[0].to, "planning");
});

test("生命周期：非法转换抛 AgentLifecycleError；同状态 no-op", () => {
  const lc = new AgentLifecycle();
  assert.throws(() => lc.transition("executing"), AgentLifecycleError, "idle 不能直接 executing");
  assert.throws(() => lc.transition("observing"), AgentLifecycleError, "idle 不能直接 observing");
  // 同状态 no-op
  lc.transition("planning");
  const before = lc.getHistory().length;
  lc.transition("planning");
  assert.equal(lc.getHistory().length, before);
});

test("生命周期：执行阶段可失败，failed 可回 idle", () => {
  const lc = new AgentLifecycle();
  lc.transition("planning");
  lc.transition("failed");
  assert.equal(lc.getState(), "failed");
  lc.transition("idle");
  assert.equal(lc.getState(), "idle");
  assert.ok(canTransition("executing", "failed"));
  assert.ok(!canTransition("idle", "observing"));
  assert.ok(AGENT_TRANSITIONS.failed.includes("idle"));
});

// ---------- 2. Tool Registry ----------
test("Tool Registry：注册/查找/列举/重复抛错", () => {
  const reg = new AgentToolRegistry();
  const tool: AgentTool = { id: "t1", name: "T1", description: "d", execute: async () => "ok" };
  reg.register(tool);
  assert.equal(reg.get("t1"), tool);
  assert.equal(reg.has("t1"), true);
  assert.equal(reg.list().length, 1);
  assert.throws(() => reg.register(tool), /已注册/);
});

// ---------- 3. Context 恢复 ----------
test("Context 恢复：从 Repository/Memory/Execution 重建（不依赖页面状态）", async () => {
  const decisionRepo = new LocalDecisionRepository(createMemoryDecisionStorage());
  const researchRepo = new LocalResearchRepository(createMemoryResearchStorage());
  const service = new DecisionService({ decisionRepository: decisionRepo, researchRepository: researchRepo, runAi: createReviewRunAi(), userId: "test-user" });
  const memory = new MemoryEngine({ memoryRepository: new LocalMemoryRepository(createMemoryMemoryStorage()), decisionRepository: decisionRepo, researchRepository: researchRepo, userId: "test-user" });

  await makeResearchRun(researchRepo, "opp-ctx1");
  const { decision } = await service.createDecision({
    opportunityId: "opp-ctx1", decision: "validate", differentFromAi: false,
    judgment: { why: "w", coreJudgment: "先测款", keyEvidence: "研究结论", biggestRisk: "物流", mostImportantAssumption: "a", expectedOutcome: "验证通过则上架" },
  });
  const plan = await service.createValidationPlan({
    decisionId: decision.id, opportunityId: "opp-ctx1",
    tasks: [{ assumption: "a", hypothesis: "h", method: "m", sampleSize: "s", successCriteria: "sc", failureCriteria: "fc", deadline: "2030-01-01", costEstimate: "c", owner: "me" }],
  });
  await service.startTask(plan.tasks[0].id);
  await memory.recordDecision(decision.id);

  const ctx = await recoverContext({
    decisionRepository: decisionRepo,
    memory,
    activeDecisionId: decision.id,
  });
  assert.ok(ctx.activeDecision);
  assert.equal(ctx.activeDecision!.id, decision.id);
  assert.ok(ctx.executionSummary, "应从 Execution 恢复摘要");
  assert.equal(ctx.executionSummary!.progress.total, 1);
  assert.equal(ctx.executionSummary!.tasks[0].status, "running");
  assert.ok(ctx.memoryPatterns.length >= 1, "应从 Memory 恢复模式");
  assert.ok(ctx.recentEvents.length >= 1, "应恢复近期事件");
  assert.ok(ctx.createdAt);
  assert.equal(ctx.identity.source, "fixed");
});

// ---------- 4. Runtime 完整流程 ----------
function makeFakeTool(id: string, result: unknown): AgentTool {
  return { id, name: id, description: "fake", execute: async () => result };
}

test("Runtime：完整流程 → completed，工具调用被记录，生命周期回到 idle", async () => {
  const runs = new LocalAgentRunRepository(createMemoryAgentRunStorage());
  const runtime = new AgentRuntime({
    context: {},
    runs,
    tools: [makeFakeTool("tool_a", { ok: 1 }), makeFakeTool("tool_b", { ok: 2 })],
  });
  const run = await runtime.run("user", { tools: ["tool_a", "tool_b"], args: { tool_a: { x: 1 } } });
  assert.equal(run.status, "completed");
  assert.equal(run.trigger, "user");
  assert.equal(run.toolsUsed.length, 2);
  assert.equal(run.toolsUsed[0].toolId, "tool_a");
  assert.equal((run.toolsUsed[0].result as { ok: number }).ok, 1);
  assert.ok(run.startedAt);
  assert.ok(run.completedAt);
  assert.equal(runtime.getLifecycle().getState(), "idle");
  assert.equal(runtime.getLifecycle().getHistory().length, 5);
  // Run 已审计
  const list = await runtime.listRuns();
  assert.equal(list.length, 1);
});

test("Runtime：工具失败 → run failed + error，工具调用记录 error", async () => {
  const runtime = new AgentRuntime({
    context: {},
    tools: [
      makeFakeTool("ok_tool", 1),
      { id: "bad_tool", name: "bad", description: "bad", execute: async () => { throw new Error("boom"); } },
    ],
  });
  const run = await runtime.run("event", { tools: ["ok_tool", "bad_tool"] });
  assert.equal(run.status, "failed");
  assert.ok(run.error?.includes("boom"));
  assert.equal(run.toolsUsed[0].toolId, "ok_tool");
  assert.equal(run.toolsUsed[1].error, "boom");
  assert.equal(runtime.getLifecycle().getState(), "idle", "failed 后回到 idle");
});

test("Runtime：未知工具 → planning 阶段失败", async () => {
  const runtime = new AgentRuntime({ context: {}, tools: [makeFakeTool("a", 1)] });
  const run = await runtime.run("manual", { tools: ["nope"] });
  assert.equal(run.status, "failed");
  assert.ok(run.error?.includes("未知工具"));
});

// ---------- 5. 工具封装（memory / execution） ----------
test("工具：memory_tool 与 execution_tool 调用现有引擎", async () => {
  const decisionRepo = new LocalDecisionRepository(createMemoryDecisionStorage());
  const researchRepo = new LocalResearchRepository(createMemoryResearchStorage());
  const service = new DecisionService({ decisionRepository: decisionRepo, researchRepository: researchRepo, runAi: createReviewRunAi(), userId: "test-user" });
  const memory = new MemoryEngine({ memoryRepository: new LocalMemoryRepository(createMemoryMemoryStorage()), decisionRepository: decisionRepo, researchRepository: researchRepo, userId: "test-user" });

  await makeResearchRun(researchRepo, "opp-tool1");
  const { decision } = await service.createDecision({
    opportunityId: "opp-tool1", decision: "validate", differentFromAi: false,
    judgment: { why: "w", coreJudgment: "c", keyEvidence: "e", biggestRisk: "r", mostImportantAssumption: "a", expectedOutcome: "o" },
  });
  const plan = await service.createValidationPlan({
    decisionId: decision.id, opportunityId: "opp-tool1",
    tasks: [{ assumption: "a", hypothesis: "h", method: "m", sampleSize: "s", successCriteria: "sc", failureCriteria: "fc", deadline: "2020-01-01", costEstimate: "c", owner: "me" }],
  });
  await service.startTask(plan.tasks[0].id);
  await memory.recordDecision(decision.id);

  const runtime = new AgentRuntime({
    context: { decisionRepository: decisionRepo, memory },
    tools: [createMemoryTool({ memoryEngine: memory }), createExecutionTool({ decisionService: service })],
  });

  const run = await runtime.run("scheduled", {
    tools: ["memory_tool", "execution_tool"],
    args: {
      memory_tool: { action: "patterns", query: {} },
      execution_tool: { action: "overdue", decisionId: decision.id },
    },
  });
  assert.equal(run.status, "completed");
  const patterns = run.toolsUsed[0].result as { patterns: unknown[] };
  assert.ok(patterns.patterns.length >= 1);
  const overdue = run.toolsUsed[1].result as { overdue: unknown[] };
  assert.equal(overdue.overdue.length, 1, "2020 截止的任务应超期");
});