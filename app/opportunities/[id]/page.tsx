"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, FlaskConical, Landmark } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { ResearchPanel } from "@/components/research/ResearchPanel";
import { ExecutiveDecisionPanel } from "@/components/decision/ExecutiveDecisionPanel";
import { useResearchRuns } from "@/lib/research/hooks/use-research-runs";
import { Card } from "@/components/ui/Card";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { OPPORTUNITY_SOURCE_LABELS } from "@/lib/constants";
import { useOpportunities } from "@/lib/opportunity/hooks/use-opportunities";
import { formatDate } from "@/lib/utils/format";

type Tab = "research" | "decision";

/** 商机详情（V1.0：机会研究中心 / 创业执行决策 双 Tab） */
export default function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const idStr = String(id);
  const [tab, setTab] = useState<Tab>("research");

  const { opportunities, loading, update } = useOpportunities();
  const opportunity = opportunities.find((o) => o.id === idStr);

  // 商机研究运行（V0.4.1）：异步 hook 读取
  const { runs } = useResearchRuns();
  const researchRun = runs.find((r) => r.opportunityId === idStr);
  // Research Version（V1.0）：按创建时间排序的第几个研究
  const sameRuns = runs
    .filter((r) => r.opportunityId === idStr)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const researchVersion = researchRun ? sameRuns.findIndex((r) => r.runId === researchRun.runId) + 1 : 0;
  const decisionVersion = researchRun?.report?.judgment?.version ?? null;

  // V1.2.1：已发现（discovered）机会一旦开始研究 → 自动流转为「研究中」
  useEffect(() => {
    if (opportunity && opportunity.status === "discovered" && researchRun && !loading) {
      update(opportunity.id, { status: "researching" });
    }
  }, [opportunity, researchRun, loading, update]);

  if (loading) {
    return (
      <div className="px-5 pb-4">
        <AppHeader title="商机详情" />
        <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">加载中…</p>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="px-5 pb-4">
        <AppHeader title="商机详情" />
        <Card className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
          未找到该商机。
          <Link href="/opportunities" className="mt-2 block text-indigo-600 dark:text-indigo-400">
            ← 返回商机列表
          </Link>
        </Card>
      </div>
    );
  }

  const score = opportunity.score;

  return (
    <div className="px-5 pb-4">
      <Link
        href="/opportunities"
        className="mb-1 inline-flex items-center gap-1 pt-3 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="size-4" />
        返回商机
      </Link>

      <div className="mt-1 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold leading-snug text-slate-900 dark:text-white">
          {opportunity.name}
        </h2>
        <ScoreBadge value={score?.overall} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <StatusBadge status={opportunity.status} />
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {OPPORTUNITY_SOURCE_LABELS[opportunity.source]}
        </span>
        <span className="text-[11px] text-slate-400 dark:text-slate-500">
          创建于 {formatDate(opportunity.createdAt)}
        </span>
      </div>

      <Card className="mt-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">一句话描述</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {opportunity.description}
        </p>
        {opportunity.notes ? (
          <>
            <h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">备注</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {opportunity.notes}
            </p>
          </>
        ) : null}
      </Card>

      <Card className="mt-3">
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">机会评分</h3>
        {score ? (
          <div className="space-y-2.5">
            <ScoreBar label="需求" value={score.demand} />
            <ScoreBar label="竞争" value={score.competition} invert />
            <ScoreBar label="付费" value={score.willingnessToPay} />
            <ScoreBar label="壁垒" value={score.moat} />
            <ScoreBar label="风险" value={score.risk} invert />
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            暂无评分。该商机进入「研究中」后，AI 将自动生成评分。
          </p>
        )}
      </Card>

      {/* V1.0：双 Tab —— 机会研究中心 / 创业执行决策 */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setTab("research")}
          className={
            "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors " +
            (tab === "research"
              ? "border-indigo-500 bg-indigo-600 text-white"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300")
          }
        >
          <FlaskConical className="size-4" />
          机会研究中心
          {researchVersion > 0 ? <span className="text-[10px] opacity-80">v{researchVersion}</span> : null}
        </button>
        <button
          type="button"
          onClick={() => setTab("decision")}
          className={
            "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors " +
            (tab === "decision"
              ? "border-indigo-500 bg-indigo-600 text-white"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300")
          }
        >
          <Landmark className="size-4" />
          创业执行决策
          {decisionVersion ? <span className="text-[10px] opacity-80">v{decisionVersion}</span> : null}
        </button>
      </div>

      <div className="mt-3">
        {tab === "research" ? (
          <ResearchPanel opportunity={opportunity} run={researchRun} version={researchVersion || undefined} />
        ) : (
          <ExecutiveDecisionPanel opportunity={opportunity} run={researchRun} />
        )}
      </div>
    </div>
  );
}
