/**
 * Identity 解析器（V0.4.1 Phase 8B-2）。
 * 优先级：显式传入 > 测试/会话覆盖 > 环境变量 IDENTITY_USER_ID > 默认 local-user。
 */
import { env } from "../config/env";
import type { Identity, IdentitySource } from "./types";

let overrideUserId: string | undefined;

/** 测试 / 未来 Auth 注入：设置会话用户（传 undefined 清除覆盖） */
export function setIdentityOverride(userId: string | undefined): void {
  overrideUserId = userId;
}

/** 解析当前用户 id（override 参数优先，其次会话覆盖、环境、默认） */
export function resolveCurrentUserId(override?: string): string {
  if (override) return override;
  if (overrideUserId) return overrideUserId;
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