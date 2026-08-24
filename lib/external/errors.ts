/**
 * External Intelligence Layer 错误。
 * 安全：只携带 Provider id 与安全摘要，不含 Key / Authorization / 响应原文。
 */
export class ExternalIntelligenceError extends Error {
  readonly provider: string;
  /** 安全摘要（错误类型，不含敏感信息） */
  readonly summary: string;

  constructor(provider: string, message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "ExternalIntelligenceError";
    this.provider = provider;
    this.summary = options?.cause ? `${message} (${safeTypeOf(options.cause)})` : message;
    if (options?.cause) this.cause = options.cause;
  }
}

/** 错误安全摘要：只取类型/状态码，不暴露响应体 */
export function safeTypeOf(err: unknown): string {
  if (err instanceof Error) return err.name;
  if (typeof err === "string") return "string";
  if (err && typeof err === "object") {
    const code = (err as { code?: unknown }).code;
    if (typeof code === "string" || typeof code === "number") return `code=${code}`;
  }
  return typeof err;
}

/** 错误消息安全摘要（截断 + 去换行） */
export function safeMessage(err: unknown): string {
  if (err instanceof Error) return err.message.slice(0, 120).replace(/\s+/g, " ").trim();
  return String(err).slice(0, 120);
}