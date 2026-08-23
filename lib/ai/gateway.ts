/**
 * AI Gateway（V0.2）—— 业务 Agent 访问 AI 的唯一入口。
 *
 * 用法示例：
 *   const result = await runAI({ capability: "simple", task: "...", type: "classification", agent: "opportunity" });
 *
 * 职责：
 * - Router 选路（Provider + Model）
 * - 主 Provider 失败时按路由规则 fallback
 * - 记录 ai_usage（provider/model/task/agent/tokens/cost/duration/success/degraded）
 * - 最终决策类任务失败时明确报错，绝不静默降级
 */
import { getProvider } from "./providers";
import { resolveRoute } from "./router";
import { createUsageRecord, recordUsage } from "./usage";
import { AiGatewayError } from "./types";
import type { AiMessage, AiResult, AiTask } from "./types";

/** 网关默认系统提示词（业务 Agent 可通过 input.system 覆盖） */
const DEFAULT_SYSTEM_PROMPT =
  "你是 BizMentor 的个人商业导师与商业分析引擎。请给出专业、结构清晰、可执行的中文回答。";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** 统一 AI 调用入口 */
export async function runAI(input: AiTask): Promise<AiResult> {
  const startedAt = Date.now();
  const route = resolveRoute(input);
  const task = input.type ?? input.capability;
  const agent = input.agent ?? "unknown";

  const messages: AiMessage[] = [
    { role: "system", content: input.system ?? DEFAULT_SYSTEM_PROMPT },
    { role: "user", content: input.task },
  ];

  const chatOptions = {
    model: route.model,
    messages,
    temperature: input.temperature,
    maxTokens: input.maxTokens,
    timeoutMs: input.timeoutMs,
  };

  const primary = getProvider(route.provider);

  try {
    const response = await primary.chat(chatOptions);
    const usage = recordUsage(
      createUsageRecord({
        provider: route.provider,
        model: response.model,
        task,
        agent,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        success: true,
        durationMs: Date.now() - startedAt,
      }),
    );
    return {
      content: response.content,
      provider: route.provider,
      model: response.model,
      provider_degraded: false,
      usage,
    };
  } catch (primaryError) {
    // 主 Provider 失败 → 按路由规则尝试 fallback
    if (route.fallback && route.allowDegrade) {
      const fallback = getProvider(route.fallback.provider);
      try {
        const response = await fallback.chat({ ...chatOptions, model: route.fallback.model });
        const usage = recordUsage(
          createUsageRecord({
            provider: route.fallback.provider,
            model: response.model,
            task,
            agent,
            inputTokens: response.inputTokens,
            outputTokens: response.outputTokens,
            success: true,
            durationMs: Date.now() - startedAt,
            degraded: true,
            fallbackFrom: route.provider,
          }),
        );
        return {
          content: response.content,
          provider: route.fallback.provider,
          model: response.model,
          provider_degraded: true,
          usage,
        };
      } catch (fallbackError) {
        const usage = recordUsage(
          createUsageRecord({
            provider: route.provider,
            model: route.model,
            task,
            agent,
            inputTokens: 0,
            outputTokens: 0,
            success: false,
            durationMs: Date.now() - startedAt,
            error: errorMessage(primaryError),
          }),
        );
        throw new AiGatewayError(
          "ALL_PROVIDERS_FAILED",
          `主 Provider(${route.provider}) 与 fallback(${route.fallback.provider}) 均失败`,
          { usage, primaryError: errorMessage(primaryError), fallbackError: errorMessage(fallbackError) },
        );
      }
    }

    // 无 fallback（最终决策类任务）或不允许降级：记录失败并抛出明确错误
    const usage = recordUsage(
      createUsageRecord({
        provider: route.provider,
        model: route.model,
        task,
        agent,
        inputTokens: 0,
        outputTokens: 0,
        success: false,
        durationMs: Date.now() - startedAt,
        error: errorMessage(primaryError),
      }),
    );
    const degradeNote = route.isFinalDecision ? "（最终决策类任务，禁止降级）" : "";
    throw new AiGatewayError(
      "PROVIDER_FAILED",
      `Provider(${route.provider}) 调用失败${degradeNote}: ${errorMessage(primaryError)}`,
      { usage },
    );
  }
}