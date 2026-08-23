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

  // ---------- AI 用量落盘 ----------
  /** ai_usage JSONL 文件路径；留空则默认 .data/ai_usage.jsonl */
  aiUsageFile: process.env.AI_USAGE_FILE ?? "",
} as const;