import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { ScoreBar } from "@/components/ui/ScoreBar";
import type { Opportunity } from "@/lib/types";

/** 首页·区域一：今日最值得研究的商业机会 */
export function DailyOpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  const score = opportunity.score;
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          今日最值得研究的商业机会
        </p>
        <ScoreBadge value={score?.overall} />
      </div>

      <h3 className="text-lg font-bold leading-snug text-slate-900 dark:text-white">
        {opportunity.name}
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
        {opportunity.description}
      </p>

      {score ? (
        <div className="mt-4 space-y-2.5">
          <ScoreBar label="需求" value={score.demand} />
          <ScoreBar label="竞争" value={score.competition} invert />
          <ScoreBar label="付费" value={score.willingnessToPay} />
          <ScoreBar label="壁垒" value={score.moat} />
          <ScoreBar label="风险" value={score.risk} invert />
        </div>
      ) : (
        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
          该商机暂未评分，未来将由 AI 研究后自动生成评分与报告。
        </p>
      )}

      <Link
        href={`/opportunities/${opportunity.id}`}
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400"
      >
        查看完整报告
        <ArrowRight className="size-4" />
      </Link>
    </Card>
  );
}