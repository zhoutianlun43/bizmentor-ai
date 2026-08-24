/**
 * SupabaseMemoryRepository 测试（V0.4.1 Phase 8B-2，mock Supabase）。
 * 覆盖：saveRecords upsert / listRecords 反序列化 / archive 写 learning_events / 错误包装 / clear。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { SupabaseMemoryRepository } from "../supabase-repository";
import { SupabaseRepositoryError } from "../../supabase/errors";
import type { DecisionMemoryRecord } from "../types";

type Row = Record<string, unknown>;
type Table = { memory_records: Row[]; learning_events: Row[] };

function makeRecord(id: string, decisionId: string, domain?: string): DecisionMemoryRecord {
  return {
    id,
    decisionId,
    opportunityId: "opp-" + id,
    opportunityName: "商机" + id,
    domain,
    decision: "validate",
    differentFromAi: false,
    aiPrediction: { score: 5.7, confidence: 0.65 },
    userPrediction: { coreJudgment: "c", expectedOutcome: "e" },
    outcome: "confirmed",
    scoreDelta: { from: 5.7, to: 6.8 },
    lesson: "经验",
    skills: [{ skill: "validation", signal: "positive", severity: 0.5 }],
    tags: ["ecommerce", "confirmed"],
    createdAt: "2026-08-24T00:00:00.000Z",
    updatedAt: "2026-08-24T00:00:00.000Z",
  };
}

function makeMockClient(db: Table, failOp?: string): { from: (t: string) => unknown } {
  const fail = (op: string) => failOp === op ? { error: { message: "db down" } } : null;
  return {
    from: (table: string) => {
      const rows = db[table as keyof Table];
      return {
        upsert: async (payload: Row[], opts: { onConflict?: string }) => {
          const f = fail("upsert");
          if (f) return f;
          for (const row of payload as Row[]) {
            const idx = rows.findIndex((r) => r[opts?.onConflict ?? "id"] === row[opts?.onConflict ?? "id"]);
            if (idx >= 0) rows[idx] = { ...rows[idx], ...row };
            else rows.push(row);
          }
          return { error: null };
        },
        select: () => ({
          eq: (col: string, val: unknown) => ({
            order: async (orderCol: string) => {
              const f = fail("list");
              if (f) return { data: null, error: f.error };
              const filtered = rows.filter((r) => r[col] === val);
              const sorted = [...filtered].sort((a, b) => String(a[orderCol]).localeCompare(String(b[orderCol])));
              return { data: sorted, error: null };
            },
          }),
        }),
        delete: () => ({
          eq: async (col: string, val: unknown) => {
            const f = fail("delete");
            if (f) return f;
            const idx = rows.findIndex((r) => r[col] === val);
            if (idx >= 0) rows.splice(idx, rows.length);
            return { error: null };
          },
        }),
      };
    },
  };
}

test("SupabaseMemoryRepository：saveRecords upsert（decision_id 冲突）+ listRecords 反序列化", async () => {
  const db: Table = { memory_records: [], learning_events: [] };
  const repo = new SupabaseMemoryRepository(makeMockClient(db) as never, { userId: "local-user" });
  await repo.saveRecords([makeRecord("mem-1", "dec-1", "ecommerce")]);
  assert.equal(db.memory_records.length, 1);
  assert.equal(db.memory_records[0].decision_id, "dec-1");
  assert.equal(db.memory_records[0].user_id, "local-user");

  // 覆盖同一 decision
  await repo.saveRecords([makeRecord("mem-2", "dec-1", "saas")]);
  assert.equal(db.memory_records.length, 1, "decision_id unique 覆盖");

  const records = await repo.listRecords();
  assert.equal(records.length, 1);
  assert.equal(records[0].decisionId, "dec-1");
  assert.equal(records[0].domain, "saas");
  assert.equal(records[0].outcome, "confirmed");
});

test("SupabaseMemoryRepository：archive 写入 learning_events + listArchived 读取", async () => {
  const db: Table = { memory_records: [], learning_events: [] };
  const repo = new SupabaseMemoryRepository(makeMockClient(db) as never, { userId: "u1" });
  await repo.archive([{
    id: "ev-1", skill: "validation", signal: "positive", severity: 0.5, evidence: "e",
    opportunityId: "opp-1", decisionId: "dec-1", createdAt: "2026-08-24T00:00:00.000Z",
  }]);
  assert.equal(db.learning_events.length, 1);
  const events = await repo.listArchived();
  assert.equal(events.length, 1);
  assert.equal(events[0].skill, "validation");
});

test("SupabaseMemoryRepository：错误统一包装 SupabaseRepositoryError", async () => {
  const db: Table = { memory_records: [], learning_events: [] };
  const repo = new SupabaseMemoryRepository(makeMockClient(db, "upsert") as never, { userId: "u1" });
  await assert.rejects(() => repo.saveRecords([makeRecord("m", "d")]), (err: unknown) => {
    assert.ok(err instanceof SupabaseRepositoryError);
    assert.equal((err as SupabaseRepositoryError).operation, "saveRecords");
    return true;
  });
});

test("SupabaseMemoryRepository：clear 删除当前用户记录", async () => {
  const db: Table = { memory_records: [], learning_events: [] };
  const repo = new SupabaseMemoryRepository(makeMockClient(db) as never, { userId: "u1" });
  await repo.saveRecords([makeRecord("m", "d")]);
  assert.equal(db.memory_records.length, 1);
  await repo.clear();
  assert.equal(db.memory_records.length, 0);
});