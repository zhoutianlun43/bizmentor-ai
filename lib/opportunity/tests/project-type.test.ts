/**
 * V2.0 项目类型（projectType）测试：默认值/兼容旧数据/本地存储持久化。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PROJECT_TYPE, normalizeProjectType, PROJECT_TYPE_LABELS } from "../../types/opportunity";
import { LocalOpportunityRepository } from "../local-repository";
import { addOpportunity, loadOpportunities } from "../../store/opportunity-store";

// ---------- Node 环境模拟浏览器 localStorage ----------
const mem = new Map<string, string>();
(globalThis as { window?: unknown }).window = {
  localStorage: {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => { mem.set(k, String(v)); },
    removeItem: (k: string) => { mem.delete(k); },
  },
  addEventListener: () => undefined,
  dispatchEvent: () => true,
};

test("V2.0 normalizeProjectType：旧数据/脏数据默认 OPPORTUNITY", () => {
  assert.equal(DEFAULT_PROJECT_TYPE, "OPPORTUNITY");
  assert.equal(normalizeProjectType(undefined), "OPPORTUNITY");
  assert.equal(normalizeProjectType(null), "OPPORTUNITY");
  assert.equal(normalizeProjectType("ACTIVE_PROJECT"), "ACTIVE_PROJECT");
  assert.equal(normalizeProjectType("OPPORTUNITY"), "OPPORTUNITY");
  assert.equal(normalizeProjectType("whatever"), "OPPORTUNITY");
  assert.equal(PROJECT_TYPE_LABELS.OPPORTUNITY, "商业机会探索");
  assert.equal(PROJECT_TYPE_LABELS.ACTIVE_PROJECT, "已有运营项目");
});

test("V2.0 addOpportunity：缺省 OPPORTUNITY / 显式 ACTIVE_PROJECT", () => {
  mem.clear();
  const o1 = addOpportunity({ name: "默认商机", description: "d", source: "user" });
  assert.equal(o1.projectType, "OPPORTUNITY");
  const o2 = addOpportunity({ name: "已有项目", description: "d", source: "user", projectType: "ACTIVE_PROJECT" });
  assert.equal(o2.projectType, "ACTIVE_PROJECT");
});

test("V2.0 兼容旧数据：本地无 projectType 的记录加载后默认 OPPORTUNITY", () => {
  mem.clear();
  const legacy = [
    { id: "legacy-1", name: "旧商机", description: "d", source: "user", status: "researching", createdAt: "2026-08-01T00:00:00.000Z" },
  ];
  mem.set("bizmentor:v1:opportunities", JSON.stringify(legacy));
  const list = loadOpportunities();
  assert.equal(list.length, 1);
  assert.equal(list[0].id, "legacy-1");
  assert.equal(list[0].projectType, "OPPORTUNITY");
  assert.equal(list[0].name, "旧商机");
});

test("V2.0 LocalOpportunityRepository：create/get 持久化 projectType", async () => {
  mem.clear();
  const repo = new LocalOpportunityRepository();
  const created = await repo.createOpportunity({ name: "经营中项目", description: "d", source: "user", projectType: "ACTIVE_PROJECT" });
  assert.equal(created.projectType, "ACTIVE_PROJECT");
  const got = await repo.getOpportunity(created.id);
  assert.equal(got?.projectType, "ACTIVE_PROJECT");
  const defaulted = await repo.createOpportunity({ name: "机会", description: "d", source: "user" });
  const got2 = await repo.getOpportunity(defaulted.id);
  assert.equal(got2?.projectType, "OPPORTUNITY");
});
