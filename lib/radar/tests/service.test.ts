/**
 * AI 商业雷达持久化 Service 测试（V1.2.1）。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { saveRadarFindings, buildScanHistory } from "../service";
import type { OpportunityRepository } from "../../opportunity/repository";
import type { Opportunity, OpportunityInput, RadarFinding } from "../../types/opportunity";

function finding(i: number): RadarFinding {
  return {
    name: "机会" + i,
    description: "描述" + i,
    source: "AI 扫描",
    category: "科技",
    marketSize: "大",
    growth: "快",
    competition: "中",
    entryBarrier: "低",
    profitability: "高",
    score: 70 + i,
    suggestion: "值得研究",
    scannedAt: "2026-08-25T00:00:00.000Z",
  };
}

function makeRepo(store: Opportunity[]): OpportunityRepository {
  return {
    listOpportunities: async () => [...store],
    createOpportunity: async (input: OpportunityInput) => {
      const o: Opportunity = {
        id: "opp-" + store.length,
        name: input.name,
        description: input.description,
        source: input.source,
        status: input.status ?? "discovered",
        createdAt: new Date().toISOString(),
        notes: input.notes,
        radar: input.radar,
        sourceType: input.radar ? "ai_radar" : "manual_create",
        scanId: input.radar?.scanId,
      };
      store.push(o);
      return o;
    },
    getOpportunity: async () => undefined,
    updateOpportunity: async () => undefined,
    deleteOpportunity: async () => true,
  };
}

test("saveRadarFindings：每个发现自动写入数据库（status=discovered + scanId）", async () => {
  const store: Opportunity[] = [];
  const repo = makeRepo(store);
  const saved = await saveRadarFindings([finding(0), finding(1), finding(2)], "scan-1", repo);
  assert.equal(saved.length, 3);
  assert.equal(store.length, 3, "全部写入数据库");
  assert.equal(store[0].status, "discovered");
  assert.equal(store[0].scanId, "scan-1");
  assert.equal(store[0].sourceType, "ai_radar");
  assert.equal(store[0].radar?.scanId, "scan-1");
});

test("重新进入页面（新读取）→ 机会仍在数据库", async () => {
  const store: Opportunity[] = [];
  await saveRadarFindings([finding(0)], "scan-1", makeRepo(store));
  // 模拟重新登录/重新读取：新 repo 读同一存储
  const fresh = await makeRepo(store).listOpportunities();
  assert.equal(fresh.length, 1);
  assert.equal(fresh[0].name, "机会0");
  assert.equal(fresh[0].scanId, "scan-1");
});

test("buildScanHistory：按 scanId 统计 发现数量/进入研究数量", async () => {
  const store: Opportunity[] = [
    { id: "a", name: "a", description: "d", source: "ai", status: "discovered", createdAt: "2026-08-25T00:00:00.000Z", scanId: "s1", sourceType: "ai_radar" },
    { id: "b", name: "b", description: "d", source: "ai", status: "researching", createdAt: "2026-08-25T00:00:01.000Z", scanId: "s1", sourceType: "ai_radar" },
    { id: "c", name: "c", description: "d", source: "ai", status: "reviewing", createdAt: "2026-08-25T00:00:02.000Z", scanId: "s1", sourceType: "ai_radar" },
    { id: "d", name: "d", description: "d", source: "ai", status: "discovered", createdAt: "2026-08-24T00:00:00.000Z", scanId: "s0", sourceType: "ai_radar" },
  ];
  const history = buildScanHistory(store);
  assert.equal(history.length, 2);
  const s1 = history.find((h) => h.scanId === "s1");
  assert.ok(s1);
  assert.equal(s1.found, 3);
  assert.equal(s1.researched, 1, "只有 researching 计入进入研究");
  assert.equal(history[0].scanId, "s1", "按时间倒序");
});
