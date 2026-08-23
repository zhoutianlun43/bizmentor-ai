/**
 * AI Router（V0.2）：根据 任务复杂度 / 重要程度 / 任务类型 选择 Provider + Model。
 *
 * 默认策略：
 * - simple    → DeepSeek
 * - research  → OpenAI Research Model
 * - reasoning → OpenAI Reasoning Model
 *
 * 自动升级：
 * - 任务类型（type）会抬升最低能力等级，例如 user_research / unit_economics → research，
 *   examiner / final_judgment / final_report → reasoning
 * - 调用方可显式 escalate 升级（例如：DeepSeek 初筛 → 判断值得深入研究 → escalate: "research"）
 *
 * Fallback 矩阵（在 gateway 执行）：
 * - DeepSeek 失败 → OpenAI（质量升级，始终允许）
 * - OpenAI 失败 → DeepSeek（仅非最终决策且允许低质量降级的任务）
 * - 最终决策类任务（Examiner / 最终判断 / 最终报告 / 战略 / 复盘）禁止跨 Provider 降级
 */
import { DEFAULT_MODEL_ROUTING } from "../config/ai-models";
import type { ModelRoute } from "../config/ai-models";
import type { AiCapability, AiProviderName, AiTask, AiTaskType } from "./types";

export interface ResolvedRoute {
  capability: AiCapability;
  provider: AiProviderName;
  model: string;
  isFinalDecision: boolean;
  allowDegrade: boolean;
  /** 主 Provider 失败时的备用路由；最终决策类任务为 undefined */
  fallback?: ModelRoute;
}

const CAPABILITY_ORDER: AiCapability[] = ["simple", "research", "reasoning"];

/** 任务类型 → 最低能力等级（Router 自动升级依据） */
const TASK_MIN_CAPABILITY: Partial<Record<AiTaskType, AiCapability>> = {
  user_research: "research",
  competitor_research: "research",
  business_model: "research",
  unit_economics: "research",
  final_judgment: "reasoning",
  examiner: "reasoning",
  final_report: "reasoning",
  strategy: "reasoning",
  review: "reasoning",
};

/** 最终决策类任务：无论是否显式标记，一律禁止跨 Provider 降级 */
const FINAL_TASK_TYPES: ReadonlySet<AiTaskType> = new Set([
  "final_judgment",
  "examiner",
  "final_report",
  "strategy",
  "review",
]);

function rank(capability: AiCapability): number {
  return CAPABILITY_ORDER.indexOf(capability);
}

/** 取多个能力等级中的最高等级 */
function maxCapability(...caps: Array<AiCapability | undefined>): AiCapability {
  let best: AiCapability = "simple";
  for (const c of caps) {
    if (c && rank(c) > rank(best)) best = c;
  }
  return best;
}

/** 显式指定 Provider 时，按能力等级选择该 Provider 的默认模型 */
function modelForProvider(provider: AiProviderName, capability: AiCapability): string {
  if (provider === "deepseek") return DEFAULT_MODEL_ROUTING.simple.model;
  if (capability === "reasoning") return DEFAULT_MODEL_ROUTING.reasoning.model;
  return DEFAULT_MODEL_ROUTING.research.model;
}

/** 构建 fallback 路由：最终决策无 fallback；否则互指另一 Provider 的默认模型 */
function buildFallback(primary: ModelRoute, isFinalDecision: boolean): ModelRoute | undefined {
  if (isFinalDecision) return undefined;
  if (primary.provider === "deepseek") return DEFAULT_MODEL_ROUTING.research;
  return DEFAULT_MODEL_ROUTING.simple;
}

/** 解析一次 AI 调用的路由（Provider + Model + 降级策略） */
export function resolveRoute(input: AiTask): ResolvedRoute {
  const isFinalDecision =
    input.isFinalDecision ?? (input.type ? FINAL_TASK_TYPES.has(input.type) : false);

  // 允许降级：最终决策类任务永远不允许；其他任务默认允许（可显式关闭）
  const allowDegrade = !isFinalDecision && (input.allowDegrade ?? true);

  // 自动升级：请求等级 / 显式 escalate / 任务类型最低等级，取最高
  const capability = maxCapability(
    input.capability,
    input.escalate,
    input.type ? TASK_MIN_CAPABILITY[input.type] : undefined,
  );

  const primary: ModelRoute = input.provider
    ? { provider: input.provider, model: modelForProvider(input.provider, capability) }
    : DEFAULT_MODEL_ROUTING[capability];

  return {
    capability,
    provider: primary.provider,
    model: primary.model,
    isFinalDecision,
    allowDegrade,
    fallback: buildFallback(primary, isFinalDecision),
  };
}