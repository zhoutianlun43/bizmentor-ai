/**
 * Conversation 测试（V0.6.1）。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { LocalConversationRepository, createMemoryConversationStorage, SupabaseConversationRepository } from "../index";
import type { Conversation } from "../types";

const NOW = "2026-08-24T00:00:00.000Z";

function makeConversation(): Conversation {
  return { id: "c1", userId: "u1", messages: [{ role: "user", content: "hi", createdAt: NOW }], createdAt: NOW, updatedAt: NOW };
}

test("Local Conversation：save/get/list/append/remove", async () => {
  const repo = new LocalConversationRepository(createMemoryConversationStorage());
  await repo.save(makeConversation());
  assert.equal((await repo.list("u1")).length, 1);
  const got = await repo.get("c1");
  assert.equal(got?.messages[0].content, "hi");
  const appended = await repo.appendMessage("c1", { role: "assistant", content: "hello", createdAt: NOW });
  assert.equal(appended?.messages.length, 2);
  assert.equal((await repo.get("c1"))?.messages.length, 2);
  assert.equal(await repo.remove("c1"), true);
  assert.equal(await repo.get("c1"), undefined);
});

test("Supabase Conversation：save/get/list/append（mock）", async () => {
  const db: Array<Record<string, unknown>> = [];
  const client = {
    from: () => ({
      upsert: async (row: Record<string, unknown>) => { db.push(row); return { error: null }; },
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: db.find((r) => r.id === "c1") ?? null, error: null }) }) }),
    }),
  } as never;
  const repo = new SupabaseConversationRepository(client, { userId: "u1" });
  await repo.save(makeConversation());
  const got = await repo.get("c1");
  assert.equal(got?.userId, "u1");
  const appended = await repo.appendMessage("c1", { role: "assistant", content: "reply", createdAt: NOW });
  assert.equal(appended?.messages.length, 2);
});