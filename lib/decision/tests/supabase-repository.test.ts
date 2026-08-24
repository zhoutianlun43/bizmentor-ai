import { test } from "node:test";
import assert from "node:assert/strict";
import { SupabaseDecisionRepository } from "../supabase-repository";
import { SupabaseRepositoryError } from "../../supabase/errors";
import type {
  LearningEvent,
  ScoreUpdate,
  UserDecision,
  UserDecisionReview,
  ValidationPlan,
  ValidationResult,
} from "../types";
import type { SupabaseClient } from "@supabase/supabase-js";

// ===================== mock Supabase =====================
type Row = Record<string, unknown>;
interface MockError {
  message: string;
}

class MockBuilder {
  private filters: Array<[string, unknown]> = [];
  private orderCol?: string;
  private orderAsc = true;
  private op?: "upsert" | "insert";
  private payload?: Row | Row[];

  constructor(private db: Map<string, Row[]>, private table: string, private mock: MockSupabase) {}

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
  upsert(row: Row, opts?: { onConflict?: string }): this {
    this.op = "upsert";
    this.payload = row;
    this.upsertConflict = opts?.onConflict ?? "id";
    return this;
  }
  insert(rows: Row | Row[]): this {
    this.op = "insert";
    this.payload = rows;
    return this;
  }
  private upsertConflict = "id";

