/**
 * LLM Provider 测试（V0.6.0 MVP）。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createDeepSeekProvider } from "../deepseek";
import { createOpenAICompatibleProvider } from "../openai-compatible";
import { buildBusinessSystemPrompt, getLlm, __resetLlm } from "../index";
import type { BusinessOSContext } from "../../context/types";

const NOW = "2026-08-24T00:00:00.000Z";

function mockFetch(content: string, status = 200) {
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status, headers: { "Content-Type": "application/json" } })) as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

test("OpenAI-compatible Provider：generate 返回 content + provider/model", async () => {
  const restore = mockFetch("你好，我是 BizMentor。");
  try {
    const p = createOpenAICompatibleProvider({ apiKey: "test-key", baseUrl: "https://example.com/v1", model: "gpt-x" });
    const res = await p.generate([{ role: "user", content: "hi" }]);
    assert.equal(res.content, "你好，我是 BizMentor。");
    assert.equal(res.provider, "openai-compatible");
    assert.equal(res.model, "gpt-x");
  } finally {
    restore();
  }
});

test("DeepSeek Provider：走 OpenAI-compatible 接口", async () => {
  const restore = mockFetch("DeepSeek 回复");
  try {
    const p = createDeepSeekProvider();
    const res = await p.generate([{ role: "user", content: "hi" }]);
    assert.equal(res.content, "DeepSeek 回复");
    assert.equal(res.provider, "openai-compatible");
  } finally {
    restore();
  }
});

test("Provider：HTTP 错误抛错（安全摘要，不含 Key）", async () => {
  const restore = mockFetch("", 429);
  try {
    const p = createOpenAICompatibleProvider({ apiKey: "secret", baseUrl: "https://x/v1", model: "m" });
    await assert.rejects(() => p.generate([{ role: "user", content: "hi" }]), /HTTP 429/);
  } finally {
    restore();
  }
});

test("getLlm：未配置 Key 抛错（测试环境无 Key）", () => {
  __resetLlm();
  assert.throws(() => getLlm(), /未配置 LLM API Key/);
});

function makeCtx(): BusinessOSContext {
  return {
    userId: "u1",
    personalProfile: { id: "p", userId: "u1", name: "周", timezone: "Asia/Shanghai", language: "zh-CN", preferences: { riskTolerance: "low" }, createdAt: NOW, updatedAt: NOW },
    businessProfile: { id: "b", userId: "u1", name: "我的小店", description: "经营", businessTypes: ["commerce", "service"], preferences: {}, createdAt: NOW, updatedAt: NOW },
    confirmedKnowledge: [{ id: "k1", userId: "u1", type: "judgment_style", content: "我偏好低客单快速验证", tags: [], source: "user_input", confidence: 1, confirmed: true, createdAt: NOW }],
    memoryPatterns: [{ domain: "ecommerce", decision: "validate", count: 2, confirmRate: 0.5, commonLessons: ["测款有效"], records: ["d1"] }],
    activeProjects: [{ id: "o1" }, { id: "o2" }],
    preferences: { riskTolerance: "low" },
    updatedAt: NOW,
  };
}

test("buildBusinessSystemPrompt：注入用户/经营/认知/历史/状态", () => {
  const prompt = buildBusinessSystemPrompt(makeCtx());
  assert.ok(prompt.includes("周"));
  assert.ok(prompt.includes("我的小店"));
  assert.ok(prompt.includes("commerce、service"));
  assert.ok(prompt.includes("低客单快速验证"));
  assert.ok(prompt.includes("2 条"));
  assert.ok(prompt.includes("2 个商机在册"));
});

test("buildBusinessSystemPrompt：空上下文 → 通用提示", () => {
  const prompt = buildBusinessSystemPrompt(undefined);
  assert.ok(prompt.includes("BizMentor"));
});

test("buildBusinessSystemPrompt：个人AI商业伙伴角色 + 简洁回复要求", () => {
  const prompt = buildBusinessSystemPrompt(makeCtx());
  assert.ok(prompt.includes("个人AI商业伙伴"));
  assert.ok(prompt.includes("300-800 字"));
  assert.ok(prompt.includes("不要默认输出长篇报告"));
  assert.ok(prompt.includes("我了解你的情况"));
});

test("buildBusinessSystemPrompt：高级指令 → 深度输出引导", () => {
  const prompt = buildBusinessSystemPrompt(makeCtx(), { deep: true, command: "report" });
  assert.ok(prompt.includes("商业报告"));
  const plain = buildBusinessSystemPrompt(makeCtx());
  assert.ok(plain.includes("300-800 字"));
});