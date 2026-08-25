"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, Clock, Radar, RefreshCw, Rocket, Target } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { OpportunityCard } from "@/components/radar/OpportunityCard";
import { TaskTimeline } from "@/components/tasks/TaskTimeline";
import { useOpportunities } from "@/lib/opportunity/hooks/use-opportunities";
import { getOpportunityRepository } from "@/lib/repository/provider";
import { buildScanHistory } from "@/lib/radar/service";
import { applyPoolAction } from "@/lib/radar/pool-service";
import type { PoolAction } from "@/lib/radar/pool-service";
import type { Task } from "@/lib/tasks/types";

/** AI 商业雷达（V1.3）：机会资产库首页——统计卡可点击 + 扫描 + 机会池管理入口 */
export default function RadarPage() {
  const router = useRouter();
  const { opportunities, list } = useOpportunities();
  const [busyScan, setBusyScan] = useState(false);
  const [scanTask, setScanTask] = useState<Task | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState("");

  useEffect(() => {
    list();
  }, [list]);

  const aiList = useMemo(() => opportunities.filter((o) => o.source === "ai" && o.opportunityStatus !== "deleted"), [opportunities]);
  const totalAI = aiList.length;
  const favoriteCount = aiList.filter((o) => o.opportunityStatus === "favorite").length;
  const promotingCount = aiList.filter((o) => o.opportunityStatus === "promoting").length;
  const scanHistory = useMemo(() => buildScanHistory(aiList), [aiList]);
  const latest = scanHistory[0];
  const latestItems = useMemo(() => (latest ? aiList.filter((o) => o.scanId === latest.scanId) : []), [aiList, latest]);

  async function scan() {
    if (busyScan) return;
    setBusyScan(true);
    setError(null);
    setScanTask(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "radar_scan", title: "AI 商业雷达全球扫描" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "创建任务失败");
      const taskId = data.taskId as string;
      const timer = setInterval(async () => {
        try {
          const r = await fetch(`/api/tasks/${taskId}`, { cache: "no-store" });
          const d = await r.json();
          setScanTask(d.task);
          if (d.task.status === "completed" || d.task.status === "failed") {
            clearInterval(timer);
            setBusyScan(false);
            if (d.task.status === "completed") {
              setSummary(`扫描完成：发现 ${d.task.result?.savedCount ?? 0} 个商业机会（已保存）`);
              await list();
            } else {
              setError(d.task.error ?? "扫描失败");
            }
          }
        } catch {
          // 忽略
        }
      }, 2000);
    } catch (e) {
      setBusyScan(false);
      setError(e instanceof Error ? e.message : "创建任务失败");
    }
  }

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

  const statCards = [
    { label: "本次扫描发现", value: latestItems.length, href: "/radar/latest", icon: <Radar className="size-4 text-indigo-500" /> },
    { label: "AI累计发现机会", value: totalAI, href: "/radar/pool", icon: <Target className="size-4 text-emerald-500" /> },
    { label: "我的收藏", value: favoriteCount, href: "/opportunities/favorites", icon: <Bookmark className="size-4 text-amber-500" /> },
    { label: "推进项目", value: promotingCount, href: "/radar/pool?tab=promoting", icon: <Rocket className="size-4 text-sky-500" /> },
  ];

  return (
    <div className="px-5 pb-4">
      <AppHeader title="AI 商业雷达" subtitle="AI 持续发现商业机会资产库" />

      <Button onClick={scan} disabled={busyScan} className="mt-2 w-full">
        <RefreshCw className="size-4" />
        {busyScan ? "后台扫描中…" : "重新扫描全球商业机会"}
      </Button>
      {busyScan && scanTask ? (
        <div className="mt-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"><TaskTimeline task={scanTask} /></div>
      ) : null}

      {/* 统计卡（可点击） */}
      <div className="mt-2 grid grid-cols-2 gap-2">
        {statCards.map((c) => (
          <Link key={c.label} href={c.href}>
            <Card className="cursor-pointer py-2 text-center transition-colors hover:border-indigo-300">
              <div className="flex items-center justify-center gap-1 text-slate-400">{c.icon}</div>
              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{c.value}</p>
              <p className="text-[10px] text-slate-400">{c.label}</p>
            </Card>
          </Link>
        ))}
      </div>

      {summary && <p className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">{summary}</p>}
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      {/* 扫描历史 */}
      {scanHistory.length > 0 && (
        <details className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
          <summary className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Clock className="size-3.5" />
            扫描历史（{scanHistory.length} 次 · 全部已保存）
          </summary>
          <ul className="mt-2 space-y-1">
            {scanHistory.map((h) => (
              <li key={h.scanId} className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>{h.scannedAt.slice(0, 10)} · 全球商业机会扫描</span>
                <span>发现 {h.found} · 进入研究 {h.researched}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* 最近扫描结果（机会池卡片） */}
      <div className="mt-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-slate-400">最近扫描结果</p>
          {latestItems.length > 0 && <Link href="/radar/latest" className="text-[11px] text-indigo-500">查看全部本次结果 →</Link>}
        </div>
        {latestItems.map((o) => (
          <OpportunityCard key={o.id} opportunity={o} busy={busyId === o.id} onAction={handleAction} />
        ))}
        {latestItems.length === 0 && !busyScan && (
          <Card className="text-center">
            <p className="text-sm text-slate-500">点击上方按钮，AI 将扫描全球市场机会并自动保存到机会池。</p>
          </Card>
        )}
      </div>
    </div>
  );
}
