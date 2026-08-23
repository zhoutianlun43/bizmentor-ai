import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card } from "@/components/ui/Card";
import {
  TRAINING_CATEGORIES,
  TRAINING_CATEGORY_LABELS,
} from "@/lib/constants";
import { mockTrainingQuestions } from "@/lib/data/mock/training";

/**
 * 商业训练首页。
 * 6 大分类 + mock 题目；点击进入题目页面。
 */
export default function TrainingPage() {
  return (
    <div className="px-5 pb-4">
      <AppHeader title="商业训练" subtitle="用商业问题训练你的商业思维" />

      <div className="mt-2 space-y-5">
        {TRAINING_CATEGORIES.map((category) => {
          const questions = mockTrainingQuestions.filter(
            (q) => q.category === category,
          );
          if (questions.length === 0) return null;
          return (
            <section key={category}>
              <h2 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
                {TRAINING_CATEGORY_LABELS[category]}
              </h2>
              <div className="space-y-2">
                {questions.map((q) => (
                  <Link key={q.id} href={`/training/${q.id}`} className="block">
                    <Card className="flex items-center justify-between gap-3 transition-colors hover:border-indigo-300 dark:hover:border-indigo-700">
                      <div className="min-w-0">
                        <h3 className="text-sm font-medium text-slate-900 dark:text-white">
                          {q.title}
                        </h3>
                        <p className="mt-0.5 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                          {q.description}
                        </p>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-slate-300 dark:text-slate-600" />
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
        V0.1 提交答案后进入「等待 AI 评分」，评分由未来的 AI Examiner Agent 完成。
      </p>
    </div>
  );
}