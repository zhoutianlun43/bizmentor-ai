/**
 * Identity 多设备升级测试（V0.4.2 Phase 9B-5-A）。
 * 覆盖：Auth fallback / 认证用户优先 / 优先级 / 状态监听。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createAuthIdentityProvider } from "../auth-provider";
import { getCurrentUserId, setIdentityOverride } from "../resolver";

function makeAuthClient(user?: { id: string; email?: string }) {
  return {
    auth: {
      getSession: async () => ({ data: { session: user ? { user } : null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } }, error: null }),
    },
  } as never;
}

test("Auth fallback：未认证/未配置 → 回退 local-user", async () => {
  setIdentityOverride(undefined);
  const provider = createAuthIdentityProvider();
  const user = await provider.getCurrentUser();
  assert.equal(user, undefined);
  assert.equal(await provider.isAuthenticated(), false);
  assert.equal(await provider.resolveUserId(), "local-user");
  assert.equal(getCurrentUserId(), "local-user");
});

test("Auth：认证用户优先于 local-user；explicit override 仍最高", async () => {
  setIdentityOverride(undefined);
  const provider = createAuthIdentityProvider(makeAuthClient({ id: "auth-123", email: "a@b.c" }));
  await provider.init();
  assert.equal(await provider.isAuthenticated(), true);
  assert.equal(await provider.resolveUserId(), "auth-123");
  assert.equal(getCurrentUserId(), "auth-123", "认证用户进入 resolver");
  // explicit override 仍最高
  setIdentityOverride("override-user");
  assert.equal(await provider.resolveUserId(), "override-user");
  setIdentityOverride(undefined);
  assert.equal(getCurrentUserId(), "auth-123");
});

test("Auth：状态变化监听（登录/登出）", async () => {
  setIdentityOverride(undefined);
  let session: { user?: { id?: string } } | null = null;
  let cb: ((_e: string, s: { user?: { id?: string } } | null) => void) | undefined;
  const client = {
    auth: {
      getSession: async () => ({ data: { session }, error: null }),
      onAuthStateChange: (listener: (_e: string, s: { user?: { id?: string } } | null) => void) => {
        cb = listener;
        return { data: { subscription: { unsubscribe: () => {} } }, error: null };
      },
    },
  } as never;
  const provider = createAuthIdentityProvider(client);
  const seen: Array<string | undefined> = [];
  provider.subscribeAuth((u) => seen.push(u?.id));
  await provider.init();
  // 模拟登录
  session = { user: { id: "auth-9" } };
  (cb as (_e: string, s: { user?: { id?: string } } | null) => void)("SIGNED_IN", session);
  assert.ok(seen.includes("auth-9"));
  assert.equal(getCurrentUserId(), "auth-9");
  // 模拟登出
  session = null;
  (cb as (_e: string, s: { user?: { id?: string } } | null) => void)("SIGNED_OUT", null);
  assert.equal(getCurrentUserId(), "local-user", "登出后回退 local-user");
});