/**
 * Personal Knowledge System 测试（V0.4.2 Phase 9B-4）。
 * 覆盖：CRUD / Capture / 确认机制 / 未确认不进 Context / 确认后加载 / Skill 读取 / AgentRuntime 调用。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { KnowledgeEngine } from "../knowledge-engine";
import { LocalKnowledgeRepository, createMemoryKnowledgeStorage } from "../repository";
import { recoverContext } from "../../agent/context";
import { AgentRuntime } from "../../agent/runtime";
import { createKnowledgeTool } from "../../agent/tools/knowledge";
import { createProductSelectionSkill } from "../../skills/product-selection";
import { buildDecisionMemory } from "../../memory/builder";
import type { DecisionMemoryRecord } from "../../memory/types";
import type { DailyReview } from "../../agent/loops/types";
import type { UserDecision } from "../../decision/types";

const NOW = "2026-08-24T00:00:00.000Z";

function makeEngine(): KnowledgeEngine {
  return new KnowledgeEngine(new LocalKnowledgeRepository(createMemoryKnowledgeStorage()), "test-user");
}

function makeMemoryRecord(): DecisionMemoryRecord {
  const base: UserDecision = {
    id: "d1", opportunityId: "o1", decision: "validate", differentFromAi: false,
    judgment: { why: "w", coreJudgment: "倾向低客单快速验证", keyEvidence: "e", biggestRisk: "r", mostImportantAssumption: "a", expectedOutcome: "o" },
    aiScoreSnapshot: { version: 1, overall_score: 6, confidence: 0.5 },
    createdAt: NOW, updatedAt: NOW,
  };
  return buildDecisionMemory({
    decision: base,
    results: [{ id: "r", taskId: "t", planId: "p", decisionId: "d1", opportunityId: "o1", actualSample: "s", actualResult: "ok", userFeedback: "f", outcome: "rejected", submittedBy: "me", submittedAt: NOW }],
    domain: "ecommerce",
    opportunityName: "低价女装测款",
  });
}

function makeReview(): DailyReview {
  return {
    id: "rev-1", userId: "test-user", date: "2026-08-24",
    completedActions: [], decisionComparison: [], lessons: ["假设被证伪：低价女装转化不足", "评分下降 7→5：价格战风险"],
    tomorrowActions: ["处理超期任务", "为决策创建验证计划"], createdAt: NOW,
  };
}

// ---------- 1. CRUD ----------
test("Knowledge CRUD：save/list/findByType/confirm/remove", async () => {
  const engine = makeEngine();
  const rec = await engine.captureFromUserInput({ content: "我主做女装，偏好低库存", type: "habit" });
  assert.equal(rec.confirmed, true, "用户输入直接确认");
  assert.equal((await engine.list()).length, 1);
  assert.equal((await engine.findByType("habit")).length, 1);
  assert.equal((await engine.findByType("failure_case")).length, 0);
  assert.equal(await engine.remove(rec.id), true);
  assert.equal((await engine.list()).length, 0);
});

// ---------- 2. Capture ----------
test("Knowledge Capture：从决策记忆/复盘/用户输入提取候选", async () => {
  const engine = makeEngine();
  // 决策记忆 → 失败案例 + 判断方式（低价）
  const rec = makeMemoryRecord();
  const candidates = await engine.captureFromDecision(rec);
  assert.ok(candidates.some((c) => c.type === "failure_case"), "rejected → failure_case 候选");
  assert.ok(candidates.some((c) => c.type === "judgment_style" && c.content.includes("低客单")), "低价判断方式候选");
  for (const c of candidates) assert.equal(c.confirmed, false, "AI 候选默认未确认");
  // 复盘 → 失败经验 + 任务习惯
  const fromReview = await engine.captureFromReview(makeReview());
  assert.ok(fromReview.some((c) => c.type === "failure_case"));
  assert.ok(fromReview.every((c) => c.confirmed === false));
  // 用户输入 → 立即确认
  const userRec = await engine.captureFromUserInput({ content: "我风险偏好低" });
  assert.equal(userRec.confirmed, true);
});

// ---------- 3. 确认机制 ----------
test("确认机制：未确认 → confirm() → confirmed=true", async () => {
  const engine = makeEngine();
  const [candidate] = await engine.captureFromDecision(makeMemoryRecord());
  assert.equal(candidate.confirmed, false);
  const confirmed = await engine.confirm(candidate.id);
  assert.equal(confirmed?.confirmed, true);
  const loaded = await engine.list(true);
  assert.equal(loaded.length, 1);
});

// ---------- 4/5. Context 集成 ----------
test("Context：未确认 Knowledge 不进 Context；确认后加载", async () => {
  const engine = makeEngine();
  const [candidate] = await engine.captureFromDecision(makeMemoryRecord());
  // 未确认 → 不加载
  let ctx = await recoverContext({ knowledge: engine });
  assert.equal(ctx.knowledgeRecords.length, 0, "未确认知识不得进入 Context");
  // 确认 → 加载
  await engine.confirm(candidate.id);
  ctx = await recoverContext({ knowledge: engine });
  assert.equal(ctx.knowledgeRecords.length, 1);
  assert.equal(ctx.knowledgeRecords[0].confirmed, true);
});

// ---------- 6. Skill 读取 Knowledge ----------
test("Skill：product_selection 读取已确认用户知识", async () => {
  const engine = makeEngine();
  await engine.captureFromUserInput({ content: "我偏好低客单快速验证", type: "judgment_style", tags: ["低价"] });
  const skill = createProductSelectionSkill({ knowledge: engine, runResearch: async () => ({
    sections: [{ area: "market", content: "市场规模可观" }], sources: [], score: { overall_score: 7, confidence: 0.5 },
  }) });
  const ctx = await recoverContext({ knowledge: engine });
  const out = await skill.run(ctx, { productIdea: "针织开衫", category: "女装" });
  const s = out.structured as { userKnowledge?: string[]; suggestedActions: string[] };
  assert.ok(s.userKnowledge && s.userKnowledge.some((k) => k.includes("低客单")), "技能应读取已确认知识");
  assert.ok(s.suggestedActions.some((a) => a.includes("长期经验")), "建议动作应结合用户经验");
});

// ---------- 7. AgentRuntime 调用 Knowledge ----------
test("AgentRuntime：knowledge_tool retrieve/capture → knowledgeReads/Writes 记录", async () => {
  const engine = makeEngine();
  await engine.captureFromUserInput({ content: "我主做女装", type: "habit" });
  const runtime = new AgentRuntime({
    context: {},
    tools: [createKnowledgeTool(engine)],
  });
  // retrieve
  const readRun = await runtime.run("user", { tools: ["knowledge_tool"], args: { knowledge_tool: { action: "retrieve" } } });
  assert.equal(readRun.status, "completed");
  assert.equal(readRun.knowledgeReads?.length, 1);
  assert.equal(readRun.knowledgeReads?.[0].content, "我主做女装");
  // capture
  const writeRun = await runtime.run("user", { tools: ["knowledge_tool"], args: { knowledge_tool: { action: "capture", content: "我供应链在义乌", type: "industry_experience" } } });
  assert.equal(writeRun.status, "completed");
  assert.equal(writeRun.knowledgeWrites?.[0].content, "我供应链在义乌");
  assert.equal(writeRun.knowledgeWrites?.[0].type, "industry_experience");
  // 已入知识库
  assert.equal((await engine.list()).length, 2);
});