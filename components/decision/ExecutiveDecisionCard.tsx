/**
 * Executive Decision Card（V0.9）：决策型报告首页卡片。
 * 展示：机会评分 / 一句话判断 / 最大机会 / 最大风险 / 建议动作。
 * 无 AI 商业判断时：用评分 + 投资论点降级展示，并提示生成。
 */
import { ArrowRight, ShieldAlert, Sparkles, Target, TrendingUp } from "lucide-react";
import type { BusinessJudgment, InvestmentThesis } from "@/lib/research";
import { formatScore } from "@/lib/utils/format";

const RECOMMENDATION_STYLE: Record<string, string> = {
  recommend_enter: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  conditional_enter: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  continue_observe: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  not_recommend: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

const RECOMMENDATION_LABEL: Record<string, string> = {
  recommend_enter: "建议进入",
  conditional_enter: "条件进入",
  continue_observe: "继续观察",
  not_recommend: "不建议进入",
};

interface Props {
  judgment?: BusinessJudgment;
  score: number;
  confidence: number;
  thesis?: InvestmentThesis;
  opportunityName: string;
}

export function ExecutiveDecisionCard({ judgment, score, confidence, thesis, opportunityName }: Props) {
  const oneLine = judgment?.oneLineJudgment ?? thesis?.coreHypothesis ?? "";
  const biggestOpportunity = judgment?.biggestOpportunity ?? thesis?.expectedUpside ?? "";
  const biggestRisk = judgment?.biggestRisk ?? (thesis?.invalidators ?? []).join("；");
  const suggestedAction = judgment?.suggestedAction ?? thesis?.decisionGate ?? "";
  const hasJudgment = Boolean(judgment);

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-4 dark:border-indigo-800 dark:from-indigo-950/40 dark:via-slate-900 dark:to-violet-950/40">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="size-4 text-indigo-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Executive Decision</h3>
        </div>
        {judgment ? (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${RECOMMENDATION_STYLE[judgment.recommendation]}`}>
            {RECOMMENDATION_LABEL[judgment.recommendation]}
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            待生成
          </span>
        )}
      </div>

      <div className="mt-3 flex items-end gap-2">
        <span className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">{formatScore(score)}</span>
        <span className="pb-1 text-sm text-slate-400 dark:text-slate-500">/ 10</span>
        <span className="pb-1 ml-auto text-xs text-slate-400 dark:text-slate-500">置信度 {Math.round(confidence * 100)}%</span>
      </div>

      <div className="mt-3 rounded-xl bg-white/80 px-3 py-2.5 dark:bg-slate-900/60">
        <p className="text-[10px] font-medium text-slate-400">一句话判断 · {opportunityName}</p>
        <p className="mt-0.5 text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-100">
          {oneLine || "AI 商业判断尚未生成，点击「生成 AI 商业判断」后展示一句话结论。"}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950/30">
          <TrendingUp className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300">最大机会</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300">{biggestOpportunity || "—"}</p>
          </div>
        </div>
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50/60 px-3 py-2 dark:border-rose-900 dark:bg-rose-950/30">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-rose-500 dark:text-rose-400" />
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-rose-700 dark:text-rose-300">最大风险</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300">{biggestRisk || "—"}</p>
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-start gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-white dark:bg-indigo-500">
        <Target className="mt-0.5 size-4 shrink-0" />
        <div className="min-w-0">
          <p className="text-[10px] font-medium text-indigo-100">建议动作</p>
          <p className="mt-0.5 flex items-start gap-1 text-xs leading-relaxed">
            {suggestedAction || "生成 AI 商业判断后展示。"}
            {hasJudgment ? <ArrowRight className="mt-0.5 size-3 shrink-0" /> : null}
          </p>
        </div>
      </div>
    </div>
  );
}
