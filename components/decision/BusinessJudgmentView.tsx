/**
 * BusinessJudgmentView（V0.9；V1.0 扩展为创业执行决策系统）。
 * 是否建议进入 / 推荐切入方向 / 不建议做什么 / 商业战略 / MVP / 产品设计 / 获客打法 / 内容素材 / 标题案例 / 投放 / 销售 / 90 天执行计划 / 首批客户 / 风险控制。
 */
import { Ban, CalendarRange, Compass, FileText, Lightbulb, Megaphone, Package, PenLine, Rocket, ShieldCheck, ShoppingBag, Target, Users } from "lucide-react";
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

function TextBlock({ icon, title, value, tone }: { icon: React.ReactNode; title: string; value?: string; tone?: string }) {
  if (!value) return null;
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${tone ?? "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60"}`}>
      <p className="flex items-center gap-1 text-[10px] font-medium text-slate-400">{icon}{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-200">{value}</p>
    </div>
  );
}

function ListBlock({ icon, title, items, tone }: { icon: React.ReactNode; title: string; items?: string[]; tone?: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${tone ?? "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60"}`}>
      <p className="flex items-center gap-1 text-[10px] font-medium text-slate-400">{icon}{title}</p>
      <ul className="mt-1 space-y-1">
        {items.map((it, i) => (
          <li key={i} className="flex gap-1.5 text-xs text-slate-700 dark:text-slate-200"><span className="text-indigo-500">·</span>{it}</li>
        ))}
      </ul>
    </div>
  );
}

export function BusinessJudgmentView({ judgment }: { judgment: BusinessJudgment }) {
  return (
    <div className="mt-3 space-y-3">
      {/* 是否建议进入 + 切入方向 */}
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${RECOMMENDATION_STYLE[judgment.recommendation]}`}>
            {RECOMMENDATION_LABEL[judgment.recommendation]}
          </span>
          <span className="text-xs text-slate-400">Decision v{judgment.version ?? 1} · 置信度 {Math.round((judgment.confidence ?? 0) * 100)}%</span>
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
          <Compass className="mt-0.5 size-4 shrink-0 text-indigo-500" />
          <div>
            <p className="text-[10px] font-medium text-slate-400">推荐切入方向</p>
            <p className="mt-0.5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{judgment.entryDirection}</p>
          </div>
        </div>
      </Card>

      {/* 执行方案（V1.0 创业执行决策系统） */}
      <div className="grid grid-cols-1 gap-2">
        <TextBlock icon={<FileText className="size-3" />} title="商业战略选择" value={judgment.strategyChoice} tone="border-indigo-200 bg-indigo-50/50 dark:border-indigo-900 dark:bg-indigo-950/20" />
        <TextBlock icon={<Package className="size-3" />} title="MVP 方案" value={judgment.mvpPlan} tone="border-violet-200 bg-violet-50/50 dark:border-violet-900 dark:bg-violet-950/20" />
        <TextBlock icon={<PenLine className="size-3" />} title="产品设计" value={judgment.productDesign} tone="border-violet-200 bg-violet-50/50 dark:border-violet-900 dark:bg-violet-950/20" />
        <ListBlock icon={<Users className="size-3" />} title="获客渠道详细打法" items={judgment.acquisitionChannels} tone="border-cyan-200 bg-cyan-50/50 dark:border-cyan-900 dark:bg-cyan-950/20" />
        <TextBlock icon={<Lightbulb className="size-3" />} title="内容素材方案" value={judgment.contentPlan} tone="border-cyan-200 bg-cyan-50/50 dark:border-cyan-900 dark:bg-cyan-950/20" />
        <ListBlock icon={<Megaphone className="size-3" />} title="标题案例" items={judgment.headlineExamples} tone="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20" />
        <TextBlock icon={<Target className="size-3" />} title="投放策略" value={judgment.adStrategy} tone="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20" />
        <TextBlock icon={<ShoppingBag className="size-3" />} title="销售方案" value={judgment.salesPlan} tone="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20" />
      </div>

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

      {/* AI 商业验证路线图（V1.1：90 天 → 市场/产品/商业三阶段验证） */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CalendarRange className="size-4 text-indigo-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">AI 商业验证路线图</h4>
          </div>
          <span className="text-[10px] text-slate-400">90 天 · 研究类任务由 AI 自动执行</span>
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
                {step.goal ? (
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300"><span className="text-slate-400">目标：</span>{step.goal}</p>
                ) : null}
                {(step.aiActions ?? []).length > 0 ? (
                  <div className="mt-1.5">
                    <p className="text-[10px] font-medium text-indigo-500">AI 自动动作</p>
                    <ul className="mt-0.5 space-y-0.5">
                      {(step.aiActions ?? []).map((a, j) => (
                        <li key={j} className="flex gap-1 text-xs text-slate-600 dark:text-slate-300"><span className="text-indigo-500">▸</span>{a}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {(step.userActions ?? []).length > 0 ? (
                  <div className="mt-1.5">
                    <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400">用户动作</p>
                    <ul className="mt-0.5 space-y-0.5">
                      {(step.userActions ?? []).map((a, j) => (
                        <li key={j} className="flex gap-1 text-xs text-slate-600 dark:text-slate-300"><span className="text-amber-500">▸</span>{a}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {/* 兼容旧数据：只有 actions */}
                {(step.actions ?? []).length > 0 && !(step.aiActions ?? []).length ? (
                  <ul className="mt-1 space-y-0.5">
                    {(step.actions ?? []).map((a, j) => (
                      <li key={j} className="text-xs text-slate-600 dark:text-slate-300">· {a}</li>
                    ))}
                  </ul>
                ) : null}
                <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">✓ 成功标准：{step.successMetric}</p>
                {step.risk ? <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">风险：{step.risk}</p> : null}
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
      </Card>

      {/* 风险控制方案 */}
      <TextBlock icon={<ShieldCheck className="size-3" />} title="风险控制方案" value={judgment.riskControl} tone="border-rose-200 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/20" />

      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
        <Rocket className="size-3.5" />
        由 AI 基于研究报告生成 · 需人工验证后执行
      </div>
    </div>
  );
}
