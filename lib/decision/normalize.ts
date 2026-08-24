/**
 * AI Examiner 输出规范化（V0.4.1 Phase 7A 修复）。
 * 背景：降级模型（如 DeepSeek）可能输出枚举值不符合严格 schema（如 weaknesses.category /
 * ability_signals.skill），导致两次校验失败、Examiner 硬失败。
 * 方案：schema 校验前做确定性规范化（大小写/分隔符模糊匹配 → 合法枚举；越界数值 clamp；
 * 缺失描述给空串），规范化后仍缺字段才走重试。
 * 原则：规范的是「格式」，不改变评审内容；绝不伪造证据/结果。
 */
import { abilitySkillSchema, weaknessCategorySchema } from "./schema";
import type { AbilitySkill, WeaknessCategory } from "./types";

/** 归一化枚举键：小写 + 去除非字母数字（willingness to pay → willingnesstopay） */
function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** 模糊匹配：精确 → 包含（双向）→ fallback */
function fuzzyMatch<T extends string>(value: string, candidates: readonly T[], fallback: T): T {
  const key = normalizeKey(value);
  if (!key) return fallback;
  const exact = candidates.find((c) => normalizeKey(c) === key);
  if (exact) return exact;
  const contains = candidates.find((c) => normalizeKey(c).includes(key) || key.includes(normalizeKey(c)));
  return contains ?? fallback;
}

export function normalizeWeaknessCategory(value: unknown): WeaknessCategory {
  if (typeof value !== "string") return "logic_gap";
  return fuzzyMatch(value, weaknessCategorySchema.options as readonly WeaknessCategory[], "logic_gap");
}

export function normalizeAbilitySkill(value: unknown): AbilitySkill {
  if (typeof value !== "string") return "strategic_judgment";
  return fuzzyMatch(value, abilitySkillSchema.options as readonly AbilitySkill[], "strategic_judgment");
}

export function normalizeSignal(value: unknown): "positive" | "negative" | "neutral" {
  if (typeof value !== "string") return "neutral";
  const key = normalizeKey(value);
  if (key.includes("posit") || key === "pos") return "positive";
  if (key.includes("negat") || key === "neg") return "negative";
  return "neutral";
}

function clamp01(value: unknown): number {
  return typeof value === "number" ? Math.min(1, Math.max(0, value)) : (value as number);
}

function clamp10(value: unknown): number {
  return typeof value === "number" ? Math.min(10, Math.max(0, value)) : (value as number);
}

/** 对 raw 评审输出做确定性规范化（返回可再校验的对象） */
export function normalizeDecisionReviewOutput(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const obj = raw as Record<string, unknown>;
  const out: Record<string, unknown> = { ...obj };

  if (typeof out.score === "number") out.score = clamp10(out.score);

  if (Array.isArray(out.weaknesses)) {
    out.weaknesses = out.weaknesses.map((w) => {
      if (!w || typeof w !== "object") return w;
      const ww = w as Record<string, unknown>;
      return {
        ...ww,
        category: normalizeWeaknessCategory(ww.category),
        severity: clamp01(ww.severity),
        description: typeof ww.description === "string" ? ww.description : "",
      };
    });
  }

  if (Array.isArray(out.ability_signals)) {
    out.ability_signals = out.ability_signals.map((s) => {
      if (!s || typeof s !== "object") return s;
      const ss = s as Record<string, unknown>;
      return {
        ...ss,
        skill: normalizeAbilitySkill(ss.skill),
        signal: normalizeSignal(ss.signal),
        severity: clamp01(ss.severity),
        evidence: typeof ss.evidence === "string" ? ss.evidence : "",
      };
    });
  }

  return out;
}