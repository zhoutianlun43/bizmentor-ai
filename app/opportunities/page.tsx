"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useOpportunities } from "@/lib/opportunity/hooks/use-opportunities";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";
import type { Opportunity } from "@/lib/types";

/** 列表筛选项：混合了来源（AI发现/我发现的）与状态（研究中/验证中/已验证/已放弃） */
type Filter = "all" | "ai" | "user" | "discovered" | "researching" | "validating" | "validated" | "abandoned";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "ai", label: "AI雷达发现" },
  { value: "user", label: "我的想法" },
  { value: "discovered", label: "已发现" },
  { value: "researching", label: "研究中" },
  { value: "validating", label: "验证中" },
  { value: "validated", label: "已验证" },
  { value: "abandoned", label: "已放弃" },
];

function applyFilter(list: Opportunity[], filter: Filter): Opportunity[] {
  if (filter === "all") return list;
  if (filter === "ai" || filter === "user") return list.filter((o) => o.source === filter);
  return list.filter((o) => o.status === filter);
}

export default function OpportunitiesPage() {
  const { opportunities: list, loading, error } = useOpportunities();
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => applyFilter(list, filter), [list, filter]);

  return (
    <div className="px-5 pb-4">
      <AppHeader title="商机" subtitle="可能值得研究的机会" />

      {/* V0.8：双入口 —— 创建商机 + AI商业雷达 */}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Link href="/opportunities/new">
          <Button variant="primary" className="w-full">
            <Plus className="size-4" />
            创建商机
          </Button>
        </Link>
        <Link href="/radar">
          <Button variant="secondary" className="w-full">
            <Sparkles className="size-4" />
            AI商业雷达
          </Button>
        </Link>
      </div>

      {/* 筛选 */}
      <div className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              filter === f.value
                ? "bg-indigo-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 列表 */}
      {loading && list.length === 0 ? (
        <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">加载中…</p>
      ) : error ? (
        <p className="mt-6 text-center text-xs text-rose-500" role="alert">{error}</p>
      ) : filtered.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Sparkles}
            title="暂无商机"
            description="点击「新增商机」记录你发现的机会"
          />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {filtered.map((opp) => (
            <Link key={opp.id} href={`/opportunities/${opp.id}`}>
              <Card className="transition-colors hover:border-indigo-300 dark:hover:border-indigo-700">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold leading-snug text-slate-900 dark:text-white">
                    {opp.name}
                  </h3>
                  <ScoreBadge value={opp.score?.overall} />
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {opp.description}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <StatusBadge status={opp.status} />
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    {formatDate(opp.createdAt)}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
