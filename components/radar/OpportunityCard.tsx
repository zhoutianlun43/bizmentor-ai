/**
 * AI 发现机会卡（V1.3；V1.x 统一操作）：机会池卡片 + 状态徽章 + 统一动作。
 */
import { Card } from "@/components/ui/Card";
import { OpportunityActions } from "@/components/common/OpportunityActions";
import { parseRadarNotes } from "@/lib/radar/service";
import { POOL_STATUS_LABELS, priorityScore } from "@/lib/radar/pool-service";
import type { Opportunity } from "@/lib/types";
import type { PoolAction } from "@/lib/radar/pool-service";

const SUGGESTION_STYLE: Record<string, string> = {
  值得研究: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  继续观察: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  不建议进入: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

interface Props {
  opportunity: Opportunity;
  busy?: boolean;
  onAction?: (action: PoolAction, id: string) => void;
}

/** 机会卡：名称/描述/评分/市场方向/扫描批次/状态 + 统一操作 */
export function OpportunityCard({ opportunity, busy, onAction }: Props) {
  const meta = parseRadarNotes(opportunity.notes);
  const status = opportunity.opportunityStatus ?? "discovered";
  const st = POOL_STATUS_LABELS[status] ?? POOL_STATUS_LABELS.discovered;
  const priority = priorityScore(opportunity);

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{opportunity.name}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">{meta.category ?? "未分类"}</span>
            <span className={`rounded px-1.5 py-0.5 text-[10px] ${SUGGESTION_STYLE[meta.suggestion ?? ""] ?? ""}`}>{meta.suggestion ?? "—"}</span>
            <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">AI优先级 {priority}</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{meta.score ?? "—"}</p>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${st.cls}`}>{st.label}</span>
        </div>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{opportunity.description}</p>

      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-400 dark:text-slate-500">
        <span>来源：AI商业雷达</span>
        <span>发现于 {opportunity.createdAt.slice(0, 10)}</span>
        {meta.scanId ? <span>批次：{meta.scanId.slice(0, 8)}</span> : null}
        {opportunity.isFavorite ? <span className="text-amber-500">⭐ 已收藏</span> : null}
        {status === "rejected" && meta.rejectReason ? <span className="text-rose-500">放弃原因：{meta.rejectReason}</span> : null}
      </div>

      <OpportunityActions opportunity={opportunity} busy={busy} onAction={onAction} />
    </Card>
  );
}
