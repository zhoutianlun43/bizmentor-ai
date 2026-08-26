import { test } from "node:test";
import assert from "node:assert/strict";
import { SupabaseOpportunityRepository } from "../supabase-repository";
import { SupabaseRepositoryError } from "../../supabase/errors";
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
  private op?: "insert" | "update" | "delete";
  private payload?: Row;

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
  insert(row: Row): this {
    this.op = "insert";
    this.payload = row;
    return this;
  }
  update(payload: Row): this {
    this.op = "update";
    this.payload = payload;
    return this;
  }
  delete(): this {
    this.op = "delete";
    return this;
  }

  private match(row: Row): boolean {
    return this.filters.every(([col, v]) => row[col] === v);
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

  async single(): Promise<{ data: Row | null; error: MockError | null }> {
    const err = this.mock.takeFail();
    if (err) return { data: null, error: err };
    if (this.op === "update" && this.payload) {
      const rows = this.db.get(this.table) ?? [];
      const targets = rows.filter((r) => this.match(r));
      targets.forEach((r) => Object.assign(r, this.payload));
      this.db.set(this.table, rows);
      return { data: targets.length > 0 ? { ...targets[0] } : null, error: null };
    }
    const rows = this.rows();
    return { data: rows.length > 0 ? rows[0] : null, error: null };
  }

  then<T>(
    onfulfilled?: (value: { data: unknown; error: MockError | null; count?: number }) => T | PromiseLike<T>,
  ): Promise<T> {
    const err = this.mock.takeFail();
    const tableRows = this.db.get(this.table) ?? [];
    if (this.op === "insert" && this.payload) {
      const insertErr = this.mock.takeInsertFail() as MockError | null;
      if (insertErr) return Promise.resolve({ data: null, error: insertErr }).then(onfulfilled);
      tableRows.push({ ...this.payload });
      this.db.set(this.table, tableRows);
      return Promise.resolve({ data: this.payload, error: err }).then(onfulfilled);
    }
    if (this.op === "delete") {
      const before = tableRows.length;
      const after = tableRows.filter((r) => !this.match(r));
      this.db.set(this.table, after);
      return Promise.resolve({ data: null, error: err, count: before - after.length }).then(onfulfilled);
    }
    return Promise.resolve({ data: err ? [] : this.rows(), error: err }).then(onfulfilled);
  }
}

class MockSupabase {
  readonly db = new Map<string, Row[]>();
  failNext = false;
  failNextInsert: unknown = null;
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
  takeInsertFail(): unknown {
    if (this.failNextInsert !== null) {
      const e = this.failNextInsert;
      this.failNextInsert = null;
      return e;
    }
    return null;
  }
}

function createRepo(mock: MockSupabase): SupabaseOpportunityRepository {
  return new SupabaseOpportunityRepository(mock as unknown as SupabaseClient, { userId: "u1", table: "opportunities" });
}

function sampleRow(overrides: Partial<Row> = {}): Row {
  return {
    id: "opp-1",
    user_id: "u1",
    name: "AI × 电商运营自动化",
    description: "面向中小卖家的 AI 运营助手",
    source: "user",
    status: "researching",
    score: null,
    notes: null,
    created_at: "2026-08-24T00:00:00.000Z",
    updated_at: "2026-08-24T00:00:00.000Z",
    ...overrides,
  };
}

// ===================== tests =====================

test("create 成功：生成 id/状态，写入行（score/notes 为 jsonb null）", async () => {
  const mock = new MockSupabase();
  const repo = createRepo(mock);
  const opp = await repo.createOpportunity({
    name: "  本地宠物洗护  ",
    description: " 上门洗护预约 ",
    source: "user",
    notes: " 备注 ",
  });
  assert.ok(opp.id);
  assert.equal(opp.name, "本地宠物洗护");
  assert.equal(opp.status, "researching");
  assert.ok(opp.createdAt);

  const rows = mock.db.get("opportunities") ?? [];
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, opp.id);
  assert.equal(rows[0].user_id, "u1");
  assert.equal(rows[0].name, "本地宠物洗护");
  assert.equal(rows[0].score, null);
  assert.equal(rows[0].notes, "备注");
});