  private match(row: Row): boolean {
    return this.filters.every(([c, v]) => row[c] === v);
  }
  private rows(): Row[] {
    let rows = this.db.get(this.table) ?? [];
    rows = rows.filter((r) => this.match(r));
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

  then<T>(
    onfulfilled?: (value: { data: unknown; error: MockError | null }) => T | PromiseLike<T>,
  ): Promise<T> {
    const err = this.mock.takeFail();
    const tableRows = this.db.get(this.table) ?? [];
    if (this.op === "upsert" && this.payload && !Array.isArray(this.payload)) {
      const row = this.payload as Row;
      const keys = this.upsertConflict.split(",").map((s) => s.trim());
      const idx = tableRows.findIndex((r) => keys.every((k) => r[k] === row[k]));
      if (idx >= 0) tableRows[idx] = { ...tableRows[idx], ...row };
      else tableRows.push({ ...row });
      this.db.set(this.table, tableRows);
      return Promise.resolve({ data: row, error: err }).then(onfulfilled);
    }
    if (this.op === "insert" && this.payload) {
      const rows = Array.isArray(this.payload) ? (this.payload as Row[]) : [this.payload as Row];
      rows.forEach((r) => tableRows.push({ ...r }));
      this.db.set(this.table, tableRows);
      return Promise.resolve({ data: rows, error: err }).then(onfulfilled);
    }
    return Promise.resolve({ data: err ? [] : this.rows(), error: err }).then(onfulfilled);
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

function createRepo(mock: MockSupabase): SupabaseDecisionRepository {
  return new SupabaseDecisionRepository(mock as unknown as SupabaseClient, { userId: "u1" });
}

function sampleDecision(overrides: Partial<UserDecision> = {}): UserDecision {
  return {
    id: "d1",
    opportunityId: "opp-1",
    decision: "validate",
    differentFromAi: false,
    judgment: { why: "w", coreJudgment: "c", keyEvidence: "e", biggestRisk: "r", mostImportantAssumption: "a", expectedOutcome: "o" },
    createdAt: "2026-08-24T00:00:00.000Z",
    updatedAt: "2026-08-24T00:00:00.000Z",
    ...overrides,
  };
}

// ===================== tests =====================

test("create 成功：生成决策行（judgment jsonb / ai_score_snapshot null）", async () => {
  const mock = new MockSupabase();
  const repo = createRepo(mock);
  const d = sampleDecision();
  const created = await repo.createDecision(d);
  assert.equal(created.id, "d1");
  const rows = mock.db.get("decisions") ?? [];
  assert.equal(rows.length, 1);
  assert.equal(rows[0].user_id, "u1");
  assert.equal(rows[0].opportunity_id, "opp-1");
  assert.deepEqual(rows[0].judgment, d.judgment);
  assert.equal(rows[0].ai_score_snapshot, null);
});

test("get 不存在 → undefined", async () => {
  const mock = new MockSupabase();
  const repo = createRepo(mock);
  assert.equal(await repo.getDecision("nope"), undefined);
});

test("list 排序：按 created_at 倒序且按 opportunity 过滤", async () => {
  const mock = new MockSupabase();
  const j = sampleDecision().judgment;
  const row = (id: string, opp: string, at: string): Row => ({
    id, user_id: "u1", opportunity_id: opp, decision: "validate",
    different_from_ai: false, judgment: j, ai_score_snapshot: null, created_at: at, updated_at: at,
  });
  mock.db.set("decisions", [
    row("a", "opp-1", "2026-08-24T00:00:00.000Z"),
    row("c", "opp-1", "2026-08-24T02:00:00.000Z"),
    row("b", "opp-1", "2026-08-24T01:00:00.000Z"),
    row("other", "opp-9", "2026-08-24T03:00:00.000Z"),
  ]);
  const repo = createRepo(mock);
  const list = await repo.listDecisions("opp-1");
  assert.deepEqual(list.map((x) => x.id), ["c", "b", "a"]);
});

test("update 覆盖：字段更新、id 不变、写 updated_at", async () => {
  const mock = new MockSupabase();
  const repo = createRepo(mock);
  await repo.saveDecision(sampleDecision());
  const updated = await repo.updateDecision("d1", {
    decision: "pause",
    judgment: { ...sampleDecision().judgment, coreJudgment: "先暂停" },
  });
  assert.ok(updated);
  assert.equal(updated?.id, "d1");
  assert.equal(updated?.decision, "pause");
  assert.equal(updated?.judgment.coreJudgment, "先暂停");
  const rows = mock.db.get("decisions") ?? [];
  assert.equal(rows[0].decision, "pause");
  assert.ok(rows[0].updated_at);
});

test("update 不存在 → undefined", async () => {
  const mock = new MockSupabase();
  const repo = createRepo(mock);
  assert.equal(await repo.updateDecision("nope", { decision: "pause" }), undefined);
});

test("review 保存：getReview 往返（jsonb 数组完整）", async () => {
  const mock = new MockSupabase();
  const repo = createRepo(mock);
  const review: UserDecisionReview = {
    id: "rv1",
    decisionId: "d1",
    score: 7.5,
    strengths: ["a"],
    weaknesses: [{ category: "over_optimism", description: "x", severity: 0.5 }],
    reasoningGaps: ["g"],
    missingEvidence: ["m"],
    recommendedActions: ["r"],
    abilitySignals: [{ skill: "strategic_judgment", signal: "positive", severity: 0.4, evidence: "e" }],
    provider: "deepseek",
    provider_degraded: true,
    createdAt: "now",
  };
  await repo.saveReview(review);
  const got = await repo.getReview("d1");
  assert.ok(got);
  assert.equal(got?.score, 7.5);
  assert.deepEqual(got?.weaknesses, review.weaknesses);
  assert.deepEqual(got?.abilitySignals, review.abilitySignals);
  assert.equal(got?.provider_degraded, true);
});

test("validation 保存：plan + result 往返", async () => {
  const mock = new MockSupabase();
  const repo = createRepo(mock);
  const plan: ValidationPlan = {
    id: "p1",
    decisionId: "d1",
    opportunityId: "opp-1",
    tasks: [{ id: "t1", planId: "p1", assumption: "a", hypothesis: "h", method: "m", sampleSize: "s", successCriteria: "sc", failureCriteria: "fc", deadline: "d", costEstimate: "c", owner: "o", relatedDimension: "willingnessToPay", status: "pending", createdAt: "now", updatedAt: "now" }],
    createdAt: "now",
    updatedAt: "now",
  };
  await repo.savePlan(plan);
  const gotPlan = await repo.getPlan("d1");
  assert.equal(gotPlan?.id, "p1");
  assert.equal(gotPlan?.tasks.length, 1);

  const result: ValidationResult = {
    id: "res1", taskId: "t1", planId: "p1", decisionId: "d1", opportunityId: "opp-1",
    actualSample: "10", actualResult: "9 人付费", userFeedback: "ok", actualConversionRate: 0.9, actualRevenue: 900,
    outcome: "confirmed", submittedBy: "user", submittedAt: "now",
  };
  await repo.saveResult(result);
  const results = await repo.listResults("p1");
  assert.equal(results.length, 1);
  assert.equal(results[0].actualConversionRate, 0.9);
  assert.equal(results[0].outcome, "confirmed");
});

test("score update 保存：listScoreUpdates 往返", async () => {
  const mock = new MockSupabase();
  const repo = createRepo(mock);
  const update: ScoreUpdate = {
    decisionId: "d1",
    fromVersion: 1,
    toVersion: 2,
    before: { version: 1, overall_score: 7.3, confidence: 0.54, score_breakdown: [], assumptions: [], unknowns: [], validation_required: [], createdAt: "now" },
    after: { version: 2, overall_score: 7.6, confidence: 0.59, score_breakdown: [], assumptions: [], unknowns: [], validation_required: [], createdAt: "now", reason: "验证后更新" },
    reason: "验证后更新",
    newEvidence: [{ claim: "验证结果", evidenceClass: "FACT", confidence: 0.9 }],
    validationResults: [{ taskId: "t1", outcome: "confirmed", note: "n" }],
    createdAt: "now",
  };
  await repo.saveScoreUpdate(update);
  const list = await repo.listScoreUpdates("d1");
  assert.equal(list.length, 1);
  assert.equal(list[0].toVersion, 2);
  assert.equal(list[0].after.overall_score, 7.6);
  assert.equal(list[0].newEvidence.length, 1);
});

test("learning event 保存：saveEvents 批量 + listEvents 过滤", async () => {
  const mock = new MockSupabase();
  const repo = createRepo(mock);
  const e1: LearningEvent = { id: "e1", userId: "u1", opportunityId: "opp-1", skill: "strategic_judgment", signal: "positive", severity: 0.3, evidence: "x", createdAt: "now" };
  const e2: LearningEvent = { id: "e2", userId: "u1", opportunityId: "opp-2", skill: "validation", signal: "neutral", severity: 0.5, evidence: "y", createdAt: "now" };
  await repo.saveEvents([e1, e2]);
  const all = await repo.listEvents();
  assert.equal(all.length, 2);
  const filtered = await repo.listEvents("opp-1");
  assert.deepEqual(filtered.map((e) => e.id), ["e1"]);
});

test("错误包装：上游错误 → SupabaseRepositoryError", async () => {
  const mock = new MockSupabase();
  const repo = createRepo(mock);
  mock.failNext = true;
  await assert.rejects(
    () => repo.saveDecision(sampleDecision()),
    (e: unknown) => e instanceof SupabaseRepositoryError && e.operation === "saveDecision",
  );
});

test("数据映射失败：脏决策行 → SupabaseRepositoryError(mapDecision)", async () => {
  const mock = new MockSupabase();
  mock.db.set("decisions", [{ id: "bad", user_id: "u1", opportunity_id: "opp-1", decision: "validate", created_at: "now" }] as Row[]); // 缺 judgment
  const repo = createRepo(mock);
  await assert.rejects(
    () => repo.getDecision("bad"),
    (e: unknown) => e instanceof SupabaseRepositoryError && e.operation === "mapDecision",
  );
});
