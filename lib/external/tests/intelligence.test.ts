/**
 * External Intelligence Layer 测试（V0.4.1 Phase 6.2-A）。
 * 覆盖：注册表 / 路由 fallback / 读取兜底 / 工厂 / Pipeline 兼容 / 骨架 Provider。
 * 不依赖真实网络（Provider 全部注入 fake；仅 readWebPage 兜底测试用 mock fetch）。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createExternalIntelligence, createDefaultExternalIntelligence, ExternalIntelligenceError } from "../index";
import { IntelligenceRegistry } from "../registry";
import { routeSearch } from "../router";
import { duckduckgoIntelligenceProvider } from "../providers/duckduckgo";
import { createBingProvider } from "../providers/bing";
import { createGoogleProvider } from "../providers/google";
import { runResearchPipeline } from "../../research/pipeline";
import { createHappyRunAi, makeOptions, sampleInput } from "../../research/tests/helpers";
import type {
  ExternalSearchResult,
  ExtractedDocument,
  IntelligenceProvider,
} from "../types";

function result(url: string, title = "结果"): ExternalSearchResult {
  return {
    title,
    url,
    snippet: "摘要",
    publisher: "example.com",
    sourceType: "EXTERNAL_WEB",
    retrievedAt: "2026-08-24T00:00:00.000Z",
  };
}

function doc(url: string): ExtractedDocument {
  return {
    id: "doc-" + url.length,
    title: "文档",
    sourceType: "EXTERNAL_WEB",
    content: "内容",
    url,
    publisher: "example.com",
    retrievedAt: "2026-08-24T00:00:00.000Z",
    createdAt: "2026-08-24T00:00:00.000Z",
  };
}

function fakeProvider(
  id: string,
  priority: number,
  impl: {
    search?: (q: string, opts?: { limit?: number }) => Promise<ExternalSearchResult[]>;
    read?: (url: string) => Promise<ExtractedDocument>;
    configured?: boolean;
  } = {},
): IntelligenceProvider {
  return {
    id,
    priority,
    status: impl.configured === false ? "not_configured" : "configured",
    isConfigured: () => impl.configured !== false,
    search: impl.search ?? (async () => [result("https://example.com/" + id)]),
    read: impl.read,
  };
}

// ---------- 1. 注册表 ----------
test("注册表：按 priority 升序、去重、get", () => {
  const reg = new IntelligenceRegistry([
    fakeProvider("b", 20),
    fakeProvider("a", 10),
    fakeProvider("a", 5), // 同 id 后注册覆盖
  ]);
  const ids = reg.list().map((p) => p.id);
  assert.deepEqual(ids, ["a", "b"]);
  assert.equal(reg.get("a")?.priority, 5);
  assert.equal(reg.get("zzz"), undefined);
});

test("注册表：enabled 过滤未配置 Provider", () => {
  const reg = new IntelligenceRegistry([
    fakeProvider("ddg", 100, { configured: true }),
    fakeProvider("tavily", 10, { configured: false }),
  ]);
  const enabled = reg.enabled().map((p) => p.id);
  assert.deepEqual(enabled, ["ddg"]);
});

// ---------- 2. 路由 fallback ----------
test("路由：主 Provider 成功（无降级）", async () => {
  const outcome = await routeSearch([fakeProvider("a", 10), fakeProvider("b", 20)], "q");
  assert.equal(outcome.provider, "a");
  assert.equal(outcome.degraded, false);
  assert.equal(outcome.attempts.length, 1);
  assert.equal(outcome.results.length, 1);
});

test("路由：主 Provider 失败 → fallback，degraded=true", async () => {
  const outcome = await routeSearch(
    [
      fakeProvider("a", 10, {
        search: async () => {
          throw new Error("a 挂了");
        },
      }),
      fakeProvider("b", 20),
    ],
    "q",
  );
  assert.equal(outcome.provider, "b");
  assert.equal(outcome.degraded, true);
  assert.equal(outcome.attempts.length, 2);
  assert.equal(outcome.attempts[0].ok, false);
  assert.equal(outcome.attempts[1].ok, true);
});

test("路由：全部失败 → ExternalIntelligenceError（带 attempts）", async () => {
  await assert.rejects(
    routeSearch(
      [
        fakeProvider("a", 10, { search: async () => { throw new Error("x"); } }),
        fakeProvider("b", 20, { search: async () => { throw new Error("y"); } }),
      ],
      "q",
    ),
    (err: unknown) => {
      assert.ok(err instanceof ExternalIntelligenceError);
      assert.equal((err as ExternalIntelligenceError).provider, "all");
      assert.ok((err as ExternalIntelligenceError).message.includes("a:fail → b:fail"));
      return true;
    },
  );
});

test("路由：未配置 Provider 不参与路由（enabled 过滤）", async () => {
  const layer = createExternalIntelligence([
    fakeProvider("tavily", 10, { configured: false, search: async () => { throw new Error("不应被调用"); } }),
    fakeProvider("ddg", 100),
  ]);
  const outcome = await layer.search("q");
  assert.equal(outcome.provider, "ddg");
});

// ---------- 3. 读取兜底 ----------
test("读取：Provider.read 链优先，全部失败走通用 reader 兜底", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response("<html><head><title>兜底文档</title></head><body><p>兜底内容</p></body></html>", {
      status: 200,
      headers: { "Content-Type": "text/html" },
    })) as typeof fetch;
  try {
    const providers = [
      fakeProvider("a", 10, { read: async () => { throw new Error("read 失败"); } }),
      fakeProvider("b", 20), // 无 read
    ];
    const layer = createExternalIntelligence(providers);
    const d = await layer.read("https://example.com/fallback");
    assert.equal(d.title, "兜底文档");
    assert.equal(d.content.includes("兜底内容"), true);
  } finally {
    globalThis.fetch = original;
  }
});

// ---------- 4. 工厂 / Pipeline 兼容 ----------
test("工厂：createExternalResearchFn 输出 ExternalResearchOutput 形状", async () => {
  const layer = createExternalIntelligence([
    fakeProvider("ddg", 100, {
      search: async () => [result("https://example.com/1"), result("https://example.com/2")],
      read: async (url) => doc(url),
    }),
  ]);
  const fn = layer.createResearchFn();
  const out = await fn({ query: "万圣节市场", area: "market", limit: 3 });
  assert.equal(out.searches.length, 1);
  assert.equal(out.searches[0].results.length, 2);
  assert.equal(out.documents.length, 2);
  assert.ok(out.searches[0].documents.length >= 1);
});

test("工厂：搜索失败返回空结果（不抛错，Pipeline 标记证据不足）", async () => {
  const layer = createExternalIntelligence([
    fakeProvider("a", 10, { search: async () => { throw new Error("搜索失败"); } }),
  ]);
  const fn = layer.createResearchFn();
  const out = await fn({ query: "q", area: "market", limit: 3 });
  assert.equal(out.searches[0].results.length, 0);
  assert.equal(out.documents.length, 0);
});

test("Pipeline 兼容：runResearchPipeline 注入 Layer 生成的 ExternalResearchFn 可完整跑通", async () => {
  const layer = createExternalIntelligence([
    fakeProvider("ddg", 100, {
      search: async () => [result("https://example.com/market", "市场报告")],
      read: async (url) => doc(url),
    }),
  ]);
  const run = await runResearchPipeline(sampleInput, makeOptions(createHappyRunAi(), layer.createResearchFn()));
  assert.ok(run.report);
  assert.ok(run.sourceDocuments.some((d) => d.sourceType === "EXTERNAL_WEB"), "应包含外部来源文档");
});

// ---------- 5. 默认 Layer 与骨架 Provider ----------
test("默认 Layer：env 默认只有 duckduckgo 已配置，Tavily/Bing/Google 未配置", () => {
  const layer = createDefaultExternalIntelligence();
  const enabled = layer.enabled().map((p) => p.id);
  assert.ok(enabled.includes("duckduckgo"));
  // 骨架 Provider 未配 Key → 不参与路由
  for (const id of ["tavily", "bing", "google"]) {
    const p = layer.get(id);
    if (p) assert.equal(p.isConfigured(), false, id + " 未配置 Key 时应为 false");
  }
});

test("DuckDuckGo 适配器：id/priority/isConfigured", () => {
  assert.equal(duckduckgoIntelligenceProvider.id, "duckduckgo");
  assert.equal(duckduckgoIntelligenceProvider.isConfigured(), true);
  assert.ok(duckduckgoIntelligenceProvider.read, "应提供 read");
});

test("骨架 Provider：Bing/Google 未配置 → isConfigured=false 且强制调用抛「未配置」；配置但未接入 → NOT_IMPLEMENTED", async () => {
  // 未配置 Key：isConfigured=false，强制调用抛「未配置」错误（路由应跳过）
  const bing = createBingProvider({ apiKey: "" });
  const google = createGoogleProvider({ apiKey: "", cx: "" });
  assert.equal(bing.isConfigured(), false);
  assert.equal(google.isConfigured(), false);
  await assert.rejects(bing.search("q"), /未配置/);
  await assert.rejects(google.search("q"), /未配置/);

  // 配置了 Key（接口就绪但未接入商业数据源）：明确抛 NOT_IMPLEMENTED，禁止静默返回
  const bingReady = createBingProvider({ apiKey: "bk-test" });
  const googleReady = createGoogleProvider({ apiKey: "gk-test", cx: "cx-test" });
  assert.equal(bingReady.isConfigured(), true);
  assert.equal(googleReady.isConfigured(), true);
  await assert.rejects(bingReady.search("q"), /尚未接入商业数据源/);
  await assert.rejects(googleReady.search("q"), /尚未接入商业数据源/);
});