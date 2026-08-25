"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card } from "@/components/ui/Card";
import { BackButton } from "@/components/common/BackButton";
import { TaskTimeline } from "@/components/tasks/TaskTimeline";
import type { Task } from "@/lib/tasks/types";

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending: { label: "等待中", cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  running: { label: "进行中", cls: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300" },
  paused: { label: "已暂停", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  completed: { label: "已完成", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  failed: { label: "失败", cls: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
  cancelled: { label: "已取消", cls: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" },
};

const TYPE_LABEL: Record<string, string> = {
  research: "深度研究",
  judgment: "AI商业判断",
  operation_plan: "商业操盘报告",
  radar_scan: "AI雷达扫描",
};

/** AI 任务中心（V1.4）：全部后台任务（进行中/已完成/失败），含进度与失败原因 */
export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/tasks", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) setTasks(data.tasks ?? []);
      } catch {
        // 忽略
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const timer = setInterval(load, 3000);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  const groups = [
    { key: "running", label: "进行中", list: tasks.filter((t) => t.status === "running" || t.status === "pending" || t.status === "paused") },
    { key: "done", label: "已完成", list: tasks.filter((t) => t.status === "completed") },
    { key: "failed", label: "失败", list: tasks.filter((t) => t.status === "failed" || t.status === "cancelled") },
  ];

  return (
    <div className="px-5 pb-4">
      <BackButton href="/" label="返回首页" />
      <AppHeader title="AI 任务中心" subtitle="所有后台 AI 任务 · 关闭页面也继续运行" />

      {loading && <p className="mt-3 text-xs text-slate-400">加载中…</p>}

      {groups.map((g) =>
        g.list.length > 0 ? (
          <div key={g.key} className="mt-4">
            <p className="text-xs font-medium text-slate-400">{g.label}（{g.list.length}）</p>
            <div className="mt-1 space-y-3">
              {g.list.map((t) => (
                <Card key={t.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{t.title}</p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">{TYPE_LABEL[t.taskType] ?? t.taskType}</span>
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUS_LABEL[t.status]?.cls ?? ""}`}>{STATUS_LABEL[t.status]?.label ?? t.status}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400">{t.updatedAt.slice(5, 16)}</span>
                  </div>
                  {(t.status === "running" || t.status === "pending") ? <TaskTimeline task={t} /> : null}
                  {t.status === "failed" && t.error ? (
                    <p className="mt-2 text-xs text-rose-500">失败原因：{t.error}{t.checkpoint ? `（已完成 ${t.checkpoint.completedStages} 阶段，失败于 ${t.checkpoint.failedStage ?? "未知"}）` : ""}</p>
                  ) : null}
                  {t.status === "completed" && t.result?.runId ? (
                    <Link href={`/opportunities/${t.projectId}`} className="mt-2 inline-block text-[11px] text-indigo-500 underline">查看结果 →</Link>
                  ) : null}
                </Card>
              ))}
            </div>
          </div>
        ) : null,
      )}
      {!loading && tasks.length === 0 && <Card className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">暂无任务。</Card>}
    </div>
  );
}
