/**
 * AI 发现机会池测试（V1.3）：覆盖 6 个验收场景。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { saveRadarFindings, buildRadarNotes, parseRadarNotes, setRadarMeta, pickPoolFields } from "../service";
import { applyPoolAction, sortPool, priorityScore } from "../pool-service";
import type { OpportunityRepository } from "../../opportunity/repository";
import type { Opportunity, OpportunityInput, RadarFinding } from "../../types/opportunity";

function finding(i: number): RadarFinding {
  return { name: "机会" + i, description: "描述", source: "AI", category: "科技", marketSize: "大", growth: "快", competition: "中", entryBarrier: "低", profitability: "高", score: 60 + i, suggestion: "值得研究", scannedAt: "2026-08-25T00:00:00.000Z" };
}

function makeRepo(store: Opportunity[]): OpportunityRepository {
  return {
    listOpportunities: async () => [...store],
    createOpportunity: async (input: OpportunityInput) => {
      const o: Opportunity = {
        id: "id-" + store.length,
        name: input.name, description: input.description, source: input.source,
        status: input.status ?? "discovered",
        createdAt: new Date().toISOString(),
        notes: input.notes,
        radar: input.radar,
        sourceType: "ai_radar",
        scanId: input.radar?.scanId,
        opportunityStatus: input.opportunityStatus ?? "discovered",
        ...pickPoolFields(parseRadarNotes(input.notes)),
      };
      store.push(o);
      return o;
    },
    getOpportunity: async (id) => store.find((x) => x.id === id),
    updateOpportunity: async (id, patch) => {
      const i = store.findIndex((x) => x.id === id);
      if (i < 0) return undefined;
      store[i] = { ...store[i], ...patch, ...(patch.notes ? pickPoolFields(parseRadarNotes(patch.notes)) : {}) };
      return store[i];
    },
    deleteOpportunity: async () => true,
  };
}

test("场景1+2：扫描 20 个 → 累计 +20，重读仍在", async () => {
  const store: Opportunity[] = [];
  const repo = makeRepo(store);
  const saved = await saveRadarFindings(Array.from({ length: 20 }, (_, i) => finding(i)), "scan-big", repo);
  assert.equal(saved.length, 20);
  assert.equal((await repo.listOpportunities()).length, 20, "全部入库");
  // 重读（新实例读同一存储）
  const fresh = await makeRepo(store).listOpportunities();
  assert.equal(fresh.length, 20);
  assert.ok(fresh.every((o) => o.opportunityStatus === "discovered"));
  assert.ok(fresh.every((o) => o.scanId === "scan-big"));
});

test("场景3：收藏 5 个 → 收藏状态 5", async () => {
  const store: Opportunity[] = [];
  const repo = makeRepo(store);
  await saveRadarFindings(Array.from({ length: 10 }, (_, i) => finding(i)), "s", repo);
  const list = await repo.listOpportunities();
  for (const o of list.slice(0, 5)) await applyPoolAction(o.id, "favorite", repo);
  const after = await repo.listOpportunities();
  assert.equal(after.filter((o) => o.opportunityStatus === "favorite").length, 5);
  assert.ok(after.filter((o) => o.opportunityStatus === "favorite").every((o) => o.favoriteAt));
});

test("场景4：推进 3 个 → 推进状态 3", async () => {
  const store: Opportunity[] = [];
  const repo = makeRepo(store);
  await saveRadarFindings(Array.from({ length: 8 }, (_, i) => finding(i)), "s", repo);
  const list = await repo.listOpportunities();
  for (const o of list.slice(0, 3)) await applyPoolAction(o.id, "promote", repo);
  const after = await repo.listOpportunities();
  assert.equal(after.filter((o) => o.opportunityStatus === "promoting").length, 3);
  assert.ok(after.filter((o) => o.opportunityStatus === "promoting").every((o) => o.promotedAt));
});

test("场景5：放弃 2 个 → 保留原因/时间（历史记录）", async () => {
  const store: Opportunity[] = [];
  const repo = makeRepo(store);
  await saveRadarFindings(Array.from({ length: 6 }, (_, i) => finding(i)), "s", repo);
  const list = await repo.listOpportunities();
  const r1 = await applyPoolAction(list[0].id, "reject", repo, { reason: "市场规模不足" });
  const r2 = await applyPoolAction(list[1].id, "reject", repo, { reason: "供应链风险" });
  assert.ok(r1.ok && r2.ok);
  const after = await repo.listOpportunities();
  const rejected = after.filter((o) => o.opportunityStatus === "rejected");
  assert.equal(rejected.length, 2);
  assert.ok(rejected.every((o) => o.rejectedAt), "保留时间");
  assert.ok(rejected.some((o) => o.rejectReason === "市场规模不足"), "保留原因");
});

test("场景6：删除 → 默认列表不显示但数据库保留（软删除 + deletedAt）", async () => {
  const store: Opportunity[] = [];
  const repo = makeRepo(store);
  await saveRadarFindings([finding(0), finding(1)], "s", repo);
  const list = await repo.listOpportunities();
  await applyPoolAction(list[0].id, "delete", repo);
  const after = await repo.listOpportunities();
  const deleted = after.find((o) => o.id === list[0].id);
  assert.ok(deleted, "数据库保留记录");
  assert.equal(deleted.opportunityStatus, "deleted");
  assert.ok(deleted.deletedAt, "保留 deletedAt");
  // 默认列表过滤（UI 层不显示 deleted）
  assert.equal(after.filter((o) => o.opportunityStatus !== "deleted").length, 1);
});

test("开始研究：discovered → researching + status=researching", async () => {
  const store: Opportunity[] = [];
  const repo = makeRepo(store);
  await saveRadarFindings([finding(0)], "s", repo);
  const o = (await repo.listOpportunities())[0];
  await applyPoolAction(o.id, "research", repo);
  const after = await repo.listOpportunities();
  assert.equal(after[0].opportunityStatus, "researching");
  assert.equal(after[0].status, "researching");
});

test("setRadarMeta/parseRadarNotes：含特殊字符原因往返", async () => {
  const notes = buildRadarNotes(finding(1), "scan-x");
  const updated = setRadarMeta(notes, { opportunityStatus: "rejected", rejectedAt: "2026-08-25T00:00:00.000Z", rejectReason: "市场/竞争 风险" });
  const meta = parseRadarNotes(updated);
  assert.equal(meta.opportunityStatus, "rejected");
  assert.equal(meta.rejectReason, "市场/竞争 风险");
  assert.equal(meta.scanId, "scan-x");
  assert.equal(meta.score, 61);
});

test("AI 优先级排序：值得研究+高分优先，最新优先", async () => {
  const a: Opportunity = { id: "a", name: "a", description: "d", source: "ai", status: "discovered", createdAt: "2026-08-25T01:00:00.000Z", notes: buildRadarNotes(finding(9), "s"), sourceType: "ai_radar", opportunityStatus: "discovered" };
  const b: Opportunity = { id: "b", name: "b", description: "d", source: "ai", status: "discovered", createdAt: "2026-08-25T02:00:00.000Z", notes: buildRadarNotes(finding(2), "s"), sourceType: "ai_radar", opportunityStatus: "discovered" };
  const sorted = sortPool([a, b]);
  assert.equal(sorted[0].id, "a", "高优先级在前");
  assert.ok(priorityScore(a) > priorityScore(b));
});
