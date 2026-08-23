import { test } from "node:test";
import assert from "node:assert/strict";

/**
 * Gateway 端到端单元测试（通过 stub fetch 模拟两个 Provider，不发真实网络请求）。
 */
process.env.DEEPSEEK_API_KEY = "test-deepseek";
process.env.OPENAI_API_KEY = "test-openai";
process.env.DEEPSEEK_MODEL = "deepseek-chat";
process.env.OPENAI_RESEARCH_MODEL = "gpt-5.6-terra";
process.env.OPENAI_REASONING_MODEL = "gpt-5.6-sol";

/** 临时替换全局 fetch，返回恢复函数 */
function stubFetch(handler: typeof fetch): () => void {
  const original = globalThis.fetch;
  globalThis.fetch = handler;
  return () => {
    globalThis.fetch = original;
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function completion(model: string, content = "ok"): unknown {
  return {
    choices: [{ message: { content } }],
    usage: { prompt_tokens: 10, completion_tokens: 5 },
    model,
  };
}

test("DeepSeek 成功调用：返回内容并记录用量", async () => {
  const { runAI } = await import("../gateway");
  const restore = stubFetch(async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    return jsonResponse(completion(body.model, "结构化结果"));
  });
  try {
    const result = await runAI({ capability: "simple", task: "分类", type: "classification", agent: "test" });
    assert.equal(result.provider, "deepseek");
    assert.equal(result.model, "deepseek-chat");
    assert.equal(result.content, "结构化结果");
    assert.equal(result.provider_degraded, false);
    assert.equal(result.usage.inputTokens, 10);
    assert.equal(result.usage.outputTokens, 5);
    assert.equal(result.usage.success, true);
  } finally {
    restore();
  }
});

test("DeepSeek 失败 → fallback OpenAI，provider_degraded=true", async () => {
  const { runAI } = await import("../gateway");
  const restore = stubFetch(async (url) => {
    if (String(url).includes("deepseek.com")) return new Response("boom", { status: 500 });
    return jsonResponse(completion("gpt-5.6-terra", "openai 兜底结果"));
  });
  try {
    const result = await runAI({ capability: "simple", task: "摘要", agent: "test" });
    assert.equal(result.provider, "openai");
    assert.equal(result.provider_degraded, true);
    assert.equal(result.usage.degraded, true);
    assert.equal(result.usage.fallbackFrom, "deepseek");
  } finally {
    restore();
  }
});

test("OpenAI research 失败（允许降级）→ fallback DeepSeek，provider_degraded=true", async () => {
  const { runAI } = await import("../gateway");
  const restore = stubFetch(async (url) => {
    if (String(url).includes("openai.com")) return new Response("rate limited", { status: 429 });
    return jsonResponse(completion("deepseek-chat", "deepseek 兜底"));
  });
  try {
    const result = await runAI({
      capability: "research",
      task: "竞品整理",
      type: "competitor_research",
      agent: "test",
    });
    assert.equal(result.provider, "deepseek");
    assert.equal(result.provider_degraded, true);
    assert.equal(result.usage.fallbackFrom, "openai");
  } finally {
    restore();
  }
});

test("Examiner 失败 → 禁止降级，抛出 PROVIDER_FAILED", async () => {
  const { runAI } = await import("../gateway");
  const { AiGatewayError } = await import("../types");
  const restore = stubFetch(async () => new Response("boom", { status: 500 }));
  try {
    await assert.rejects(
      () => runAI({ capability: "reasoning", task: "评分", type: "examiner", agent: "examiner" }),
      (err: unknown) => {
        assert.ok(err instanceof AiGatewayError);
        assert.equal(err.code, "PROVIDER_FAILED");
        return true;
      },
    );
  } finally {
    restore();
  }
});

test("最终报告失败 → 禁止降级（final_report 也属于最终决策）", async () => {
  const { runAI } = await import("../gateway");
  const { AiGatewayError } = await import("../types");
  const restore = stubFetch(async () => new Response("boom", { status: 500 }));
  try {
    await assert.rejects(
      () => runAI({ capability: "research", task: "最终报告", type: "final_report", agent: "report" }),
      (err: unknown) => err instanceof AiGatewayError && err.code === "PROVIDER_FAILED",
    );
  } finally {
    restore();
  }
});

test("两个 Provider 都失败 → ALL_PROVIDERS_FAILED", async () => {
  const { runAI } = await import("../gateway");
  const { AiGatewayError } = await import("../types");
  const restore = stubFetch(async () => new Response("boom", { status: 500 }));
  try {
    await assert.rejects(
      () => runAI({ capability: "simple", task: "摘要", agent: "test" }),
      (err: unknown) => err instanceof AiGatewayError && err.code === "ALL_PROVIDERS_FAILED",
    );
  } finally {
    restore();
  }
});