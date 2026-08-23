/**
 * 环境变量集中管理。
 * V0.1 不需要任何环境变量即可运行；这里为未来 Supabase / OpenAI 预留统一入口。
 * 规则：业务代码禁止直接读取 process.env，必须通过本文件访问。
 */
export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProd: process.env.NODE_ENV === "production",

  /** 应用公开地址（未来通知 / 分享用） */
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",

  /** 未来：Supabase（当前仅预留，未使用） */
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",

  /** 未来：OpenAI 服务端密钥。只允许在 Server/API 端读取，严禁以 NEXT_PUBLIC_ 前缀暴露到前端 */
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
} as const;