/**
 * Tavily Provider + 统一标准化测试（V0.4.1 Phase 6.2-B）。
 * 不依赖真实网络：fetch 全部 mock。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createExternalIntelligence, createTavilyProvider, ExternalIntelligenceError } from "../index";
import { classifySourceType, toExternalSearchResult } from "../standardize";
import type { IntelligenceProvider } from "../types";

// ---------- 1. 统一标准化 ----------
test("标准化：gov/edu 域名 → OFFICIAL_SOURCE，其余 → EXTERNAL_WEB", () => {
  assert.equal(classifySourceType("https://www.census.gov/data"), "OFFICIAL_SOURCE");
  assert.equal(classifySourceType("https://edu.cn/report"), "OFFICIAL_SOURCE");
  assert.equal(classifySourceType("https://example.com/market"), "EXTERNAL_WEB");
});

test("标准化：toExternalSearchResult 统一字段 + provider 打标 + publisher 兜底为 hostname", () => {
  const r = toExternalSearchResult({ title: "市场报告", url: "https://example.com/market", snippet: "摘要", provider: "tavily" });
  assert.equal(r.provider, "tavily");
  assert.equal(r.publisher, "example.com");
  assert.equal(r.sourceType, "EXTERNAL_WEB");
  assert.ok(r.retrievedAt);
});

// ---------- 2. Tavily Provider ----------
test("Tavily：未配置 Key → isConfigured=false，强制调用抛「未配置」", async () => {
  const p = createTavilyProvider({ apiKey: "" });
  assert.equal(p.isConfigured(), false);
  await assert.rejects(p.search("q"), /未配置/);
});

test("Tavily：search 成功 → 结果统一标准化（provider=tavily、snippet=content、publisher=hostname）", async () => {
  let capturedBody = "";
  const original = globalThis.fetch;
  globalThis.fetch = (async (_url: unknown, init: RequestInit | undefined) => {
    capturedBody = String(init?.body ?? "");
    return new Response(
      JSON.stringify({
        results: [
          { title: "万圣节市场报告", url: "https://example.com/halloween", content: "市场规模 100 亿", score: 0.9 },
          { title: "官方数据", url: "https://www.census.gov/halloween", content: "官方统计", score: 0.8 },
        ],
        answer: "摘要",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;
  try {
    const p = createTavilyProvider({ apiKey: "tk-test", baseUrl: "https://api.tavily.com/search" });
    assert.equal(p.isConfigured(), true);
    const results = await p.search("万圣节市场规模", { limit: 3 });
    assert.equal(results.length, 2);
    assert.equal(results[0].provider, "tavily");
    assert.equal(results[0].snippet, "市场规模 100 亿");
    assert.equal(results[0].publisher, "example.com");
    assert.equal(results[1].sourceType, "OFFICIAL_SOURCE", "gov 域名应为官方来源");
    assert.ok(results[0].retrievedAt);
    // 请求体包含 key/query/max_results（不打印 key）
    const body = JSON.parse(capturedBody);
    assert.equal(body.query, "万圣节市场规模");
    assert.equal(body.max_results, 3);
    assert.equal(body.api_key, "tk-test");
    assert.equal(body.include_raw_content, false);
  } finally {
    globalThis.fetch = original;
  }
});

test("Tavily：HTTP 错误 → ExternalIntelligenceError 只暴露状态码（不暴露响应体）", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response("<html>429 too many requests api_key 已泄露?secret</html>", { status: 429 })) as typeof fetch;
  try {
    const p = createTavilyProvider({ apiKey: "tk-test" });
    await assert.rejects(p.search("q"), (err: unknown) => {
      assert.ok(err instanceof ExternalIntelligenceError);
      const msg = (err as ExternalIntelligenceError).message;
      assert.ok(msg.includes("HTTP 429"), "应包含状态码: " + msg);
      assert.equal(msg.includes("已泄露"), false, "不得暴露响应体");
      return true;
    });
  } finally {
    globalThis.fetch = original;
  }
});

test("Tavily：网络失败 → ExternalIntelligenceError", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error("ECONNREFUSED");
  }) as typeof fetch;
  try {
    const p = createTavilyProvider({ apiKey: "tk-test" });
    await assert.rejects(p.search("q"), (err: unknown) => {
      assert.ok(err instanceof ExternalIntelligenceError);
      assert.equal((err as ExternalIntelligenceError).provider, "tavily");
      return true;
    });
  } finally {
    globalThis.fetch = original;
  }
});

// ---------- 3. 追踪字段 / fallback ----------
test("工厂：输出携带 meta（provider/degraded/attempts/retrievedAt）", async () => {
  const layer = createExternalIntelligence([
    {
      id: "tavily",
      priority: 10,
      status: "configured",
      isConfigured: () => true,
      search: async () => [toExternalSearchResult({ title: "t", url: "https://example.com/1", snippet: "s", provider: "tavily" })],
    } as IntelligenceProvider,
  ]);
  const fn = layer.createResearchFn();
  const out = await fn({ query: "q", area: "market", limit: 3 });
  assert.ok(out.meta, "应携带 meta");
  assert.equal(out.meta?.provider, "tavily");
  assert.equal(out.meta?.degraded, false);
  assert.equal(out.meta?.attempts.length, 1);
  assert.ok(out.meta?.retrievedAt);
  assert.equal(out.searches[0].results[0].provider, "tavily");
});

test("fallback：配置的 Tavily 失败 → DuckDuckGo 兜底，degraded=true 且 meta 记录尝试链", async () => {
  const layer = createExternalIntelligence([
    {
      id: "tavily",
      priority: 10,
      status: "configured",
      isConfigured: () => true,
      search: async () => {
        throw new Error("tavily down");
      },
    } as IntelligenceProvider,
    {
      id: "duckduckgo",
      priority: 100,
      status: "configured",
      isConfigured: () => true,
      search: async () => [toExternalSearchResult({ title: "ddg", url: "https://example.com/ddg", snippet: "s", provider: "duckduckgo" })],
    } as IntelligenceProvider,
  ]);
  const fn = layer.createResearchFn();
  const out = await fn({ query: "q", area: "market", limit: 3 });
  assert.equal(out.meta?.provider, "duckduckgo");
  assert.equal(out.meta?.degraded, true);
  assert.equal(out.meta?.attempts.length, 2);
  assert.equal(out.meta?.attempts[0].provider, "tavily");
  assert.equal(out.meta?.attempts[0].ok, false);
  assert.equal(out.meta?.attempts[1].provider, "duckduckgo");
  assert.equal(out.meta?.attempts[1].ok, true);
});