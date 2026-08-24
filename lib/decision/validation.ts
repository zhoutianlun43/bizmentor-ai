/**
 * 可执行验证方案（V0.4.1 Phase 7A）。
 * 把研究报告的 ValidationPlanItem 物化为可执行 ValidationTaskInput：
 * - AI 已补充的字段直接采用；缺失字段由确定性默认填充
 * - relatedDimension 按领域偏好映射（缺省循环通用维度）
 */
import type { ScoreDimension, ValidationPlanItem } from "../research/types";
import type { ValidationTaskInput } from "./types";

const DIMENSION_CYCLE: ScoreDimension[] = [
  "willingnessToPay",
  "demand",
  "market",
  "competition",
  "moat",
  "risk",
  "customerAcquisition",
];

const DOMAIN_DIMENSION_PREFERENCE: Record<string, ScoreDimension[]> = {
  ecommerce: ["willingnessToPay", "customerAcquisition", "demand", "competition", "moat", "risk", "market"],
  saas: ["willingnessToPay", "market", "competition", "moat", "risk", "customerAcquisition", "demand"],
  local_service: ["willingnessToPay", "market", "competition", "customerAcquisition", "risk"],
};

/** 领域 → 验证任务维度映射（缺省循环通用维度） */
export function mapDimensionByDomain(domain: string | undefined, index: number): ScoreDimension {
  const list = domain ? (DOMAIN_DIMENSION_PREFERENCE[domain] ?? DIMENSION_CYCLE) : DIMENSION_CYCLE;
  return list[index % list.length];
}

/** 默认截止日期（ISO 日期，默认 30 天后） */
export function defaultDeadline(daysFromNow = 30): string {
  return new Date(Date.now() + daysFromNow * 86400000).toISOString().slice(0, 10);
}

/** 物化为可执行验证任务（所有字段齐全） */
export function materializeValidationTasks(
  items: ValidationPlanItem[],
  opts: { domain?: string } = {},
): ValidationTaskInput[] {
  return items.map((item, i) => ({
    assumption: item.assumption,
    hypothesis: item.hypothesis ?? item.assumption,
    method: item.method,
    sampleSize: item.sampleSize ?? "建议 20-50",
    successCriteria: item.successCriteria,
    failureCriteria: item.failureCriteria ?? `未达到成功标准（${item.successCriteria}）即判定失败`,
    deadline: item.deadline ?? defaultDeadline(),
    costEstimate: item.costEstimate ?? "待估算",
    owner: item.owner ?? "本人",
    relatedDimension: item.relatedDimension ?? mapDimensionByDomain(opts.domain, i),
  }));
}