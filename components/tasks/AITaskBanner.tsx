/**
 * 全局 AI 工作状态横幅（V1.4）：轮询进行中任务，页面顶部显示「AI 正在…」。
 */
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Cpu } from "lucide-react";
import type { Task } from "@/lib/tasks/types";

export function AITaskBanner() {
  const [running, setRunning] = useState<Task | null>(null);
  const [hide, setHide] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/tasks", { cache: "no-store" });
        const data = await res.json();
        const t = (data.tasks ?? []).find((x: Task) => x.status === "running" || x.status === "pending");
        if (!cancelled) setRunning(t ?? null);
      } catch {
        // 忽略
      }
    }
    poll();
    const timer = setInterval(poll, 3000);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  if (!running || hide) return null;
  return (
    <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-indigo-200 bg-indigo-50 px-4 py-2 dark:border-indigo-900 dark:bg-indigo-950/60">
      <Cpu className="size-4 shrink-0 animate-pulse text-indigo-600 dark:text-indigo-300" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-indigo-700 dark:text-indigo-300">{running.title}</p>
        <p className="text-[10px] text-indigo-500/80">{running.currentStageLabel ?? "处理中"} · {running.progress}%</p>
      </div>
      <Link href="/tasks" className="shrink-0 text-[11px] text-indigo-500 underline">查看</Link>
      <button onClick={() => setHide(true)} className="shrink-0 text-[11px] text-indigo-400">✕</button>
    </div>
  );
}
