import { test } from "node:test";
import assert from "node:assert/strict";

/** Provider 层单元测试（stub fetch，无真实请求） */
process.env.OPENAI_API_KEY = "test-openai";
process.env.DEEPSEEK_API_KEY = "test-deepseek";

function stubFetch(handler: typeof fetch): () => void {
  const original = globalThis.fetch;
  globalThis.fetch = handler;
  return () => {
    globalThis.fetch = original;
  };
}

function okHandler(model: string): typeof fetch {
  return async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: "hello" } }],
        usage: { prompt_tokens: 7, completion_tokens: 3 },
        model: body.model ?? model,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };
}

test("openai provider 解析成功响应", async () => {
  const { openaiProvider } = await import("../providers/openai");
  const restore = stubFetch(okHandler("gpt-5.6-terra"));
  try {
    const res = await openaiProvider.chat({
      model: "gpt-5.6-terra",
      messages: [{ role: "user", content: "x" }],
    });
    assert.equal(res.content, "hello");
    assert.equal(res.model, "gpt-5.6-terra");
    assert.equal(res.inputTokens, 7);
    assert.equal(res.outputTokens, 3);
  } finally {
    restore();
  }
});

test("openai provider HTTP 401 → AiProviderError(HTTP_ERROR)", async () => {
  const { openaiProvider } = await import("../providers/openai");
  const { AiProviderError } = await import("../types");
  const restore = stubFetch(async () => new Response("Unauthorized", { status: 401 }));
  try {
    await assert.rejects(
      () => openaiProvider.chat({ model: "m", messages: [] }),
      (err: unknown) =>
        err instanceof AiProviderError &&
        err.code === "HTTP_ERROR" &&
        err.provider === "openai",
    );
  } finally {
    restore();
  }
});

test("deepseek provider 解析成功响应", async () => {
  const { deepseekProvider } = await import("../providers/deepseek");
  const restore = stubFetch(okHandler("deepseek-chat"));
  try {
    const res = await deepseekProvider.chat({
      model: "deepseek-chat",
      messages: [{ role: "user", content: "x" }],
    });
    assert.equal(res.content, "hello");
    assert.equal(res.model, "deepseek-chat");
    assert.equal(res.inputTokens, 7);
  } finally {
    restore();
  }
});

test("响应缺少 content → INVALID_RESPONSE", async () => {
  const { deepseekProvider } = await import("../providers/deepseek");
  const { AiProviderError } = await import("../types");
  const restore = stubFetch(async () =>
    new Response(JSON.stringify({ choices: [] }), { status: 200 }),
  );
  try {
    await assert.rejects(
      () => deepseekProvider.chat({ model: "m", messages: [] }),
      (err: unknown) => err instanceof AiProviderError && err.code === "INVALID_RESPONSE",
    );
  } finally {
    restore();
  }
});