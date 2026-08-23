import { test } from "node:test";
import assert from "node:assert/strict";
import { enforceEvidenceRules, isRealSource, toSourceDocuments } from "../sources";
import type { EvidenceItem, SourceDocument } from "../types";

const DOCS: SourceDocument[] = [
  { id: "m1", title: "用户访谈记录", sourceType: "USER_PROVIDED", content: "10 位用户愿意付费", createdAt: "2026-08-23T00:00:00.000Z" },
];

test("FACT 带 USER_PROVIDED 来源（存在）→ 保留 FACT", () => {
  const items: EvidenceItem[] = [
    { claim: "用户愿意付费", evidenceClass: "FACT", confidence: 0.9, sourceRef: { sourceType: "USER_PROVIDED", sourceId: "m1" } },
  ];
  const enforced = enforceEvidenceRules(items, DOCS);
  assert.equal(enforced[0].evidenceClass, "FACT");
  assert.equal(enforced[0].confidence, 0.9);
});

test("FACT 无来源 → 自动降级 AI_INFERENCE", () => {
  const items: EvidenceItem[] = [{ claim: "市场规模 100 亿", evidenceClass: "FACT", confidence: 0.8 }];
  const enforced = enforceEvidenceRules(items, DOCS);
  assert.equal(enforced[0].evidenceClass, "AI_INFERENCE");
  assert.ok(enforced[0].note?.includes("降级"));
});

test("FACT 引用不可用来源 → 自动降级 NEEDS_VALIDATION 并提示缺少外部证据", () => {
  const items: EvidenceItem[] = [
    { claim: "竞品 A 营收 10 亿", evidenceClass: "FACT", confidence: 0.7, sourceRef: { sourceType: "USER_PROVIDED", sourceId: "missing" } },
  ];
  const enforced = enforceEvidenceRules(items, DOCS);
  assert.equal(enforced[0].evidenceClass, "NEEDS_VALIDATION");
  assert.ok(enforced[0].note?.includes("缺少外部证据"));
});

test("FACT 引用未来外部来源但无 url/文档 → NEEDS_VALIDATION", () => {
  const items: EvidenceItem[] = [
    { claim: "行业增长率 20%", evidenceClass: "FACT", confidence: 0.7, sourceRef: { sourceType: "EXTERNAL_WEB" } },
  ];
  const enforced = enforceEvidenceRules(items, DOCS);
  assert.equal(enforced[0].evidenceClass, "NEEDS_VALIDATION");
});

test("ASSUMPTION / AI_INFERENCE 保持原分类", () => {
  const items: EvidenceItem[] = [
    { claim: "假设", evidenceClass: "ASSUMPTION", confidence: 0.3 },
    { claim: "推断", evidenceClass: "AI_INFERENCE", confidence: 0.6 },
  ];
  const enforced = enforceEvidenceRules(items, DOCS);
  assert.equal(enforced[0].evidenceClass, "ASSUMPTION");
  assert.equal(enforced[1].evidenceClass, "AI_INFERENCE");
});

test("confidence 越界 → clamp 到 0-1", () => {
  const items: EvidenceItem[] = [
    { claim: "a", evidenceClass: "AI_INFERENCE", confidence: 1.5 },
    { claim: "b", evidenceClass: "ASSUMPTION", confidence: -0.2 },
  ];
  const enforced = enforceEvidenceRules(items, DOCS);
  assert.equal(enforced[0].confidence, 1);
  assert.equal(enforced[1].confidence, 0);
});

test("isRealSource：USER_PROVIDED 需文档存在", () => {
  assert.equal(isRealSource({ sourceType: "USER_PROVIDED", sourceId: "m1" }, DOCS), true);
  assert.equal(isRealSource({ sourceType: "USER_PROVIDED", sourceId: "nope" }, DOCS), false);
  assert.equal(isRealSource(undefined, DOCS), false);
  assert.equal(isRealSource({ sourceType: "EXTERNAL_WEB" }, DOCS), false);
  assert.equal(isRealSource({ sourceType: "EXTERNAL_WEB", url: "https://x.com" }, DOCS), true);
});

test("toSourceDocuments：用户资料转为 USER_PROVIDED 文档", () => {
  const docs = toSourceDocuments([{ id: "u1", title: "资料", content: "内容" }]);
  assert.equal(docs.length, 1);
  assert.equal(docs[0].sourceType, "USER_PROVIDED");
});