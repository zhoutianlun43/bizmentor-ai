"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { ResearchPanel } from "@/components/research/ResearchPanel";
import { DecisionPanel } from "@/components/decision/DecisionPanel";
import { useResearchRuns } from "@/lib/research/hooks/use-research-runs";
import { Card } from "@/components/ui/Card";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { OPPORTUNITY_SOURCE_LABELS } from "@/lib/constants";
import { useOpportunities } from "@/lib/opportunity/hooks/use-opportunities";
import { formatDate } from "@/lib/utils/format";

/** 商机详情 / 完整报告占位（V0.1 展示本地数据，AI 报告由未来 Agent 生成） */
export default function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const idStr = String(id);

  const { opportunities, loading } = useOpportunities();
  const opportunity = opportunities.find((o) => o.id === idStr);

  // 商机研究运行（V0.4.1）：异步 hook 读取
  const { runs } = useResearchRuns();
  const researchRun = runs.find((r) => r.opportunityId === idStr);

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

      {/* 商机研究（V0.3-A）：结构化研究报告 */}
      <ResearchPanel opportunity={opportunity} run={researchRun} />

      {/* 商业决策与验证闭环（V0.3-C） */}
      <DecisionPanel opportunity={opportunity} run={researchRun} />
    </div>
  );
}
