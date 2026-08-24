/**
 * 可执行验证方案测试（V0.4.1 Phase 7A）。
 * 注意：独立文件，避免覆盖旧的 validation.test.ts。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultDeadline, mapDimensionByDomain, materializeValidationTasks } from "../validation";
import type { ValidationPlanItem } from "../../research/types";

const ITEMS: ValidationPlanItem[] = [
  { assumption: "10 月话题热度达全年峰值", method: "Google Trends", successCriteria: "峰值 ≥ 2 倍", effort: "low" },
  { assumption: "付费意愿高", method: "A/B 广告测试", successCriteria: "转化率 ≥ 2%", effort: "medium", hypothesis: "含网红素材转化更高", sampleSize: "两组各 500 次展示" },
];

test("materializeValidationTasks：缺失字段全部确定性填充", () => {
  const tasks = materializeValidationTasks(ITEMS, { domain: "ecommerce" });
  assert.equal(tasks.length, 2);
  const t0 = tasks[0];
  assert.equal(t0.assumption, "10 月话题热度达全年峰值");
  assert.equal(t0.hypothesis, t0.assumption, "hypothesis 缺省 = assumption");
  assert.equal(t0.sampleSize, "建议 20-50");
  assert.ok(t0.failureCriteria.includes("未达到成功标准"), "failureCriteria 缺省生成");
  assert.ok(t0.deadline.length >= 8, "deadline 缺省 = 30 天后日期");
  assert.equal(t0.costEstimate, "待估算");
  assert.equal(t0.owner, "本人");
  assert.equal(t0.relatedDimension, "willingnessToPay", "电商 index 0 → willingnessToPay");
});

test("materializeValidationTasks：已提供的字段保留", () => {
  const tasks = materializeValidationTasks(ITEMS, { domain: "ecommerce" });
  const t1 = tasks[1];
  assert.equal(t1.hypothesis, "含网红素材转化更高");
  assert.equal(t1.sampleSize, "两组各 500 次展示");
});

test("mapDimensionByDomain：按领域偏好映射 + 循环", () => {
  assert.equal(mapDimensionByDomain("ecommerce", 0), "willingnessToPay");
  assert.equal(mapDimensionByDomain("ecommerce", 1), "customerAcquisition");
  assert.equal(mapDimensionByDomain("saas", 0), "willingnessToPay");
  assert.equal(mapDimensionByDomain(undefined, 0), "willingnessToPay");
});

test("defaultDeadline：返回未来日期（YYYY-MM-DD）", () => {
  const d = defaultDeadline();
  assert.match(d, /^\d{4}-\d{2}-\d{2}$/);
});