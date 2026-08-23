import { test } from "node:test";
import assert from "node:assert/strict";

/**
 * Router 单元测试。
 * 环境变量必须在加载被测模块之前设置（env 在模块加载时读取）。
 */
process.env.DEEPSEEK_API_KEY = "test-deepseek";
process.env.OPENAI_API_KEY = "test-openai";
process.env.DEEPSEEK_MODEL = "deepseek-chat";
process.env.OPENAI_RESEARCH_MODEL = "gpt-5.6-terra";
process.env.OPENAI_REASONING_MODEL = "gpt-5.6-sol";

test("simple 任务默认路由到 DeepSeek", async () => {
  const { resolveRoute } = await import("../router");
  const route = resolveRoute({ capability: "simple", task: "摘要" });
  assert.equal(route.provider, "deepseek");
  assert.equal(route.model, "deepseek-chat");
  assert.equal(route.capability, "simple");
  assert.equal(route.allowDegrade, true);
});

test("research 任务默认路由到 OpenAI Research", async () => {
  const { resolveRoute } = await import("../router");
  const route = resolveRoute({ capability: "research", task: "深度市场研究" });
  assert.equal(route.provider, "openai");
  assert.equal(route.model, "gpt-5.6-terra");
  assert.equal(route.capability, "research");
});

test("reasoning 任务默认路由到 OpenAI Reasoning", async () => {
  const { resolveRoute } = await import("../router");
  const route = resolveRoute({ capability: "reasoning", task: "复杂商业推理" });
  assert.equal(route.provider, "openai");
  assert.equal(route.model, "gpt-5.6-sol");
});

test("任务类型自动升级：user_research 抬升到 research", async () => {
  const { resolveRoute } = await import("../router");
  const route = resolveRoute({ capability: "simple", task: "用户研究", type: "user_research" });
  assert.equal(route.capability, "research");
  assert.equal(route.provider, "openai");
});

test("任务类型自动升级：examiner 抬升到 reasoning 且禁止降级", async () => {
  const { resolveRoute } = await import("../router");
  const route = resolveRoute({ capability: "simple", task: "评分", type: "examiner" });
  assert.equal(route.capability, "reasoning");
  assert.equal(route.isFinalDecision, true);
  assert.equal(route.allowDegrade, false);
  assert.equal(route.fallback, undefined);
});

test("escalate 显式升级：simple → reasoning", async () => {
  const { resolveRoute } = await import("../router");
  const route = resolveRoute({ capability: "simple", task: "初筛后深入", escalate: "reasoning" });
  assert.equal(route.capability, "reasoning");
  assert.equal(route.provider, "openai");
  assert.equal(route.model, "gpt-5.6-sol");
});

test("final_report 属于最终决策类任务：无 fallback", async () => {
  const { resolveRoute } = await import("../router");
  const route = resolveRoute({ capability: "research", task: "最终报告", type: "final_report" });
  assert.equal(route.capability, "reasoning");
  assert.equal(route.isFinalDecision, true);
  assert.equal(route.fallback, undefined);
});

test("非最终决策的 openai 路由可 fallback 到 deepseek", async () => {
  const { resolveRoute } = await import("../router");
  const route = resolveRoute({ capability: "research", task: "竞品整理" });
  assert.equal(route.provider, "openai");
  assert.equal(route.fallback?.provider, "deepseek");
});

test("deepseek 主路由 fallback 到 openai research", async () => {
  const { resolveRoute } = await import("../router");
  const route = resolveRoute({ capability: "simple", task: "分类" });
  assert.equal(route.provider, "deepseek");
  assert.equal(route.fallback?.provider, "openai");
  assert.equal(route.fallback?.model, "gpt-5.6-terra");
});

test("显式指定 provider 可覆盖默认路由", async () => {
  const { resolveRoute } = await import("../router");
  const route = resolveRoute({ capability: "research", task: "测试", provider: "deepseek" });
  assert.equal(route.provider, "deepseek");
  assert.equal(route.model, "deepseek-chat");
});

test("allowDegrade=false 时禁止降级", async () => {
  const { resolveRoute } = await import("../router");
  const route = resolveRoute({ capability: "research", task: "不允许降级", allowDegrade: false });
  assert.equal(route.allowDegrade, false);
});