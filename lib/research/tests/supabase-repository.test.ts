import { test } from "node:test";
import assert from "node:assert/strict";
import { SupabaseResearchRepository, SupabaseRepositoryError } from "../supabase-repository";
import { createMemoryResearchStorage, LocalResearchRepository } from "../repository";
import type { ResearchRun } from "../types";
import { makeResearchRun } from "../../decision/tests/helpers";
import type { SupabaseClient } from "@supabase/supabase-js";

// ===================== mock Supabase client =====================
type Row = Record<string, unknown>;
interface MockError {
  message: string;
}

class MockBuilder {
  private filters: Array<[string, unknown]> = [];
  private orderCol?: string;
  private orderAsc = true;

  constructor(
    private db: Map<string, Row[]>,
    private table: string,
    private mock: MockSupabase,
  ) {}

  select(): this {
    return this;
  }
  eq(col: string, value: unknown): this {
    this.filters.push([col, value]);
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }): this {
    this.orderCol = col;
    this.orderAsc = opts?.ascending !== false;
    return this;
  }

  private rows(): Row[] {
    let rows = this.db.get(this.table) ?? [];
    for (const [col, v] of this.filters) rows = rows.filter((r) => r[col] === v);
    if (this.orderCol) {
      rows = [...rows].sort((a, b) => {
        const av = String(a[this.orderCol!] ?? "");
        const bv = String(b[this.orderCol!] ?? "");
        if (av === bv) return 0;
        return this.orderAsc ? (av < bv ? -1 : 1) : av < bv ? 1 : -1;
      });
    }
    return rows;
  }

  async maybeSingle(): Promise<{ data: Row | null; error: MockError | null }> {
    const err = this.mock.takeFail();
    if (err) return { data: null, error: err };
    const rows = this.rows();
    return { data: rows.length > 0 ? rows[0] : null, error: null };
  }

  async upsert(row: Row, opts?: { onConflict?: string }): Promise<{ data: Row | null; error: MockError | null }> {
    const err = this.mock.takeFail();
    if (err) return { data: null, error: err };
    const rows = this.db.get(this.table) ?? [];
    const keys = (opts?.onConflict ?? "id").split(",").map((s) => s.trim());
    const idx = rows.findIndex((r) => keys.every((k) => r[k] === row[k]));
    if (idx >= 0) rows[idx] = { ...rows[idx], ...row };
    else rows.push({ ...row });
    this.db.set(this.table, rows);
    return { data: row, error: null };
  }

  then<T = { data: Row[]; error: MockError | null }>(
    onfulfilled?: (value: { data: Row[]; error: MockError | null }) => T | PromiseLike<T>,
  ): Promise<T> {
    const err = this.mock.takeFail();
    const result = err ? { data: [], error: err } : { data: this.rows(), error: null };
    return Promise.resolve(result as { data: Row[]; error: MockError | null }).then(onfulfilled);
  }
}

class MockSupabase {
  readonly db = new Map<string, Row[]>();
  failNext = false;
  from(table: string): MockBuilder {
    return new MockBuilder(this.db, table, this);
  }
  takeFail(): MockError | null {
    if (this.failNext) {
      this.failNext = false;
      return { message: "mock database error" };
    }
    return null;
  }
}

function createRepo(mock: MockSupabase): SupabaseResearchRepository {
  return new SupabaseResearchRepository(mock as unknown as SupabaseClient, { userId: "u1", table: "research_runs" });
}

// ===================== tests =====================

test("saveRun：写入数据库行（run_id/opportunity_id/status/jsonb 字段完整）", async () => {
  const mock = new MockSupabase();
  const repo = createRepo(mock);
  const run: ResearchRun = {
    runId: "run-1",
    opportunityId: "opp-1",
    status: "completed",
    createdAt: "2026-08-24T00:00:00.000Z",
    updatedAt: "2026-08-24T01:00:00.000Z",
    stages: [{ stage: "analyzer", status: "completed", provider: "deepseek", provider_degraded: false, inputTokens: 10, outputTokens: 5, estimatedCost: 0.001, durationMs: 100 }],
    findings: [],
    scoreHistory: [{ version: 1, overall_score: 7.3, confidence: 0.54, score_breakdown: [], assumptions: [], unknowns: [], validation_required: [], createdAt: "2026-08-24T00:00:00.000Z" }],
    sourceDocuments: [],
  };
  await repo.saveRun(run);

  const rows = mock.db.get("research_runs") ?? [];
  assert.equal(rows.length, 1);
  assert.equal(rows[0].run_id, "run-1");
  assert.equal(rows[0].user_id, "u1");
  assert.equal(rows[0].opportunity_id, "opp-1");
  assert.equal(rows[0].status, "completed");
  assert.deepEqual(rows[0].stages, run.stages);
  assert.deepEqual(rows[0].score_history, run.scoreHistory);
  assert.equal(rows[0].report, null, "无 report 时落库为 null（jsonb）");
  assert.equal(rows[0].evidence_validation, null);
});

