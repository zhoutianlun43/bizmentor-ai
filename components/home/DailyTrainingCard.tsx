import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { TRAINING_CATEGORY_LABELS } from "@/lib/constants";
import type { TrainingQuestion } from "@/lib/types";

/** 首页·区域二：今日商业训练 */
export function DailyTrainingCard({ question }: { question: TrainingQuestion }) {
  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">今日商业训练</p>
        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
          {TRAINING_CATEGORY_LABELS[question.category]}
        </span>
      </div>
      <h3 className="text-base font-semibold leading-snug text-slate-900 dark:text-white">
        {question.title}
      </h3>
      <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
        {question.prompt}
      </p>
      <Link
        href={`/training/${question.id}`}
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400"
      >
        开始训练
        <ArrowRight className="size-4" />
      </Link>
    </Card>
  );
}