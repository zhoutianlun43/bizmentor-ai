/**
 * Identity 解析器（V0.4.1 Phase 8B-2）。
 * 优先级：显式传入 > 测试/会话覆盖 > 环境变量 IDENTITY_USER_ID > 默认 local-user。
 */
import { env } from "../config/env";
import type { Identity, IdentitySource } from "./types";

let overrideUserId: string | undefined; // 显式覆盖（测试/会话最高优先）
let authUserId: string | undefined; // 认证用户（AuthIdentityProvider 注入，次优先）

/** 显式覆盖（测试 / 未来 Auth 会话注入）：传 undefined 清除 */
export function setIdentityOverride(userId: string | undefined): void {
  overrideUserId = userId;
}

/** 认证用户（AuthIdentityProvider 使用；登出传 undefined 清除） */
export function setAuthUserId(userId: string | undefined): void {
  authUserId = userId;
}

/**
 * 解析当前用户 id（V0.4.2 Phase 9B-5-A 优先级）：
 * explicit override > authenticated user > IDENTITY_USER_ID > local-user
 */
export function resolveCurrentUserId(override?: string): string {
  if (override) return override;
  if (overrideUserId) return overrideUserId;
  if (authUserId) return authUserId;
  if (env.identityUserId) return env.identityUserId;
  return "local-user";
}

/** 无参快捷：当前用户 id */
export function getCurrentUserId(): string {
  return resolveCurrentUserId();
}

/** 当前身份（含来源） */
export function getCurrentIdentity(): Identity {
  const userId = getCurrentUserId();
  const source: IdentitySource = userId === "local-user" ? "fixed" : env.identityUserId ? "env" : "auth";
  return { userId, source };
}