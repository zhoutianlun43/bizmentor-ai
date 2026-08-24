/**
 * Business Context Layer 测试（V0.5.0 Phase 10A-3）。
 * 覆盖：Profile 聚合 / Knowledge confirmed 过滤 / Memory 注入 / Agent Runtime 恢复 /
 * Skill 读取 / Local Repository / Supabase Mock。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { BusinessContextBuilder } from "../context-builder";
import { LocalContextRepository, createMemoryContextStorage, SupabaseContextRepository } from "../index";
import { SupabaseRepositoryError } from "../../supabase/errors";
import { LocalProfileRepository, createMemoryProfileStorage } from "../../profile/local-repository";
import { LocalBusinessProfileRepository, createMemoryBusinessProfileStorage } from "../../business/local-repository";
import { KnowledgeEngine } from "../../knowledge/knowledge-engine";
import { LocalKnowledgeRepository, createMemoryKnowledgeStorage } from "../../knowledge/repository";
import { LocalMemoryRepository, createMemoryMemoryStorage } from "../../memory/repository";
import { MemoryEngine } from "../../memory/service";
import { buildDecisionMemory } from "../../memory/builder";
import { recoverContext } from "../../agent/context";
import type { BusinessOSContext, ContextSnapshot } from "../types";
import type { BizSkill } from "../../skills/types";
import type { UserDecision } from "../../decision/types";

const NOW = "2026-08-24T00:00:00.000Z";

class MemoryOpportunityRepo {
  items: Array<{ id: string; name: string }> = [{ id: "opp-1", name: "商机A" }, { id: "opp-2", name: "商机B" }];
  async listOpportunities() { return this.items; }
  async getOpportunity(id: string) { return this.items.find((i) => i.id === id); }
}

function makeProfileRepo() {
  return new LocalProfileRepository(createMemoryProfileStorage());
}

async function makeBuilder(): Promise<{ builder: BusinessContextBuilder; knowledge: KnowledgeEngine; memory: MemoryEngine }> {
  const profileRepo = makeProfileRepo();
  await profileRepo.save({ id: "p1", userId: "test-user", name: "周天伦", timezone: "Asia/Shanghai", language: "zh-CN", preferences: { theme: "dark" }, createdAt: NOW, updatedAt: NOW });
  const businessRepo = new LocalBusinessProfileRepository(createMemoryBusinessProfileStorage());
  await businessRepo.save({ id: "b1", userId: "test-user", name: "我的小店", description: "经营", businessTypes: ["commerce", "service"], preferences: { riskTolerance: "low" }, createdAt: NOW, updatedAt: NOW });

  const knowledge = new KnowledgeEngine(new LocalKnowledgeRepository(createMemoryKnowledgeStorage()), "test-user");
  // confirmed 一条 + 未确认一条
  await knowledge.captureFromUserInput({ content: "我偏好低客单", type: "judgment_style" }); // confirmed=true
  const base: UserDecision = {
    id: "d", opportunityId: "o", decision: "validate", differentFromAi: false,
    judgment: { why: "w", coreJudgment: "测款", keyEvidence: "e", biggestRisk: "r", mostImportantAssumption: "a", expectedOutcome: "o" },
    createdAt: NOW, updatedAt: NOW,
  };
  const rec = buildDecisionMemory({ decision: base, results: [{ id: "r", taskId: "t", planId: "p", decisionId: "d", opportunityId: "o", actualSample: "s", actualResult: "no", userFeedback: "f", outcome: "rejected", submittedBy: "me", submittedAt: NOW }], domain: "ecommerce", opportunityName: "失败案例" });
  await knowledge.captureFromDecision(rec); // unconfirmed candidates

  // 直接写 memory records（一条 confirmed 决策 → 可检索出模式）
  const memRepo = new LocalMemoryRepository(createMemoryMemoryStorage());
  const memRec = buildDecisionMemory({ decision: base, results: [{ id: "r2", taskId: "t", planId: "p", decisionId: "d", opportunityId: "o", actualSample: "s", actualResult: "ok", userFeedback: "f", outcome: "confirmed", submittedBy: "me", submittedAt: NOW }], domain: "ecommerce", opportunityName: "成功案例" });
  await memRepo.saveRecords([memRec]);
  const memory2 = new MemoryEngine({ memoryRepository: memRepo, decisionRepository: {} as never });

  const builder = new BusinessContextBuilder({
    profileRepository: profileRepo,
    businessRepository: businessRepo,
    knowledge,
    memory: memory2,
    opportunityRepository: new MemoryOpportunityRepo() as never,
    userId: "test-user",
    now: new Date("2026-08-24T12:00:00.000Z"),
  });
  return { builder, knowledge, memory: memory2 };
}

// ---------- 1. Profile 聚合 ----------
test("BusinessContext：PersonalProfile + BusinessProfile 成功构建", async () => {
  const { builder } = await makeBuilder();
  const ctx = await builder.build();
  assert.equal(ctx.userId, "test-user");
  assert.equal(ctx.personalProfile?.name, "周天伦");
  assert.equal(ctx.businessProfile?.name, "我的小店");
  assert.deepEqual(ctx.businessProfile?.businessTypes, ["commerce", "service"]);
  assert.equal(ctx.preferences.theme, "dark");
  assert.equal(ctx.preferences.riskTolerance, "low", "personal+business 偏好合并");
  assert.ok(ctx.activeProjects.length >= 2, "当前业务状态注入");
});

// ---------- 2/3. Knowledge confirmed 过滤 ----------
test("BusinessContext：confirmed=false 不进入；confirmed=true 进入", async () => {
  const { builder } = await makeBuilder();
  const ctx = await builder.build();
  assert.ok(ctx.confirmedKnowledge.length >= 1);
  assert.ok(ctx.confirmedKnowledge.every((k) => k.confirmed === true), "只允许 confirmed=true");
  assert.ok(ctx.confirmedKnowledge.some((k) => k.content.includes("低客单")), "confirmed 知识进入");
  assert.equal(ctx.confirmedKnowledge.some((k) => k.content.includes("失败案例")), false, "未确认候选不进入");
});

// ---------- 4. Memory 注入 ----------
test("BusinessContext：Memory Pattern 正常注入", async () => {
  const { builder } = await makeBuilder();
  const ctx = await builder.build();
  assert.ok(ctx.memoryPatterns.length >= 1, "应注入历史决策模式");
});

// ---------- 5. Agent Runtime 恢复 ----------
test("Agent Runtime：通过 contextBuilder 恢复 BusinessContext", async () => {
  const { builder } = await makeBuilder();
  const ctx = await recoverContext({ contextBuilder: builder });
  assert.equal(ctx.businessContext.userId, "test-user");
  assert.equal(ctx.businessContext.personalProfile?.name, "周天伦");
  assert.ok(ctx.businessContext.confirmedKnowledge.length >= 1);
});

// ---------- 6. Skill 读取 BusinessContext ----------
test("Skill：可读取 BusinessContext（只读）", async () => {
  const { builder } = await makeBuilder();
  const ctx = await recoverContext({ contextBuilder: builder });
  const skill: BizSkill = {
    id: "read_ctx", name: "读取", description: "d", domain: "ecommerce", requiredTools: [],
    run: async (c) => ({
      summary: `${c.businessContext.personalProfile?.name ?? "?"}|${c.businessContext.businessProfile?.businessTypes.join(",") ?? "?"}`,
      structured: {}, actions: [], evidence: [], createdAt: NOW,
    }),
  };
  const out = await skill.run(ctx, {});
  assert.equal(out.summary, "周天伦|commerce,service");
});

// ---------- 7. Local Repository ----------
test("ContextRepository Local：save/get/clear", async () => {
  const repo = new LocalContextRepository(createMemoryContextStorage());
  const snapshot: ContextSnapshot = { userId: "u1", context: { userId: "u1", personalProfile: null, businessProfile: null, confirmedKnowledge: [], memoryPatterns: [], activeProjects: [], preferences: {}, updatedAt: NOW }, savedAt: NOW };
  await repo.save(snapshot);
  const got = await repo.get("u1");
  assert.equal(got?.context.userId, "u1");
  await repo.clear("u1");
  assert.equal(await repo.get("u1"), undefined);
});

// ---------- 8. Supabase Mock ----------
test("ContextRepository Supabase：save/get（mock）+ 错误包装", async () => {
  const db: Array<Record<string, unknown>> = [];
  const client = {
    from: () => ({
      upsert: async (row: Record<string, unknown>) => { db.push(row); return { error: null }; },
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: db.find((r) => r.user_id === "u1") ?? null, error: null }) }) }),
      delete: () => ({ eq: async () => { db.length = 0; return { error: null }; } }),
    }),
  } as never;
  const repo = new SupabaseContextRepository(client, { userId: "u1" });
  const ctx: BusinessOSContext = { userId: "u1", personalProfile: null, businessProfile: null, confirmedKnowledge: [], memoryPatterns: [], activeProjects: [], preferences: {}, updatedAt: NOW };
  await repo.save({ userId: "u1", context: ctx, savedAt: NOW });
  const got = await repo.get("u1");
  assert.equal(got?.context.userId, "u1");
  await repo.clear("u1");
  assert.equal(await repo.get("u1"), undefined);

  const badClient = { from: () => ({ upsert: async () => ({ error: { message: "db down" } }) }) } as never;
  const badRepo = new SupabaseContextRepository(badClient, { userId: "u" });
  await assert.rejects(() => badRepo.save({ userId: "u", context: ctx, savedAt: NOW }), (e: unknown) => {
    assert.ok(e instanceof SupabaseRepositoryError);
    return true;
  });
});