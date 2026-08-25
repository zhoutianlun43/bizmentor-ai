/**
 * BusinessJudgmentView（V0.9）：完整 AI 商业判断 —— 决策型报告主体。
 * 是否建议进入 / 推荐切入方向 / 不建议做什么 / 90 天验证计划（时间线）/ 第一批客户获取方案。
 */
import { Ban, CalendarRange, Compass, Rocket, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { BusinessJudgment } from "@/lib/research";

const RECOMMENDATION_STYLE: Record<string, string> = {
  recommend_enter: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  conditional_enter: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  continue_observe: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  not_recommend: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
};

const RECOMMENDATION_LABEL: Record<string, string> = {
  recommend_enter: "建议进入",
  conditional_enter: "条件进入",
  continue_observe: "继续观察",
  not_recommend: "不建议进入",
};

export function BusinessJudgmentView({ judgment }: { judgment: BusinessJudgment }) {
  return (
    <div className="mt-3 space-y-3">
      {/* 是否建议进入 + 切入方向 */}
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${RECOMMENDATION_STYLE[judgment.recommendation]}`}>
            {RECOMMENDATION_LABEL[judgment.recommendation]}
          </span>
          <span className="text-xs text-slate-400">AI 商业判断 · 置信度 {Math.round(judgment.confidence * 100)}%</span>
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
          <Compass className="mt-0.5 size-4 shrink-0 text-indigo-500" />
          <div>
            <p className="text-[10px] font-medium text-slate-400">推荐切入方向</p>
            <p className="mt-0.5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{judgment.entryDirection}</p>
          </div>
        </div>
      </Card>

      {/* 不建议做什么 */}
      {judgment.notDoList.length > 0 ? (
        <Card>
          <div className="flex items-center gap-1.5">
            <Ban className="size-4 text-rose-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">不建议做什么</h4>
          </div>
          <ul className="mt-2 space-y-1.5">
            {judgment.notDoList.map((item, i) => (
              <li key={i} className="flex gap-2 text-xs text-slate-600 dark:text-slate-300">
                <span className="text-rose-500">✕</span>
                {item}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/* 90 天验证计划（时间线） */}
      <Card>
        <div className="flex items-center gap-1.5">
          <CalendarRange className="size-4 text-indigo-500" />
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">90 天验证计划</h4>
        </div>
        <div className="mt-3 space-y-0">
          {judgment.day90Plan.map((step, i) => (
            <div key={i} className="relative flex gap-3 pb-4 last:pb-0">
              {i < judgment.day90Plan.length - 1 ? (
                <span className="absolute left-[11px] top-6 h-full w-px bg-indigo-200 dark:bg-indigo-800" />
              ) : null}
              <span className="z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                    {step.phase}
                  </span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{step.title}</span>
                </div>
                <ul className="mt-1 space-y-0.5">
                  {step.actions.map((a, j) => (
                    <li key={j} className="text-xs text-slate-600 dark:text-slate-300">· {a}</li>
                  ))}
                </ul>
                <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">✓ 成功度量：{step.successMetric}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 第一批客户获取方案 */}
      <Card>
        <div className="flex items-center gap-1.5">
          <Users className="size-4 text-violet-500" />
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">第一批客户获取方案</h4>
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
            <p className="text-[10px] font-medium text-slate-400">目标客户</p>
            <p className="mt-0.5 text-xs text-slate-700 dark:text-slate-200">{judgment.firstCustomers.targetSegment}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
            <p className="text-[10px] font-medium text-slate-400">首批目标</p>
            <p className="mt-0.5 text-xs text-slate-700 dark:text-slate-200">{judgment.firstCustomers.firstBatchGoal}</p>
          </div>
        </div>
        <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
          <p className="text-[10px] font-medium text-slate-400">切入卖点 / 免费试用</p>
          <p className="mt-0.5 text-xs text-slate-700 dark:text-slate-200">{judgment.firstCustomers.offer}</p>
        </div>
        <div className="mt-2">
          <p className="text-[10px] font-medium text-slate-400">获客渠道</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {judgment.firstCustomers.channels.map((ch, i) => (
              <span key={i} className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300">
                {ch}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-2">
          <p className="text-[10px] font-medium text-slate-400">执行步骤</p>
          <ol className="mt-1 space-y-1">
            {judgment.firstCustomers.steps.map((s, i) => (
              <li key={i} className="flex gap-2 text-xs text-slate-600 dark:text-slate-300">
                <span className="text-indigo-500">{i + 1}.</span>
                {s}
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
          <Rocket className="size-3.5" />
          由 AI 基于研究报告生成 · 需人工验证后执行
        </div>
      </Card>
    </div>
  );
}
