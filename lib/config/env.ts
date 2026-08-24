/**
 * 环境变量集中管理（V0.2）。
 * 规则：业务代码禁止直接读取 process.env，必须通过本文件访问。
 * 安全：OPENAI_API_KEY / DEEPSEEK_API_KEY 只允许在服务端使用，严禁以 NEXT_PUBLIC_ 前缀暴露。
 */

/** 读取数值环境变量（非法/缺失时返回 fallback） */
function toNum(value: string | undefined, fallback: number): number {
  if (value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProd: process.env.NODE_ENV === "production",

  /** 应用公开地址（未来通知 / 分享用） */
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",

  /** 未来：Supabase（当前仅预留，未使用） */
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  /** 服务端专用（禁止 NEXT_PUBLIC_ 前缀；Phase 2 数据层使用） */
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",

  // ---------- Identity（V0.4.1 Phase 8B-2） ----------
  /** 可选：部署时固定当前用户 id（缺省 local-user）；未来 Auth 阶段由会话解析 */
  identityUserId: process.env.IDENTITY_USER_ID ?? "",

  // ---------- OpenAI（仅服务端） ----------
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiBaseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
  openaiResearchModel: process.env.OPENAI_RESEARCH_MODEL ?? "gpt-5.6-terra",
  openaiReasoningModel: process.env.OPENAI_REASONING_MODEL ?? "gpt-5.6-sol",

  // ---------- DeepSeek（仅服务端） ----------
  deepseekApiKey: process.env.DEEPSEEK_API_KEY ?? "",
  deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
  deepseekModel: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",

  // ---------- AI 计价（USD / 1M tokens，可覆盖） ----------
  deepseekInputPricePer1M: toNum(process.env.DEEPSEEK_INPUT_PRICE_PER_1M, 0.27),
  deepseekOutputPricePer1M: toNum(process.env.DEEPSEEK_OUTPUT_PRICE_PER_1M, 1.1),
  openaiResearchInputPricePer1M: toNum(process.env.OPENAI_RESEARCH_INPUT_PRICE_PER_1M, 2.5),
  openaiResearchOutputPricePer1M: toNum(process.env.OPENAI_RESEARCH_OUTPUT_PRICE_PER_1M, 10),
  openaiReasoningInputPricePer1M: toNum(process.env.OPENAI_REASONING_INPUT_PRICE_PER_1M, 5),
  openaiReasoningOutputPricePer1M: toNum(process.env.OPENAI_REASONING_OUTPUT_PRICE_PER_1M, 15),

  // ---------- 外部研究（V0.3-B Web Research） ----------
  /** 外部研究 Provider（当前支持 duckduckgo） */
  externalResearchProvider: process.env.EXTERNAL_RESEARCH_PROVIDER ?? "duckduckgo",
  /** 每个查询取前 N 条搜索结果 */
  externalSearchLimit: toNum(process.env.EXTERNAL_SEARCH_LIMIT, 5),
  /** 每个查询实际读取的网页数（限制请求量） */
  externalReadLimit: toNum(process.env.EXTERNAL_READ_LIMIT, 2),
  /** 外部请求超时（ms） */
  externalTimeoutMs: toNum(process.env.EXTERNAL_TIMEOUT_MS, 15000),
  // ---------- External Intelligence（V0.4.1 Phase 6.2-A） ----------
  /** 情报 Provider 有序列表（逗号分隔，按顺序尝试；默认仅 duckduckgo） */
  externalIntelligenceProviders: (process.env.EXTERNAL_INTELLIGENCE_PROVIDERS ?? "duckduckgo")
    .split(",").map((s) => s.trim()).filter(Boolean),
  /** 未来搜索服务（仅服务端；接口就绪，暂不接入） */
  tavilyApiKey: process.env.TAVILY_API_KEY ?? "",
  tavilyBaseUrl: process.env.TAVILY_BASE_URL ?? "https://api.tavily.com/search",
  bingApiKey: process.env.BING_API_KEY ?? "",
  googleSearchApiKey: process.env.GOOGLE_SEARCH_API_KEY ?? "",
  googleSearchCx: process.env.GOOGLE_SEARCH_CX ?? "",

  // ---------- AI 用量落盘 ----------
  /** ai_usage JSONL 文件路径；留空则默认 .data/ai_usage.jsonl */
  aiUsageFile: process.env.AI_USAGE_FILE ?? "",
} as const;