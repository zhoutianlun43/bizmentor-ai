/**
 * Supabase 数据层统一错误（V0.4.1）。
 * 所有 Supabase*Repository 统一包装为 SupabaseRepositoryError，不直接暴露上游 error。
 */
export class SupabaseRepositoryError extends Error {
  readonly operation: string;
  constructor(operation: string, message: string) {
    super("Supabase." + operation + " 失败: " + message);
    this.name = "SupabaseRepositoryError";
    this.operation = operation;
  }
}
