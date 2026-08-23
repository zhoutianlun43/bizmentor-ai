/**
 * BizMentor AI 网关类型定义（V0.2 多 Provider 架构）。
 *
 * 关键约束：
 * - 业务 Agent 禁止直接 import OpenAI SDK / DeepSeek SDK，必须通过 gateway.runAI 调用
 * - Provider 名 / 模型名 / Key 一律来自配置与环境变量，禁止硬编码
 * - 最终决策类任务（Examiner / 最终判断 / 最终报告）禁止无提示降级
 */

/** 能力等级：simple → DeepSeek；research → OpenAI Research；reasoning → OpenAI Reasoning */
export type AiCapability = "simple" | "research" | "reasoning";

/** 已支持的模型 Provider（新增 Provider 时在此扩展 + providers/xxx.ts） */
export type AiProviderName = "openai" | "deepseek";

/** 任务类型：Router 据此决定最低能力等级、是否自动升级、是否禁止降级 */
export type AiTaskType =
  | "summary"
  | "classification"
  | "structuring"
  | "opportunity_screening"
  | "user_research"
  | "competitor_research"
  | "business_model"
  | "unit_economics"
  | "risk_identification"
  | "training_scoring"
  | "conversation"
  | "opportunity_analyzer"
  | "research_planner"
  | "research_task"
  | "research_synthesis"
  | "opportunity_scoring"
  | "validation_plan"
  | "final_summary"
  | "final_judgment"
  | "examiner"
  | "final_report"
  | "strategy"
  | "review";

/** 对话消息 */
export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** AI 调用任务（业务 Agent 只认识这个入参） */
export interface AiTask {
  /** 请求的能力等级；Router 可能按任务类型自动升级 */
  capability: AiCapability;
  /** 任务指令 / 提示词 */
  task: string;
  /** 任务类型（用于 Router 升级判断与 ai_usage 记录） */
  type?: AiTaskType;
  /** 所属 Agent（用于 ai_usage 记录） */
  agent?: string;
  /** 系统提示词（缺省使用网关默认） */
  system?: string;
  /** 是否属于最终决策类任务（Examiner / 最终判断 / 最终报告） */
  isFinalDecision?: boolean;
  /** 是否允许低质量降级（OpenAI → DeepSeek 仅当允许时发生） */
  allowDegrade?: boolean;
  /** 显式升级到更高能力等级（例如：初筛 → 判断值得深入研究 → escalate research） */
  escalate?: AiCapability;
  /** 显式指定 Provider（一般用于测试 / 调试） */
  provider?: AiProviderName;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

/** ai_usage 用量记录（记录到本地 JSONL；未来落库） */
export interface AiUsageRecord {
  provider: AiProviderName;
  model: string;
  /** 任务类型或能力等级 */
  task: string;
  agent: string;
  inputTokens: number;
  outputTokens: number;
  /** 估算成本（USD） */
  estimatedCost: number;
  durationMs: number;
  success: boolean;
  createdAt: string;
  /** 是否发生了跨 Provider 降级 */
  degraded?: boolean;
  /** 从哪个 Provider 降级而来 */
  fallbackFrom?: AiProviderName;
  error?: string;
}

/** AI 调用结果 */
export interface AiResult {
  content: string;
  provider: AiProviderName;
  model: string;
  /** 明确降级状态：provider_degraded=true 表示发生了跨 Provider 降级 */
  provider_degraded: boolean;
  usage: AiUsageRecord;
}

/** Provider 层请求（内部） */
export interface ProviderChatRequest {
  model: string;
  messages: AiMessage[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

/** Provider 层响应（内部，已归一化） */
export interface ProviderChatResponse {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  raw?: unknown;
}

/** Provider 抽象：新增模型 Provider = 实现该接口并注册到 providers/index.ts */
export interface ChatProvider {
  name: AiProviderName;
  chat(req: ProviderChatRequest): Promise<ProviderChatResponse>;
}

/** Provider 层错误码 */
export type AiProviderErrorCode =
  | "NOT_CONFIGURED"
  | "HTTP_ERROR"
  | "TIMEOUT"
  | "INVALID_RESPONSE";

/** Provider 层错误（含 provider 与 code，便于 fallback 决策） */
export class AiProviderError extends Error {
  readonly code: AiProviderErrorCode;
  readonly provider: AiProviderName;

  constructor(code: AiProviderErrorCode, provider: AiProviderName, message: string) {
    super(message);
    this.name = "AiProviderError";
    this.code = code;
    this.provider = provider;
  }
}

/** 网关层错误码 */
export type AiGatewayErrorCode =
  | "PROVIDER_FAILED"
  | "ALL_PROVIDERS_FAILED"
  | "INVALID_INPUT";

/** 网关层错误（业务层捕获后可按 code 处理） */
export class AiGatewayError extends Error {
  readonly code: AiGatewayErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: AiGatewayErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "AiGatewayError";
    this.code = code;
    this.details = details;
  }
}