"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { BackButton } from "@/components/common/BackButton";
import { Card } from "@/components/ui/Card";
import { OpportunityActions } from "@/components/common/OpportunityActions";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useOpportunities } from "@/lib/opportunity/hooks/use-opportunities";
import { getOpportunityRepository } from "@/lib/repository/provider";
import { applyPoolAction } from "@/lib/radar/pool-service";
import { formatDate } from "@/lib/utils/format";
import type { PoolAction } from "@/lib/radar/pool-service";

/** 我的收藏（V1.x）：所有来源商机 isFavorite=true，支持取消收藏/开始研究/进入执行决策 */
export default function FavoritesPage() {
  const router = useRouter();
  const { opportunities, list } = useOpportunities();
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    list();
  }, [list]);

  const favorites = useMemo(
    () => opportunities.filter((o) => o.isFavorite === true && o.opportunityStatus !== "deleted" && !o.deletedAt),
    [opportunities],
  );

  async function handleAction(action: PoolAction, id: string) {
    setBusyId(id);
    try {
      await applyPoolAction(id, action, getOpportunityRepository());
      await list();
      if (action === "research") router.push(`/opportunities/${id}?from=favorites`);
    } catch {
      // 忽略
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="px-5 pb-4">
      <BackButton href="/opportunities" label="返回商机" />
      <AppHeader title="我的收藏" subtitle="所有收藏的商业机会" />

      <div className="mt-2 space-y-3">
        {favorites.map((o) => (
          <Card key={o.id}>
            <Link href={`/opportunities/${o.id}?from=favorites`}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{o.name}</h3>
                <Bookmark className="size-4 shrink-0 text-amber-500" />
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{o.description}</p>
            </Link>
            <div className="mt-2 flex items-center gap-2">
              <StatusBadge status={o.status} />
              <span className="text-[11px] text-slate-400">{o.source === "ai" ? "AI发现" : "我的想法"} · {formatDate(o.createdAt)}</span>
            </div>
            <OpportunityActions opportunity={o} busy={busyId === o.id} onAction={handleAction} />
          </Card>
        ))}
        {favorites.length === 0 && (
          <Card className="text-center text-sm text-slate-500 dark:text-slate-400">还没有收藏的商机，点击商机卡片的 ⭐ 收藏。</Card>
        )}
      </div>
    </div>
  );
}
