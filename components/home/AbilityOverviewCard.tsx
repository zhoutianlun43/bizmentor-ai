import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { ABILITY_LABELS } from "@/lib/constants";
import type { AbilityKey, AbilityScores } from "@/lib/types";

/** 首页展示的 6 项核心能力（与首页示例一致） */
const HOME_ABILITY_KEYS: AbilityKey[] = [
  "opportunityDiscovery",
  "userResearch",
  "competitorAnalysis",
  "businessModel",
  "financialAnalysis",
  "validation",
];

/** 首页·区域四：商业能力概览 */
export function AbilityOverviewCard({ abilities }: { abilities: AbilityScores }) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">商业能力</p>
        <Link
          href="/profile"
          className="inline-flex items-center gap-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400"
        >
          查看全部
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {HOME_ABILITY_KEYS.map((key) => (
          <ScoreBar key={key} label={ABILITY_LABELS[key]} value={abilities[key]} max={100} />
        ))}
      </div>
    </Card>
  );
}