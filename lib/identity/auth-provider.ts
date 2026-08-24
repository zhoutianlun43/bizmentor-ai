/**
 * AuthIdentityProvider（V0.4.2 Phase 9B-5-A：Identity 多设备升级，Auth Ready）。
 * 能力：当前用户获取 / 登录状态检测 / userId 解析 / auth 状态变化监听。
 * 优先级：explicit override > authenticated user > IDENTITY_USER_ID > local-user。
 * 兼容：未配置 Supabase Auth 时静默回退（local-user 仍可运行）。
 * 业务层不变：继续使用 getCurrentUserId()（认证用户通过 setIdentityOverride 注入 resolver）。
 */
import { setAuthUserId } from "./resolver";
import { getCurrentUserId } from "./resolver";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface AuthUser {
  id: string;
  email?: string;
}

export interface AuthIdentityProvider {
  getCurrentUser(): Promise<AuthUser | undefined>;
  isAuthenticated(): Promise<boolean>;
  /** 按优先级解析当前用户 id（认证用户 > env > local-user；override 由 resolver 处理） */
  resolveUserId(): Promise<string>;
  /** 订阅 auth 状态变化；返回取消订阅函数 */
  subscribeAuth(listener: (user: AuthUser | undefined) => void): () => void;
  /** 初始化：拉取当前会话并接入 onAuthStateChange（幂等） */
  init(): Promise<AuthUser | undefined>;
}

function userFromSession(session: { user?: { id?: string; email?: string | null } } | null): AuthUser | undefined {
  if (!session?.user?.id) return undefined;
  return { id: session.user.id, email: session.user.email ?? undefined };
}

export function createAuthIdentityProvider(client?: SupabaseClient): AuthIdentityProvider {
  const listeners = new Set<(u: AuthUser | undefined) => void>();
  let current: AuthUser | undefined;
  let unsub: (() => void) | undefined;
  let initialized = false;

  const supabase = client;

  const applyUser = (user: AuthUser | undefined): void => {
    current = user;
    // 认证用户注入独立槽位（不影响显式 override 优先级）
    setAuthUserId(user?.id);
    for (const l of [...listeners]) l(user);
  };

  const readSession = async (): Promise<AuthUser | undefined> => {
    if (!supabase) return undefined;
    try {
      const { data } = await supabase.auth.getSession();
      return userFromSession(data.session as { user?: { id?: string; email?: string | null } } | null);
    } catch {
      return undefined;
    }
  };

  return {
    async getCurrentUser() {
      if (!current) current = await readSession();
      return current;
    },
    async isAuthenticated() {
      return Boolean(await this.getCurrentUser());
    },
    async resolveUserId() {
      await this.getCurrentUser(); // 确保已解析会话
      return getCurrentUserId();
    },
    subscribeAuth(listener) {
      listeners.add(listener);
      // 首次订阅且未接入 onAuthStateChange 时接入
      if (supabase && !unsub) {
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          applyUser(userFromSession(session as { user?: { id?: string; email?: string | null } } | null));
        });
        unsub = typeof data?.subscription?.unsubscribe === "function" ? () => data.subscription!.unsubscribe() : undefined;
      }
      return () => {
        listeners.delete(listener);
      };
    },
    async init() {
      if (initialized) return current;
      initialized = true;
      const user = await readSession();
      if (user) applyUser(user);
      // 接入状态监听（幂等）
      if (supabase && !unsub) {
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          applyUser(userFromSession(session as { user?: { id?: string; email?: string | null } } | null));
        });
        unsub = typeof data?.subscription?.unsubscribe === "function" ? () => data.subscription!.unsubscribe() : undefined;
      }
      return user;
    },
  };
}

/** 默认单例（未配置 Supabase 时行为同旧逻辑） */
export const authIdentityProvider = createAuthIdentityProvider();