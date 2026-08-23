import { test } from "node:test";
import assert from "node:assert/strict";

/**
 * 用量与成本单元测试（支持 OpenAI + DeepSeek 计价）。
 */
process.env.DEEPSEEK_API_KEY = "k";
process.env.OPENAI_API_KEY = "k";
process.env.DEEPSEEK_MODEL = "deepseek-chat";
process.env.OPENAI_RESEARCH_MODEL = "gpt-5.6-terra";
process.env.OPENAI_REASONING_MODEL = "gpt-5.6-sol";
process.env.DEEPSEEK_INPUT_PRICE_PER_1M = "0.27";
process.env.DEEPSEEK_OUTPUT_PRICE_PER_1M = "1.10";
process.env.OPENAI_RESEARCH_INPUT_PRICE_PER_1M = "2.5";
process.env.OPENAI_RESEARCH_OUTPUT_PRICE_PER_1M = "10";
process.env.OPENAI_REASONING_INPUT_PRICE_PER_1M = "5";
process.env.OPENAI_REASONING_OUTPUT_PRICE_PER_1M = "15";

test("DeepSeek 成本估算（1M in + 1M out = 1.37 USD）", async () => {
  const { estimateCost } = await import("../usage");
  assert.equal(estimateCost("deepseek", "deepseek-chat", 1_000_000, 1_000_000), 1.37);
});

test("DeepSeek 成本估算（小样本 1000/500）", async () => {
  const { estimateCost } = await import("../usage");
  assert.equal(estimateCost("deepseek", "deepseek-chat", 1000, 500), 0.00082);
});

test("OpenAI Research 成本估算（1M in + 100k out = 3.5 USD）", async () => {
  const { estimateCost } = await import("../usage");
  assert.equal(estimateCost("openai", "gpt-5.6-terra", 1_000_000, 100_000), 3.5);
});

test("OpenAI Reasoning 成本估算（1M in + 100k out = 6.5 USD）", async () => {
  const { estimateCost } = await import("../usage");
  assert.equal(estimateCost("openai", "gpt-5.6-sol", 1_000_000, 100_000), 6.5);
});

test("recordUsage 记录完整 ai_usage 字段", async () => {
  const { createUsageRecord, recordUsage, getUsageHistory } = await import("../usage");
  const record = recordUsage(
    createUsageRecord({
      provider: "deepseek",
      model: "deepseek-chat",
      task: "classification",
      agent: "opportunity",
      inputTokens: 1000,
      outputTokens: 500,
      success: true,
      durationMs: 120,
    }),
  );
  assert.equal(record.provider, "deepseek");
  assert.equal(record.model, "deepseek-chat");
  assert.equal(record.task, "classification");
  assert.equal(record.agent, "opportunity");
  assert.equal(record.inputTokens, 1000);
  assert.equal(record.outputTokens, 500);
  assert.equal(record.estimatedCost, 0.00082);
  assert.equal(record.durationMs, 120);
  assert.equal(record.success, true);
  assert.ok(record.createdAt, "createdAt 应为 ISO 时间");
  assert.ok(getUsageHistory().some((r) => r.model === "deepseek-chat"));
});

test("失败记录可包含 degraded / fallbackFrom / error", async () => {
  const { createUsageRecord, recordUsage } = await import("../usage");
  const record = recordUsage(
    createUsageRecord({
      provider: "openai",
      model: "gpt-5.6-terra",
      task: "research",
      agent: "research",
      inputTokens: 0,
      outputTokens: 0,
      success: false,
      durationMs: 10,
      degraded: true,
      fallbackFrom: "deepseek",
      error: "boom",
    }),
  );
  assert.equal(record.degraded, true);
  assert.equal(record.fallbackFrom, "deepseek");
  assert.equal(record.error, "boom");
});