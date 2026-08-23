import { test } from "node:test";
import assert from "node:assert/strict";

/**
 * 未配置场景：仅配置 OpenAI，DeepSeek 未配置。
 * 验证 DeepSeek 未配置（NOT_CONFIGURED）时自动 fallback 到 OpenAI。
 */
process.env.OPENAI_API_KEY = "test-openai";
// DEEPSEEK_API_KEY 故意不设置

function stubFetch(handler: typeof fetch): () => void {
  const original = globalThis.fetch;
  globalThis.fetch = handler;
  return () => {
    globalThis.fetch = original;
  };
}

test("DeepSeek 未配置 → fallback OpenAI 成功，provider_degraded=true", async () => {
  const { runAI } = await import("../gateway");
  const restore = stubFetch(async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: "from openai" } }],
        usage: { prompt_tokens: 1, completion_tokens: 1 },
        model: body.model,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });
  try {
    const result = await runAI({ capability: "simple", task: "分类", agent: "test" });
    assert.equal(result.provider, "openai");
    assert.equal(result.provider_degraded, true);
    assert.equal(result.usage.degraded, true);
    assert.equal(result.usage.fallbackFrom, "deepseek");
  } finally {
    restore();
  }
});