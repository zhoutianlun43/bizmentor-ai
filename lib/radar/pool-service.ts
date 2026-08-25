/**
 * AI 发现机会池 Service（V1.3）。
 * 动作只改变状态（favorite/promoting/reject/delete 均为软操作，保留时间戳与原因，禁止物理删除）。
 */
import type { Opportunity, OpportunityPoolStatus } from "../types/opportunity";
import type { OpportunityRepository } from "../opportunity/repository";
import { setRadarMeta, parseRadarNotes } from "./service";

export type PoolAction = "favorite" | "unfavorite" | "research" | "promote" | "reject" | "delete" | "restore";

export interface PoolActionResult {
  opportunity?: Opportunity;
  ok: boolean;
}

/** 对任意商机执行统一生命周期动作（V1.x：收藏/删除/推进/研究，不限于 AI 雷达来源） */
export async function applyPoolAction(
  opportunityId: string,
  action: PoolAction,
  repo: OpportunityRepository,
  opts: { reason?: string; by?: string } = {},
): Promise<PoolActionResult> {
  const o = await repo.getOpportunity(opportunityId);
  if (!o) return { ok: false };
  const now = new Date().toISOString();
  const meta = parseRadarNotes(o.notes);
  const patch: Partial<Omit<Opportunity, "id" | "createdAt">> = {};

  switch (action) {
    case "favorite":
      meta.isFavorite = true;
      meta.opportunityStatus = o.source === "ai" ? "favorite" : meta.opportunityStatus;
      meta.favoriteAt = now;
      break;
    case "unfavorite":
      meta.isFavorite = false;
      if (meta.opportunityStatus === "favorite") meta.opportunityStatus = "discovered";
      meta.favoriteAt = undefined;
      break;
    case "research":
      meta.opportunityStatus = "researching";
      patch.status = "researching";
      break;
    case "promote":
      meta.opportunityStatus = "promoting";
      meta.promotedAt = now;
      break;
    case "reject":
      meta.opportunityStatus = "rejected";
      meta.rejectedAt = now;
      meta.rejectReason = opts.reason?.trim() || "未填写原因";
      break;
    case "delete":
      meta.opportunityStatus = "deleted";
      meta.deletedAt = now;
      meta.deletedBy = opts.by ?? "local-user";
      break;
    case "restore":
      meta.opportunityStatus = "discovered";
      meta.deletedAt = undefined;
      meta.deletedBy = undefined;
      meta.rejectedAt = undefined;
      meta.rejectReason = undefined;
      break;
  }

  patch.notes = setRadarMeta(o.notes, meta);
  const updated = await repo.updateOpportunity(opportunityId, patch);
  return { opportunity: updated, ok: Boolean(updated) };
}

/** 统一收藏开关（任意来源商机）：true→收藏，false→取消 */
export async function toggleFavorite(
  opportunityId: string,
  repo: OpportunityRepository,
  opts: { by?: string } = {},
): Promise<{ ok: boolean; favorite: boolean }> {
  const o = await repo.getOpportunity(opportunityId);
  if (!o) return { ok: false, favorite: false };
  const current = o.isFavorite === true;
  const action: PoolAction = current ? "unfavorite" : "favorite";
  const res = await applyPoolAction(opportunityId, action, repo, opts);
  return { ok: res.ok, favorite: !current };
}

/** AI 推荐排序：AI 优先级评分 → 最新发现 → 用户关注（favorite/promoting 优先） */
export function sortPool(list: Opportunity[]): Opportunity[] {
  return [...list].sort((a, b) => {
    const pa = priorityScore(a);
    const pb = priorityScore(b);
    if (pb !== pa) return pb - pa;
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
    const fa = a.isFavorite || a.opportunityStatus === "promoting" ? 1 : 0;
    const fb = b.isFavorite || b.opportunityStatus === "promoting" ? 1 : 0;
    return fb - fa;
  });
}

/** AI 优先级评分（0-100）：基础评分 + 建议权重，确定性计算 */
export function priorityScore(o: Opportunity): number {
  const meta = parseRadarNotes(o.notes);
  const base = meta.score ?? 0;
  const bonus = meta.suggestion === "值得研究" ? 10 : meta.suggestion === "继续观察" ? 0 : -15;
  const userBump = o.isFavorite ? 5 : o.opportunityStatus === "promoting" ? 8 : 0;
  return Math.min(100, Math.max(0, base + bonus + userBump));
}

/** 池状态中文标签 */
export const POOL_STATUS_LABELS: Record<OpportunityPoolStatus, { label: string; cls: string }> = {
  discovered: { label: "已发现", cls: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" },
  favorite: { label: "收藏观察", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  researching: { label: "研究中", cls: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300" },
  promoting: { label: "推进中", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  rejected: { label: "已放弃", cls: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
  deleted: { label: "已删除", cls: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" },
};
