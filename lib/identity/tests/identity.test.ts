/**
 * Identity Layer 测试（V0.4.1 Phase 8B-2）。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { getCurrentIdentity, getCurrentUserId, resolveCurrentUserId, setIdentityOverride } from "../index";

test("Identity：默认 local-user / 显式覆盖优先", () => {
  setIdentityOverride(undefined);
  assert.equal(resolveCurrentUserId(), "local-user");
  assert.equal(getCurrentUserId(), "local-user");
  assert.equal(resolveCurrentUserId("alice"), "alice", "显式参数优先");
});

test("Identity：setIdentityOverride 会话覆盖 + 清除", () => {
  setIdentityOverride("bob");
  assert.equal(getCurrentUserId(), "bob");
  setIdentityOverride(undefined);
  assert.equal(getCurrentUserId(), "local-user");
});

test("Identity：getCurrentIdentity 返回来源", () => {
  setIdentityOverride(undefined);
  const id = getCurrentIdentity();
  assert.equal(id.userId, "local-user");
  assert.equal(id.source, "fixed");
});