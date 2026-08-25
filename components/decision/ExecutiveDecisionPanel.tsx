"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BusinessJudgmentView } from "./BusinessJudgmentView";
import { DecisionPanel } from "./DecisionPanel";
import type { Opportunity } from "@/lib/types";
import type { ResearchRun } from "@/lib/research";

/** 创业执行决策系统（V1.0）：基于研究结果生成执行方案 + 决策委员会 + 验证任务中心 */
export function ExecutiveDecisionPanel({ opportunity, run }: { opportunity: Opportunity; run?: ResearchRun }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const judgment = run?.report?.judgment;

  async function generate() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/judgment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId: opportunity.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "生成失败");
      // 触发页面 hook 刷新（Supabase 写入无 storage 事件，需要显式通知）
      if (typeof window !== "undefined") window.dispatchEvent(new Event("storage"));
    } catch (err) {
      setError((err as Error).message?.slice(0, 200) ?? "生成失败");
    } finally {
      setBusy(false);
    }
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
        <Button variant="secondary" size="sm" onClick={generate} disabled={busy}>
          <Sparkles className="size-3.5" />
          {busy ? "生成中…" : judgment ? "重新生成判断" : "生成 AI 商业判断"}
        </Button>
      </div>
      {error ? (
        <p className="text-xs text-rose-500" role="alert">{error}</p>
      ) : null}
      {judgment ? (
        <BusinessJudgmentView judgment={judgment} />
      ) : (
        <Card className="text-center text-sm text-slate-500 dark:text-slate-400">
          点击「生成 AI 商业判断」，基于研究结果生成 10 项执行方案。
        </Card>
      )}
      <DecisionPanel opportunity={opportunity} run={run} />
    </div>
  );
}
