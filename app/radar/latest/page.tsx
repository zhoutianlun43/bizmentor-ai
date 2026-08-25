"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card } from "@/components/ui/Card";
import { OpportunityCard } from "@/components/radar/OpportunityCard";
import { useOpportunities } from "@/lib/opportunity/hooks/use-opportunities";
import { getOpportunityRepository } from "@/lib/repository/provider";
import { buildScanHistory } from "@/lib/radar/service";
import { applyPoolAction } from "@/lib/radar/pool-service";
import type { PoolAction } from "@/lib/radar/pool-service";

/** 本次扫描结果（V1.3）：最近一次扫描生成的全部机会 */
export default function RadarLatestPage() {
  const router = useRouter();
  const { opportunities, list } = useOpportunities();

  useEffect(() => {
    list();
  }, [list]);

  const aiList = useMemo(() => opportunities.filter((o) => o.source === "ai" && o.opportunityStatus !== "deleted"), [opportunities]);
  const latest = useMemo(() => buildScanHistory(aiList)[0], [aiList]);
  const items = useMemo(() => (latest ? aiList.filter((o) => o.scanId === latest.scanId) : []), [aiList, latest]);

  async function handleAction(action: PoolAction, id: string) {
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
  }

  return (
    <div className="px-5 pb-4">
      <AppHeader title="本次扫描结果" subtitle={latest ? `${latest.scannedAt.slice(0, 10)} · 发现 ${latest.found} 个机会` : "暂无扫描"} />
      <div className="mt-3 space-y-3">
        {items.map((o) => <OpportunityCard key={o.id} opportunity={o} onAction={handleAction} />)}
        {items.length === 0 && <Card className="text-center text-sm text-slate-500 dark:text-slate-400">暂无本次扫描结果。</Card>}
      </div>
    </div>
  );
}
