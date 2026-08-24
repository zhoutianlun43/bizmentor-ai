/**
 * Identity Layer（V0.4.1 Phase 8B-2）。
 * 统一「当前用户是谁」的解析；当前单用户固定 local-user，未来可接 Supabase Auth。
 */
export type IdentitySource = "fixed" | "env" | "auth";

export interface Identity {
  userId: string;
  source: IdentitySource;
}