test("get 不存在 → undefined", async () => {
  const mock = new MockSupabase();
  const repo = createRepo(mock);
  assert.equal(await repo.getOpportunity("nope"), undefined);
});

test("list 排序：created_at 倒序", async () => {
  const mock = new MockSupabase();
  mock.db.set("opportunities", [
    sampleRow({ id: "a", created_at: "2026-08-24T00:00:00.000Z" }),
    sampleRow({ id: "c", created_at: "2026-08-24T02:00:00.000Z" }),
    sampleRow({ id: "b", created_at: "2026-08-24T01:00:00.000Z" }),
    sampleRow({ id: "other-user", user_id: "u2" }),
  ]);
  const repo = createRepo(mock);
  const list = await repo.listOpportunities();
  assert.deepEqual(list.map((o) => o.id), ["c", "b", "a"]);
});

test("update 覆盖：字段更新、id 不变、返回更新后对象", async () => {
  const mock = new MockSupabase();
  mock.db.set("opportunities", [sampleRow()]);
  const repo = createRepo(mock);
  const updated = await repo.updateOpportunity("opp-1", {
    name: "新名字",
    status: "validating",
    score: { demand: 8, competition: 6, willingnessToPay: 7, moat: 5, risk: 4, overall: 7.2 },
  });
  assert.ok(updated);
  assert.equal(updated?.id, "opp-1");
  assert.equal(updated?.name, "新名字");
  assert.equal(updated?.status, "validating");
  assert.equal(updated?.score?.overall, 7.2);

  const rows = mock.db.get("opportunities") ?? [];
  assert.equal(rows[0].name, "新名字");
  assert.equal(rows[0].status, "validating");
  assert.ok(rows[0].updated_at, "更新应写入 updated_at");
});

test("update 不存在 → undefined", async () => {
  const mock = new MockSupabase();
  const repo = createRepo(mock);
  assert.equal(await repo.updateOpportunity("nope", { name: "x" }), undefined);
});

test("delete 成功：删除后 get 返回 undefined", async () => {
  const mock = new MockSupabase();
  mock.db.set("opportunities", [sampleRow()]);
  const repo = createRepo(mock);
  assert.equal(await repo.deleteOpportunity("opp-1"), true);
  assert.equal(await repo.getOpportunity("opp-1"), undefined);
  assert.equal((mock.db.get("opportunities") ?? []).length, 0);
});

test("数据映射错误：脏数据 → SupabaseRepositoryError(mapRow)", async () => {
  const mock = new MockSupabase();
  mock.db.set("opportunities", [sampleRow({ name: undefined })]);
  const repo = createRepo(mock);
  await assert.rejects(
    () => repo.getOpportunity("opp-1"),
    (e: unknown) => e instanceof SupabaseRepositoryError && e.operation === "mapRow",
  );
});

test("错误包装：上游错误不直接暴露", async () => {
  const mock = new MockSupabase();
  const repo = createRepo(mock);
  mock.failNext = true;
  await assert.rejects(
    () => repo.createOpportunity({ name: "x", description: "y", source: "user" }),
    (e: unknown) => e instanceof SupabaseRepositoryError && e.operation === "createOpportunity",
  );
});

test("create 降级：缺 radar 列时自动去掉 radar 重试成功（V0.8 兼容旧库）", async () => {
  const mock = new MockSupabase();
  mock.failNextInsert = { code: "PGRST204", message: "Could not find the 'radar' column of 'opportunities' in the schema cache" };
  const repo = createRepo(mock);
  const opp = await repo.createOpportunity({
    name: "AI 个人知识管理服务",
    description: "面向个人的知识管理 SaaS",
    source: "ai",
    notes: "[AI雷达] 科技 · 评分 88 · 值得研究",
    radar: {
      name: "AI 个人知识管理服务",
      description: "个人知识管理 SaaS 增长",
      source: "AI 扫描",
      category: "科技",
      marketSize: "大",
      growth: "快",
      competition: "中",
      entryBarrier: "低",
      profitability: "高",
      score: 88,
      suggestion: "值得研究",
      scannedAt: "2026-08-25T00:00:00.000Z",
    },
  });
  assert.ok(opp.id);
  const rows = mock.db.get("opportunities") ?? [];
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, "AI 个人知识管理服务");
  assert.equal(rows[0].source, "ai");
  assert.equal("radar" in rows[0], false, "降级重试写入的行不应包含 radar 字段");
});

