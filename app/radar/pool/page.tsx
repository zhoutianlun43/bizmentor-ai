"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card } from "@/components/ui/Card";
import { OpportunityCard } from "@/components/radar/OpportunityCard";
import { useOpportunities } from "@/lib/opportunity/hooks/use-opportunities";
import { getOpportunityRepository } from "@/lib/repository/provider";
import { applyPoolAction, sortPool } from "@/lib/radar/pool-service";
import type { PoolAction } from "@/lib/radar/pool-service";

type Tab = "all" | "favorite" | "promoting" | "rejected";

const TABS: Array<{ value: Tab; label: string }> = [
  { value: "all", label: "全部" },
  { value: "favorite", label: "收藏" },
  { value: "promoting", label: "推进中" },
  { value: "rejected", label: "已放弃" },
];

/** AI 发现机会池（V1.3）：所有 AI 自动发现机会，按 AI 优先级排序，状态管理 */
function PoolContent() {
  const router = useRouter();
  const params = useSearchParams();
  const tab = (params.get("tab") as Tab) || "all";
  const { opportunities, list } = useOpportunities();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    list();
  }, [list]);

  const all = useMemo(
    () => opportunities.filter((o) => o.source === "ai" && o.opportunityStatus !== "deleted"),
    [opportunities],
  );
  const pool = useMemo(() => {
    const filtered = tab === "all" ? all : all.filter((o) => o.opportunityStatus === tab);
    return sortPool(filtered);
  }, [all, tab]);

  async function handleAction(action: PoolAction, id: string) {
    setBusyId(id);
    setError(null);
    try {
      const repo = getOpportunityRepository();
      if (action === "reject") {
        const reason = window.prompt("放弃原因（保留供 AI 复盘）：", "");
        if (reason === null) return;
        await applyPoolAction(id, "reject", repo, { reason });
      } else if (action === "delete") {
        if (!window.confirm("确认删除？将软删除（数据库保留记录）。")) return;
        await applyPoolAction(id, "delete", repo);
      } else {
        await applyPoolAction(id, action, repo);
      }
      await list();
      if (action === "research") router.push(`/opportunities/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="px-5 pb-4">
      <AppHeader title="AI 发现机会池" subtitle="全部 AI 自动发现 · 按 AI 优先级排序" />

      <div className="mt-2 flex gap-1.5 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => router.replace(t.value === "all" ? "/radar/pool" : `/radar/pool?tab=${t.value}`)}
            className={
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors " +
              (tab === t.value ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      <div className="mt-3 space-y-3">
        {pool.map((o) => (
          <OpportunityCard key={o.id} opportunity={o} busy={busyId === o.id} onAction={handleAction} />
        ))}
        {pool.length === 0 && (
          <Card className="text-center text-sm text-slate-500 dark:text-slate-400">
            {tab === "all" ? "还没有 AI 发现的机会，去 AI 商业雷达扫描。" : "该列表暂无机会。"}
          </Card>
        )}
      </div>
    </div>
  );
}

export default function RadarPoolPage() {
  return (
    <Suspense fallback={<div className="px-5 pt-8 text-center text-xs text-slate-400">加载中…</div>}>
      <PoolContent />
    </Suspense>
  );
}
