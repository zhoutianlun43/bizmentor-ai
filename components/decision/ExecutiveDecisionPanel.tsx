"use client";

import { useState } from "react";
import { ClipboardList, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { OperationPlanView } from "./OperationPlanView";
import { BusinessJudgmentView } from "./BusinessJudgmentView";
import { TaskTimeline } from "@/components/tasks/TaskTimeline";
import type { Task } from "@/lib/tasks/types";
import { DecisionPanel } from "./DecisionPanel";
import type { Opportunity } from "@/lib/types";
import type { ResearchRun } from "@/lib/research";

/** 创业执行决策系统（V1.0）：基于研究结果生成执行方案 + 决策委员会 + 验证任务中心 */
export function ExecutiveDecisionPanel({ opportunity, run }: { opportunity: Opportunity; run?: ResearchRun }) {
  const [busy, setBusy] = useState(false);
  const [opBusy, setOpBusy] = useState(false);
  const [judgmentTask, setJudgmentTask] = useState<Task | null>(null);
  const [opTask, setOpTask] = useState<Task | null>(null);
  const [error, setError] = useState("");
  const [opError, setOpError] = useState("");
  const judgment = run?.report?.judgment;
  const operationPlan = run?.report?.operationPlan;

  function startTask(type: string, title: string, setTask: (t: Task | null) => void, setRun: (v: boolean) => void, setErr: (e: string) => void) {
    setRun(true);
    setErr("");
    setTask(null);
    fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, projectId: opportunity.id, title, payload: { opportunityId: opportunity.id } }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.taskId) throw new Error(data.error ?? "创建任务失败");
        const taskId = data.taskId as string;
        const timer = setInterval(async () => {
          try {
            const r = await fetch(`/api/tasks/${taskId}`, { cache: "no-store" });
            const d = await r.json();
            setTask(d.task);
            if (d.task.status === "completed" || d.task.status === "failed") {
              clearInterval(timer);
              setRun(false);
              if (d.task.status === "completed") {
                if (typeof window !== "undefined") window.dispatchEvent(new Event("storage"));
              } else {
                setErr(d.task.error ?? "生成失败");
              }
            }
          } catch {
            // 忽略
          }
        }, 2000);
      })
      .catch((err) => {
        setRun(false);
        setErr((err as Error).message?.slice(0, 200) ?? "创建任务失败");
      });
  }

  function generate() {
    startTask("judgment", `${opportunity.name} AI 商业判断`, setJudgmentTask, setBusy, setError);
  }

  function generateOperation() {
    startTask("operation_plan", `${opportunity.name} 商业操盘手报告`, setOpTask, setOpBusy, setOpError);
  }

  if (!run?.report) {
    return (
      <Card className="mt-3 text-center text-sm text-slate-500 dark:text-slate-400">
        请先在「机会研究中心」完成 AI 研究，再生成商业执行判断。
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-slate-400">创业执行决策系统</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            Decision {judgment ? `v${judgment.version ?? 1}` : "—"}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={generateOperation} disabled={opBusy}>
          <ClipboardList className="size-3.5" />
          {opBusy ? "生成中…" : operationPlan ? "重新生成操盘报告" : "生成商业操盘报告"}
        </Button>
        <Button variant="secondary" size="sm" onClick={generate} disabled={busy}>
          <Sparkles className="size-3.5" />
          {busy ? "生成中…" : judgment ? "重新生成判断" : "生成 AI 商业判断"}
        </Button>
      </div>
      {error ? (
        <p className="text-xs text-rose-500" role="alert">{error}</p>
      ) : null}
      {opError ? (
        <p className="text-xs text-rose-500" role="alert">{opError}</p>
      ) : null}
      {busy && judgmentTask ? <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"><TaskTimeline task={judgmentTask} /></div> : null}
      {opBusy && opTask ? <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"><TaskTimeline task={opTask} /></div> : null}
      {operationPlan ? (
        <OperationPlanView plan={operationPlan} />
      ) : judgment ? (
        <BusinessJudgmentView judgment={judgment} />
      ) : (
        <Card className="text-center text-sm text-slate-500 dark:text-slate-400">
          点击「生成商业操盘报告」得到真实落地决策（市场验证/产品矩阵/竞品/供应链/定价/获客/内容/广告/90天/投资判断）。
        </Card>
      )}
      <DecisionPanel opportunity={opportunity} run={run} />
    </div>
  );
}