test("create 降级兼容 Postgres 42703（select 路径）", async () => {
  const mock = new MockSupabase();
  mock.failNextInsert = { code: "42703", message: "column opportunities.radar does not exist" };
  const repo = createRepo(mock);
  const opp = await repo.createOpportunity({
    name: "兼容 42703",
    description: "x",
    source: "ai",
    radar: { name: "x", description: "x", source: "s", category: "c", marketSize: "m", growth: "g", competition: "c", entryBarrier: "e", profitability: "p", score: 80, suggestion: "继续观察", scannedAt: "2026-08-25T00:00:00.000Z" },
  });
  assert.ok(opp.id);
  assert.equal((mock.db.get("opportunities") ?? []).length, 1);
});

test("create 降级只对缺 radar 列触发：其他错误照常抛出且不落库", async () => {
  const mock = new MockSupabase();
  mock.failNextInsert = { code: "23505", message: "duplicate key value violates unique constraint" };
  const repo = createRepo(mock);
  await assert.rejects(
    () => repo.createOpportunity({ name: "x", description: "y", source: "user" }),
    (e: unknown) => e instanceof SupabaseRepositoryError && e.operation === "createOpportunity",
  );
  assert.equal((mock.db.get("opportunities") ?? []).length, 0, "失败的插入不应写入任何行");
});


test("V2.0 create/get：projectType 持久化（默认 OPPORTUNITY，显式 ACTIVE_PROJECT）", async () => {
  const mock = new MockSupabase();
  const repo = createRepo(mock);
  const o1 = await repo.createOpportunity({ name: "默认商机", description: "d", source: "user" });
  const o2 = await repo.createOpportunity({ name: "已有项目", description: "d", source: "user", projectType: "ACTIVE_PROJECT" });
  assert.equal(o1.projectType, "OPPORTUNITY");
  assert.equal(o2.projectType, "ACTIVE_PROJECT");
  const rows = mock.db.get("opportunities") ?? [];
  assert.equal(rows.find((r) => r.id === o1.id)?.project_type, "OPPORTUNITY");
  assert.equal(rows.find((r) => r.id === o2.id)?.project_type, "ACTIVE_PROJECT");
  const g1 = await repo.getOpportunity(o1.id);
  const g2 = await repo.getOpportunity(o2.id);
  assert.equal(g1?.projectType, "OPPORTUNITY");
  assert.equal(g2?.projectType, "ACTIVE_PROJECT");
});

test("V2.0 兼容：旧行无 project_type → projectType=OPPORTUNITY", async () => {
  const mock = new MockSupabase();
  const legacy = sampleRow({ id: "legacy-1", name: "旧商机", description: "d" });
  delete legacy.project_type;
  mock.db.set("opportunities", [legacy]);
  const repo = createRepo(mock);
  const got = await repo.getOpportunity("legacy-1");
  assert.equal(got?.projectType, "OPPORTUNITY");
});

test("V2.0 降级：旧库缺 project_type 列 → 去列重试成功", async () => {
  const mock = new MockSupabase();
  mock.failNextInsert = { message: "column project_type does not exist", code: "42703" };
  const repo = createRepo(mock);
  const opp = await repo.createOpportunity({ name: "降级商机", description: "d", source: "user", projectType: "ACTIVE_PROJECT" });
  assert.equal(opp.projectType, "ACTIVE_PROJECT");
  const rows = mock.db.get("opportunities") ?? [];
  assert.equal(rows.length, 1);
  assert.equal(rows[0].project_type, undefined);
});