test("CRUD：save → get 往返一致（类型兼容）", async () => {
  const mock = new MockSupabase();
  const repo = createRepo(mock);
  const { researchRepo: local } = { researchRepo: new LocalResearchRepository(createMemoryResearchStorage()) };
  const run = await makeResearchRun(local, "opp-roundtrip");
  await repo.saveRun(run);

  const got = await repo.getRun("opp-roundtrip");
  assert.ok(got);
  assert.equal(got.runId, run.runId);
  assert.equal(got.opportunityId, run.opportunityId);
  assert.equal(got.status, run.status);
  assert.equal(got.stages.length, run.stages.length);
  assert.equal(got.scoreHistory.length, run.scoreHistory.length);
  assert.ok(got.report, "report 应保留");
  assert.equal(got.report?.sections.length, run.report?.sections.length);
});

test("覆盖保存：同一商机 upsert 替换，listRuns 保持 1 条", async () => {
  const mock = new MockSupabase();
  const repo = createRepo(mock);
  const { researchRepo: local } = { researchRepo: new LocalResearchRepository(createMemoryResearchStorage()) };
  const run1 = await makeResearchRun(local, "opp-up");
  const run2 = { ...run1, runId: "run-2", status: "degraded" as const, updatedAt: "2026-08-24T02:00:00.000Z" };
  await repo.saveRun(run1);
  await repo.saveRun(run2);

  const list = await repo.listRuns();
  assert.equal(list.length, 1, "同一 user+opportunity 应只有 1 条");
  assert.equal(list[0].runId, "run-2");
  assert.equal(list[0].status, "degraded");
});

test("listRuns：按 created_at 倒序返回", async () => {
  const mock = new MockSupabase();
  const repo = createRepo(mock);
  const base: ResearchRun = {
    runId: "", opportunityId: "", status: "completed", createdAt: "", updatedAt: "",
    stages: [], findings: [], scoreHistory: [], sourceDocuments: [],
  };
  await repo.saveRun({ ...base, runId: "r1", opportunityId: "o1", createdAt: "2026-08-24T00:00:00.000Z" });
  await repo.saveRun({ ...base, runId: "r2", opportunityId: "o2", createdAt: "2026-08-24T02:00:00.000Z" });
  await repo.saveRun({ ...base, runId: "r3", opportunityId: "o3", createdAt: "2026-08-24T01:00:00.000Z" });

  const list = await repo.listRuns();
  assert.deepEqual(list.map((r) => r.runId), ["r2", "r3", "r1"]);
});

test("saveRun：消毒孤立代理项/控制字符（抓取网页正文兼容 JSONB）", async () => {
  const mock = new MockSupabase();
  const repo = createRepo(mock);
  const bad = "bad \uD800 char\u0001";
  const run: ResearchRun = {
    runId: "r-san", opportunityId: "o-san", status: "completed", createdAt: "now", updatedAt: "now",
    stages: [], findings: [], scoreHistory: [],
    sourceDocuments: [{ id: "d1", title: "t", sourceType: "EXTERNAL_WEB", content: bad, url: "https://x", createdAt: "now" }],
  };
  await repo.saveRun(run);
  const rows = mock.db.get("research_runs") ?? [];
  const doc = rows[0].source_documents as Array<{ content: string }>;
  assert.ok(!doc[0].content.includes("\uD800"), "孤立高代理应被替换");
  assert.ok(!doc[0].content.includes("\u0001"), "控制字符应被清除");
});

test("getRun：不存在返回 undefined", async () => {
  const mock = new MockSupabase();
  const repo = createRepo(mock);
  assert.equal(await repo.getRun("nope"), undefined);
});

test("错误处理：saveRun / getRun / listRuns 上游错误 → SupabaseRepositoryError", async () => {
  const mock = new MockSupabase();
  const repo = createRepo(mock);
  const run: ResearchRun = {
    runId: "r", opportunityId: "o", status: "completed", createdAt: "now", updatedAt: "now",
    stages: [], findings: [], scoreHistory: [], sourceDocuments: [],
  };

  mock.failNext = true;
  await assert.rejects(() => repo.saveRun(run), (e: unknown) => e instanceof SupabaseRepositoryError && e.operation === "saveRun");

  mock.failNext = true;
  await assert.rejects(() => repo.getRun("o"), (e: unknown) => e instanceof SupabaseRepositoryError && e.operation === "getRun");

  mock.failNext = true;
  await assert.rejects(() => repo.listRuns(), (e: unknown) => e instanceof SupabaseRepositoryError && e.operation === "listRuns");
});
