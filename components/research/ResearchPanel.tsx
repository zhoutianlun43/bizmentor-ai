"use client";

import { useEffect, useState } from "react";
import { Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextArea } from "@/components/ui/FormField";
import { ResearchReportView } from "./ResearchReportView";
import { TaskTimeline } from "@/components/tasks/TaskTimeline";
import type { ResearchRun } from "@/lib/research";
import type { Opportunity } from "@/lib/types";
import type { Task } from "@/lib/tasks/types";

interface ResearchPanelProps {
  opportunity: Opportunity;
  run?: ResearchRun | undefined;
  version?: number;
}

/** 商机研究面板（V1.4）：后台 AI 任务驱动——开始→taskId→轮询→恢复 */
export function ResearchPanel({ opportunity, run, version }: ResearchPanelProps) {
  const [running, setRunning] = useState(false);
  const [task, setTask] = useState<Task | null>(null);
  const [materials, setMaterials] = useState("");
  const [error, setError] = useState("");

  // 自动恢复：进入页面时若有该商机进行中的研究任务 → 继续跟踪
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    async function resume() {
      try {
        const res = await fetch("/api/tasks", { cache: "no-store" });
        const data = await res.json();
        const t = (data.tasks ?? []).find(
          (x: Task) => x.taskType === "research" && x.projectId === opportunity.id && (x.status === "running" || x.status === "pending"),
        );
        if (!cancelled && t) {
          setTask(t);
          setRunning(true);
          poll(t.id);
        }
      } catch {
        // 忽略
      }
    }
    async function poll(id: string) {
      if (timer) clearInterval(timer);
      timer = setInterval(async () => {
        try {
          const r = await fetch(`/api/tasks/${id}`, { cache: "no-store" });
          const d = await r.json();
          if (cancelled) return;
          setTask(d.task);
          if (d.task.status === "completed" || d.task.status === "failed") {
            clearInterval(timer);
            setRunning(false);
            if (d.task.status === "completed") {
              if (typeof window !== "undefined") window.dispatchEvent(new Event("storage"));
            } else {
              setError(d.task.error ?? "研究失败");
            }
          }
        } catch {
          // 忽略
        }
      }, 2000);
    }
    resume();
    return () => { cancelled = true; if (timer) clearInterval(timer); };
  }, [opportunity.id]);

  async function handleStart() {
    if (running) return;
    setRunning(true);
    setError("");
    setTask(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "research",
          projectId: opportunity.id,
          title: `${opportunity.name} 深度研究`,
          payload: {
            opportunity: { id: opportunity.id, name: opportunity.name, description: opportunity.description, notes: opportunity.notes },
            materials: materials.trim() ? [{ id: "user-material-1", title: "用户补充资料", content: materials.trim() }] : [],
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "创建任务失败");
      const taskId = data.taskId as string;
      const timer = setInterval(async () => {
        try {
          const r = await fetch(`/api/tasks/${taskId}`, { cache: "no-store" });
          const d = await r.json();
          setTask(d.task);
          if (d.task.status === "completed" || d.task.status === "failed") {
            clearInterval(timer);
            setRunning(false);
            if (d.task.status === "completed") {
              if (typeof window !== "undefined") window.dispatchEvent(new Event("storage"));
            } else {
              setError(d.task.error ?? "研究失败");
            }
          }
        } catch {
          // 忽略
        }
      }, 2000);
    } catch (err) {
      setRunning(false);
      setError((err as Error).message?.slice(0, 200) ?? "创建任务失败");
    }
  }

  const timeline = running && task ? (
    <div className="mt-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
      <TaskTimeline task={task} />
    </div>
  ) : null;

  if (run) {
    return (
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-slate-400">商业机会研究中心</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Research v{version ?? 1}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={handleStart} disabled={running}>
            <RefreshCw className="size-3.5" />
            重新研究
          </Button>
        </div>
        {error ? <p className="mt-2 text-xs text-rose-500" role="alert">{error}</p> : null}
        <p className="mt-2 rounded-lg bg-sky-50 px-2.5 py-1.5 text-[11px] text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
          机会研究中心负责发现机会与判断机会（值不值得做），不负责项目执行（打法/获客/广告/90天计划由「创业执行决策」负责）。
        </p>
        {timeline}
        {!running && <ResearchReportView run={run} />}
      </div>
    );
  }

  return (
    <Card className="mt-3">
      <div className="flex items-center gap-2">
        <Play className="size-4 text-indigo-500" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">商机研究</h3>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        点击开始后，AI 将在后台执行研究（关闭页面也不会中断）。研究进度实时同步，完成后自动生成报告。
      </p>
      <p className="mt-1.5 rounded-lg bg-sky-50 px-2.5 py-1.5 text-[11px] text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
        机会研究中心负责发现机会与判断机会（值不值得做），不负责项目执行（打法/获客/广告/90天计划由「创业执行决策」负责）。
      </p>
      {running ? (
        timeline
      ) : (
        <>
          <TextArea
            label="补充资料（可选）"
            id="research-materials"
            placeholder="粘贴你已有的资料：行业报告、竞品信息、用户访谈记录等。"
            value={materials}
            onChange={(e) => setMaterials(e.target.value)}
            className="mt-3 min-h-20"
          />
          <Button type="button" className="mt-3 w-full" onClick={handleStart}>
            <Play className="size-4" />
            开始 AI 研究
          </Button>
        </>
      )}
      {error ? <p className="mt-3 text-xs text-rose-500" role="alert">{error}</p> : null}
    </Card>
  );
}
