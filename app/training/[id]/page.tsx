"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Clock3 } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextArea } from "@/components/ui/FormField";
import { TRAINING_CATEGORY_LABELS } from "@/lib/constants";
import { mockTrainingQuestions } from "@/lib/data/mock/training";
import {
  addSubmission,
  loadSubmissionsByQuestion,
} from "@/lib/store/training-store";
import { formatDate } from "@/lib/utils/format";
import type { AnswerSubmission, TrainingQuestion } from "@/lib/types";

/**
 * 训练题目页。
 * 用户输入答案并提交；V0.1 不调用 AI，提交后显示「等待 AI 评分」。
 * 为未来 AI Examiner Agent 预留接口（见 lib/store/training-store.ts）。
 */
export default function TrainingQuestionPage() {
  const { id } = useParams<{ id: string }>();
  const question: TrainingQuestion | undefined = mockTrainingQuestions.find(
    (q) => q.id === String(id),
  );

  const [answer, setAnswer] = useState("");
  const [submissions, setSubmissions] = useState<AnswerSubmission[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (question) setSubmissions(loadSubmissionsByQuestion(question.id));
  }, [question]);

  if (!question) {
    return (
      <div className="px-5 pb-4">
        <AppHeader title="商业训练" />
        <Card className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
          未找到该题目。
          <Link href="/training" className="mt-2 block text-indigo-600 dark:text-indigo-400">
            ← 返回训练首页
          </Link>
        </Card>
      </div>
    );
  }

  function handleSubmit() {
    if (!answer.trim()) return;
    setSubmitting(true);
    // 模拟提交延迟，保持交互反馈；真实场景为调用 AI Examiner Agent
    setTimeout(() => {
      addSubmission(question!.id, answer);
      setSubmissions(loadSubmissionsByQuestion(question!.id));
      setAnswer("");
      setSubmitting(false);
    }, 300);
  }

  const latest = submissions[0];

  return (
    <div className="px-5 pb-4">
      <Link
        href="/training"
        className="mb-1 inline-flex items-center gap-1 pt-3 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="size-4" />
        返回训练
      </Link>

      <div className="mt-1">
        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
          {TRAINING_CATEGORY_LABELS[question.category]}
        </span>
        <h2 className="mt-2 text-xl font-bold leading-snug text-slate-900 dark:text-white">
          {question.title}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {question.description}
        </p>
      </div>

      <Card className="mt-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">问题</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
          {question.prompt}
        </p>
        {question.hints && question.hints.length > 0 ? (
          <ul className="mt-3 space-y-1">
            {question.hints.map((hint) => (
              <li key={hint} className="text-xs text-slate-500 dark:text-slate-400">
                · {hint}
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      <div className="mt-3">
        <TextArea
          label="你的答案"
          id="training-answer"
          placeholder="写下你的思考与结论…"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          minLength={10}
          className="min-h-40"
        />
        <Button
          type="button"
          className="mt-3 w-full"
          disabled={!answer.trim() || submitting}
          onClick={handleSubmit}
        >
          {submitting ? "提交中…" : "提交答案"}
        </Button>
      </div>

      {/* 提交结果状态：等待 AI 评分（未来 AI Examiner Agent 更新） */}
      {latest ? (
        <Card className="mt-4 border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="flex items-center gap-2">
            <Clock3 className="size-4 text-amber-600 dark:text-amber-400" />
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              等待 AI 评分
            </h3>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-amber-700/80 dark:text-amber-300/80">
            你的答案已于 {formatDate(latest.submittedAt)} 提交。V0.1 暂不评分，下一阶段将由 AI Examiner
            Agent 自动评分并给出反馈。
          </p>
        </Card>
      ) : null}
    </div>
  );
}