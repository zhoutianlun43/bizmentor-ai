/**
 * AI 商业雷达测试（V0.8）。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRadarReport } from "../parse";
import { SupabaseOpportunityRepository } from "../../opportunity/supabase-repository";

const VALID = `[
  {"name":"AI 个人知识管理服务增长机会","description":"值得关注","source":"趋势分析","category":"AI应用","marketSize":"大","growth":"高","competition":"中","entryBarrier":"低","profitability":"高","score":88,"suggestion":"值得研究"},
  {"name":"二手设备翻新服务","description":"机会","source":"扫描","category":"服务","marketSize":"中","growth":"中","competition":"低","entryBarrier":"中","profitability":"中","score":76,"suggestion":"继续观察"}
]`;

test("parseRadarReport：合法 JSON → 归一化 + 按评分降序", () => {
  const list = parseRadarReport(VALID, "2026-08-25T00:00:00.000Z");
  assert.equal(list.length, 2);
  assert.equal(list[0].score, 88, "应降序");
  assert.equal(list[0].category, "AI应用");
  assert.equal(list[0].suggestion, "值得研究");
  assert.ok(list[0].scannedAt);
});

test("parseRadarReport：非法/无数组 → []", () => {
  assert.equal(parseRadarReport("不是 JSON").length, 0);
  assert.equal(parseRadarReport("").length, 0);
});

test("parseRadarReport：字段兜底 + 评分 clamp + 非法 suggestion", () => {
  const list = parseRadarReport(
    JSON.stringify([{ name: "x", score: 500, suggestion: "乱写", marketSize: "大" }]),
  );
  assert.equal(list.length, 1);
  assert.equal(list[0].score, 100, "评分 clamp 到 100");
  assert.equal(list[0].suggestion, "继续观察", "非法 suggestion 回退");
  assert.equal(list[0].growth, "待验证", "缺省字段回退");
});

test("Opportunity radar：Supabase 仓库保存/读取（mock）", async () => {
  const db: Array<Record<string, unknown>> = [];
  const client = {
    from: () => ({
      insert: async (row: Record<string, unknown>) => { db.push(row); return { error: null }; },
      select: () => {
        const filters: Array<[string, unknown]> = [];
        const chain = {
          eq: (c: string, v: unknown) => { filters.push([c, v]); return chain; },
          maybeSingle: async () => ({ data: db.find((r) => filters.every(([c, v]) => r[c] === v)) ?? null, error: null }),
        };
        return chain;
      },
    }),
  } as never;
  const repo = new SupabaseOpportunityRepository(client, { userId: "u1" });
  const created = await repo.createOpportunity({
    name: "AI 知识管理服务",
    description: "desc",
    source: "ai",
    radar: { name: "AI 知识管理服务", description: "desc", source: "扫描", category: "AI应用", marketSize: "大", growth: "高", competition: "中", entryBarrier: "低", profitability: "高", score: 88, suggestion: "值得研究", scannedAt: "2026-08-25T00:00:00.000Z" },
  });
  assert.equal((db[0].radar as { score: number }).score, 88, "radar 应写入行");
  const got = await repo.getOpportunity(created.id);
  assert.equal(got?.radar?.category, "AI应用");
  assert.equal(got?.radar?.suggestion, "值得研究");
});