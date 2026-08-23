/**
 * V0.2 → V0.3 真实 API Smoke Test（OpenAI + DeepSeek）
 *
 * 用法：pnpm test:smoke
 *
 * - 从项目根目录 .env.local 读取 OPENAI_API_KEY / DEEPSEEK_API_KEY（值绝不打印）
 * - 真实调用 DeepSeek（simple）与 OpenAI（research）各一次
 * - 验证：Router 三级路由、inputTokens/outputTokens、estimatedCost、ai_usage 落盘
 *
 * 安全：失败时只输出 HTTP 状态 / 错误类型 / 安全摘要；
 *       绝不打印 API Key，也绝不打印 Authorization header。
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { AiGatewayError, AiProviderError } from "../types";

/** 从项目根目录加载 .env.local（不覆盖已有环境变量） */
function loadEnvLocal(): void {
  const file = join(process.cwd(), ".env.local");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

/** 从失败信息中安全提取 HTTP 状态码（不打印原始错误内容） */
function extractHttpStatus(message: string | undefined): number | undefined {
  if (!message) return undefined;
  const match = message.match(/\b([2-5]\d{2})\b/);
  return match ? Number(match[1]) : undefined;
}

interface SafeFailure {
  type: string;
  httpStatus?: number;
  summary: string;
}

/** 安全摘要：只暴露错误类型 / HTTP 状态 / 固定文案，绝不暴露 Key 或响应原文 */
function summarizeError(error: unknown): SafeFailure {
  if (error instanceof AiProviderError) {
    const summaries: Record<string, string> = {
      NOT_CONFIGURED: "API Key 未配置（服务端环境变量缺失）",
      HTTP_ERROR: "上游 API 返回非 2xx 状态",
      TIMEOUT: "请求超时",
      INVALID_RESPONSE: "响应格式异常",
    };
    return {
      type: `AiProviderError:${error.code}`,
      httpStatus: extractHttpStatus(error.message),
      summary: summaries[error.code] ?? "Provider 错误",
    };
  }
  if (error instanceof AiGatewayError) {
    const summaries: Record<string, string> = {
      PROVIDER_FAILED: "主 Provider 调用失败（本次 smoke 已关闭降级）",
      ALL_PROVIDERS_FAILED: "主 Provider 与 fallback 均失败",
      INVALID_INPUT: "输入参数无效",
    };
    const usage = error.details?.usage as { error?: string } | undefined;
    return {
      type: `AiGatewayError:${error.code}`,
      httpStatus: extractHttpStatus(usage?.error),
      summary: summaries[error.code] ?? "网关错误",
    };
  }
  return { type: (error as Error).name, summary: "未知错误" };
}

interface SmokeResult {
  pass: boolean;
  model?: string;
  latencyMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
  failure?: SafeFailure;
}

async function main(): Promise<void> {
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const hasDeepSeek = Boolean(process.env.DEEPSEEK_API_KEY);

  // 动态导入：必须在 loadEnvLocal() 之后，确保 env 配置读到 Key
  const { runAI } = await import("../gateway");
  const { resolveRoute } = await import("../router");
  const { estimateCost, getUsageHistory } = await import("../usage");
  const { env } = await import("../../config/env");

  console.log(`OPENAI_API_KEY: ${hasOpenAI ? "configured" : "MISSING"}`);
  console.log(`DEEPSEEK_API_KEY: ${hasDeepSeek ? "configured" : "MISSING"}`);

  // ---------- Router 验证（不发起网络请求） ----------
  const rSimple = resolveRoute({ capability: "simple", task: "x" });
  const rResearch = resolveRoute({ capability: "research", task: "x" });
  const rReasoning = resolveRoute({ capability: "reasoning", task: "x" });
  const routerPass =
    rSimple.provider === "deepseek" &&
    rResearch.provider === "openai" &&
    rReasoning.provider === "openai";

  // ---------- DeepSeek 真实调用（simple） ----------
  const deepseek: SmokeResult = { pass: false };
  if (hasDeepSeek) {
    try {
      const t0 = Date.now();
      const res = await runAI({
        capability: "simple",
        task: "把下面的商机描述按【用户 / 痛点 / 付费意愿 / 风险】四个字段整理输出：\n本地宠物洗护到家服务，面向社区养宠家庭，提供上门洗护预约与会员服务。",
        type: "classification",
        agent: "smoke-test",
        allowDegrade: false,
      });
      const tokensOk = res.usage.inputTokens > 0 && res.usage.outputTokens > 0;
      const costOk = Math.abs(estimateCost(res.provider, res.model, res.usage.inputTokens, res.usage.outputTokens) - res.usage.estimatedCost) < 1e-9;
      deepseek.pass = res.provider === "deepseek" && tokensOk && costOk;
      deepseek.model = res.model;
      deepseek.latencyMs = Date.now() - t0;
      deepseek.inputTokens = res.usage.inputTokens;
      deepseek.outputTokens = res.usage.outputTokens;
      deepseek.cost = res.usage.estimatedCost;
    } catch (error) {
      deepseek.failure = summarizeError(error);
    }
  } else {
    deepseek.failure = { type: "NOT_RUN", summary: "DEEPSEEK_API_KEY 未配置，跳过真实调用" };
  }

  // ---------- OpenAI 真实调用（research） ----------
  const openai: SmokeResult = { pass: false };
  if (hasOpenAI) {
    try {
      const t0 = Date.now();
      const res = await runAI({
        capability: "research",
        task: "请用 3 句话说明：一份高质量的深度市场研究应覆盖哪些关键模块？",
        type: "competitor_research",
        agent: "smoke-test",
        allowDegrade: false,
      });
      const tokensOk = res.usage.inputTokens > 0 && res.usage.outputTokens > 0;
      const costOk = Math.abs(estimateCost(res.provider, res.model, res.usage.inputTokens, res.usage.outputTokens) - res.usage.estimatedCost) < 1e-9;
      openai.pass = res.provider === "openai" && tokensOk && costOk;
      openai.model = res.model;
      openai.latencyMs = Date.now() - t0;
      openai.inputTokens = res.usage.inputTokens;
      openai.outputTokens = res.usage.outputTokens;
      openai.cost = res.usage.estimatedCost;
    } catch (error) {
      openai.failure = summarizeError(error);
    }
  } else {
    openai.failure = { type: "NOT_RUN", summary: "OPENAI_API_KEY 未配置，跳过真实调用" };
  }

  // ---------- ai_usage 落盘验证 ----------
  const usageFile = env.aiUsageFile || join(process.cwd(), ".data", "ai_usage.jsonl");
  let fileRecords = 0;
  if (existsSync(usageFile)) {
    fileRecords = readFileSync(usageFile, "utf8")
      .split(/\r?\n/)
      .filter((line) => line.includes('"agent":"smoke-test"')).length;
  }
  const inMemoryOk = getUsageHistory().some((u) => u.agent === "smoke-test" && u.success);
  const usagePass = inMemoryOk && fileRecords > 0;

  // ---------- 输出（按约定格式） ----------
  const line = (label: string, value: string | number | undefined) =>
    console.log(`${label}: ${value ?? "-"}`);

  console.log("\nDeepSeek:");
  if (deepseek.pass) {
    console.log("PASS");
  } else {
    console.log("FAIL");
  }
  line("model", deepseek.model);
  line("latency", deepseek.latencyMs !== undefined ? `${deepseek.latencyMs}ms` : undefined);
  line("tokens", deepseek.inputTokens !== undefined ? `${deepseek.inputTokens} in / ${deepseek.outputTokens} out` : undefined);
  if (deepseek.failure) {
    const f = deepseek.failure;
    line("failure", `${f.type}${f.httpStatus ? ` | HTTP ${f.httpStatus}` : ""} | ${f.summary}`);
  }

  console.log("\nOpenAI:");
  if (openai.pass) {
    console.log("PASS");
  } else {
    console.log("FAIL");
  }
  line("model", openai.model);
  line("latency", openai.latencyMs !== undefined ? `${openai.latencyMs}ms` : undefined);
  line("tokens", openai.inputTokens !== undefined ? `${openai.inputTokens} in / ${openai.outputTokens} out` : undefined);
  if (openai.failure) {
    const f = openai.failure;
    line("failure", `${f.type}${f.httpStatus ? ` | HTTP ${f.httpStatus}` : ""} | ${f.summary}`);
  }

  console.log("\nRouter:");
  console.log(`simple → ${rSimple.provider}${routerPass ? "" : " (预期 deepseek)"}`);
  console.log(`research → ${rResearch.provider}${rResearch.provider === "openai" ? "" : " (预期 openai)"}`);
  console.log(`reasoning → ${rReasoning.provider}${rReasoning.provider === "openai" ? "" : " (预期 openai)"}`);

  console.log("\nCost:");
  const fmt = (n: number | undefined) => (n === undefined ? "-" : `$${n.toFixed(6)}`);
  const dsUnit = estimateCost("deepseek", env.deepseekModel, 1_000_000, 1_000_000);
  const oaUnit = estimateCost("openai", env.openaiResearchModel, 1_000_000, 1_000_000);
  const reasonUnit = estimateCost("openai", env.openaiReasoningModel, 1_000_000, 1_000_000);
  console.log(`DeepSeek: ${fmt(deepseek.cost)} (本次调用) | 单位价 in $${env.deepseekInputPricePer1M} / out $${env.deepseekOutputPricePer1M} per 1M（1M+1M=${dsUnit}）`);
  console.log(`OpenAI Research: ${fmt(openai.cost)} (本次调用) | 单位价 in $${env.openaiResearchInputPricePer1M} / out $${env.openaiResearchOutputPricePer1M} per 1M（1M+1M=${oaUnit}）`);
  console.log(`OpenAI Reasoning: 未调用 | 单位价 in $${env.openaiReasoningInputPricePer1M} / out $${env.openaiReasoningOutputPricePer1M} per 1M（1M+1M=${reasonUnit}）`);

  console.log("\nVerification:");
  console.log(`Router simple/research/reasoning: ${routerPass ? "PASS" : "FAIL"}`);
  console.log(`inputTokens/outputTokens 记录: ${deepseek.pass && openai.pass ? "PASS" : "FAIL"}`);
  console.log(`estimatedCost 计算: ${deepseek.pass && openai.pass ? "PASS" : "FAIL"}`);
  console.log(`ai_usage 写入: ${usagePass ? `PASS (内存 ${getUsageHistory().filter((u) => u.agent === "smoke-test").length} 条 / 文件 ${fileRecords} 条)` : "FAIL"}`);

  const allPass = routerPass && deepseek.pass && openai.pass && usagePass;
  process.exitCode = allPass ? 0 : 1;
}

void main();