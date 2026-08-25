/**
 * AI 任务时间线（V1.4）：进度 + 当前阶段 + 阶段列表 + 来源/证据计数。
 */
import { CheckCircle2, Circle, Database, FileSearch, Loader2, Search, XCircle } from "lucide-react";
import type { Task } from "@/lib/tasks/types";

export function TaskTimeline({ task }: { task: Task }) {
  const running = task.status === "running" || task.status === "pending";
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">AI 任务进度</span>
        <span className="text-[10px] text-slate-400">{task.progress}%</span>
        <span className="ml-auto text-[10px] text-slate-400">{task.status === "running" ? "后台执行中…" : task.status === "failed" ? "失败" : task.status === "completed" ? "已完成" : task.status}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div className={"h-full rounded-full transition-all " + (task.status === "failed" ? "bg-rose-500" : "bg-indigo-500")} style={{ width: task.progress + "%" }} />
      </div>
      {task.currentStageLabel && (
        <div className="flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2 dark:bg-indigo-950/40">
          <Loader2 className={"size-4 text-indigo-500 " + (running ? "animate-spin" : "")} />
          <div>
            <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300">{task.currentStageLabel}</p>
            {task.currentStage ? <p className="text-[10px] text-indigo-500/80">阶段：{task.currentStage}</p> : null}
          </div>
        </div>
      )}
      {task.stages.length > 0 && (
        <ol className="space-y-1.5">
          {task.stages.map((s, i) => (
            <li key={i} className="flex items-center gap-2 text-xs">
              {s.status === "completed" ? <CheckCircle2 className="size-4 text-emerald-500" /> : s.status === "failed" ? <XCircle className="size-4 text-rose-500" /> : s.status === "running" ? <Loader2 className="size-4 animate-spin text-indigo-500" /> : <Circle className="size-4 text-slate-300 dark:text-slate-600" />}
              <span className="text-slate-700 dark:text-slate-200">{s.label ?? s.stage}</span>
              <span className="ml-auto flex items-center gap-1 text-[10px] text-slate-400">
                {s.searched ? <span className="inline-flex items-center gap-0.5"><Search className="size-3" />{s.searched}</span> : null}
                {s.sourcesFound ? <span className="inline-flex items-center gap-0.5"><Database className="size-3" />{s.sourcesFound}</span> : null}
                {s.evidenceFound ? <span className="inline-flex items-center gap-0.5"><FileSearch className="size-3" />{s.evidenceFound}</span> : null}
                <span>{s.status === "completed" ? "完成" : s.status === "failed" ? "失败" : s.status === "running" ? "进行中" : ""}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
      {task.error ? <p className="text-xs text-rose-500">失败原因：{task.error}</p> : null}
    </div>
  );
}
