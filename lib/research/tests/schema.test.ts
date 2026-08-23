import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzerOutputSchema, extractJson, validateWithSchema } from "../schema";

test("合法 Analyzer 输出通过 schema 校验", () => {
  const raw = {
    definition: "定义",
    problem: "问题",
    targetUserHint: "用户",
    initialAssumptions: [
      { claim: "假设", evidenceClass: "ASSUMPTION", confidence: 0.4, sourceRef: null },
    ],
    unknowns: ["未知"],
  };
  const result = validateWithSchema(analyzerOutputSchema, raw);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.data.definition, "定义");
});

test("缺字段 → schema 校验失败", () => {
  const result = validateWithSchema(analyzerOutputSchema, { definition: "只有定义" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.length > 0);
});

test("confidence 越界（>1）→ 校验失败", () => {
  const raw = {
    definition: "定义",
    problem: "问题",
    targetUserHint: "用户",
    initialAssumptions: [{ claim: "x", evidenceClass: "FACT", confidence: 1.5, sourceRef: null }],
    unknowns: [],
  };
  const result = validateWithSchema(analyzerOutputSchema, raw);
  assert.equal(result.ok, false);
});

test("非法 evidenceClass → 校验失败", () => {
  const raw = {
    definition: "定义",
    problem: "问题",
    targetUserHint: "用户",
    initialAssumptions: [{ claim: "x", evidenceClass: "MADE_UP", confidence: 0.5, sourceRef: null }],
    unknowns: [],
  };
  const result = validateWithSchema(analyzerOutputSchema, raw);
  assert.equal(result.ok, false);
});

test("extractJson：支持纯 JSON / 代码块 / 夹带文字", () => {
  const plain = '{"a":1}';
  assert.deepEqual(extractJson(plain), { a: 1 });
  const fenced = '```json\n{"a":2}\n```';
  assert.deepEqual(extractJson(fenced), { a: 2 });
  const prose = '好的，结果如下：{"a":3} 完毕';
  assert.deepEqual(extractJson(prose), { a: 3 });
});

test("extractJson：非法内容抛错", () => {
  assert.throws(() => extractJson("完全不是 JSON"), /JSON/);
});