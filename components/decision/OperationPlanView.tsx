/**
 * 商业操盘手报告视图（V1.2：真实商业落地决策系统）。
 * 10 部分：市场验证/产品矩阵/竞品/供应链/定价/页面优化/内容30/广告/90天/投资判断。
 * sourceRequired：有真实来源标「有来源」，无真实来源标「暂无真实来源，需要验证」。
 */
import { useMemo, useState } from "react";
import {
  AlertTriangle, CalendarRange, CheckCircle2, ClipboardList, Database, LineChart, Megaphone, Package,
  Percent, Search, ShoppingCart, Tags, Target, TrendingUp, Users,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { BusinessOperationPlan, ProductCandidate } from "@/lib/operation";

function SourceBadge({ required, verified }: { required?: boolean; verified?: boolean }) {
  if (verified === false) return <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">需要验证</span>;
  if (required) return <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">有来源</span>;
  return <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">AI 推理</span>;
}

function SectionTitle({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div className="mb-2 flex items-center gap-1.5">
      <span className="text-indigo-500">{icon}</span>
      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h4>
      {sub ? <span className="text-[10px] text-slate-400">{sub}</span> : null}
    </div>
  );
}

const REC_LABEL: Record<string, { label: string; cls: string }> = {
  recommend: { label: "推荐", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  consider: { label: "考虑", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  reject: { label: "淘汰", cls: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
};

function ProductCard({ p }: { p: ProductCandidate }) {
  const rec = REC_LABEL[p.recommendation] ?? REC_LABEL.consider;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{p.name}</p>
        <div className="flex shrink-0 items-center gap-1">
          <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">{p.score}</span>
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${rec.cls}`}>{rec.label}</span>
        </div>
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-600 dark:text-slate-300">
        <span>供应：{p.supplySource}</span>
        <span>参考：<a className="text-indigo-500 underline" href={p.referenceLink} target="_blank" rel="noreferrer">{p.referenceLink.slice(0, 28)}</a></span>
        <span>需求：{p.demand}</span>
        <span>竞争数量：{p.competitionCount}</span>
        <span>售价：{p.price}</span>
        <span>采购成本：{p.purchaseCost}</span>
        <span>毛利：{p.grossMargin}</span>
        <span>物流：{p.logisticsCost}</span>
        <span className="col-span-2">预计利润：{p.estimatedProfit}</span>
        <span className="col-span-2">竞争难度：{p.competitionDifficulty}/10</span>
      </div>
      <div className="mt-1.5 space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
        <p>为什么选：{p.why}</p>
        <p>为什么淘汰：{p.whyNot}</p>
      </div>
      <div className="mt-1"><SourceBadge required={p.sourceRequired} /></div>
    </div>
  );
}

export function OperationPlanView({ plan }: { plan: BusinessOperationPlan }) {
  const [showAll, setShowAll] = useState(false);
  const content = useMemo(() => (showAll ? plan.contentPlan : plan.contentPlan.slice(0, 8)), [plan.contentPlan, showAll]);
  const inv = plan.investmentJudgment;
  const invStyle = inv.recommendation === "yes" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : inv.recommendation === "no" ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  const invLabel = inv.recommendation === "yes" ? "YES 进入" : inv.recommendation === "no" ? "NO 不进入" : "验证后进入";

  return (
    <div className="space-y-3">
      {/* 头部 + 数据来源 */}
      <Card className="border-violet-200 dark:border-violet-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ClipboardList className="size-4 text-violet-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">商业操盘手报告</h3>
          </div>
          <span className="text-xs text-slate-400">Decision v{plan.version}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${invStyle}`}>{invLabel}</span>
          <span className="text-[10px] text-slate-400">置信度 {Math.round(plan.confidence * 100)}%</span>
        </div>
        {plan.sources.length > 0 ? (
          <details className="mt-2">
            <summary className="cursor-pointer text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1"><Database className="size-3" />真实数据来源（{plan.sources.length}）</span>
            </summary>
            <ul className="mt-1 space-y-0.5">
              {plan.sources.slice(0, 12).map((s, i) => (
                <li key={i} className="text-[10px] text-slate-400">
                  · {s.title ?? "未命名"}{s.url ? <a className="ml-1 text-indigo-500 underline" href={s.url} target="_blank" rel="noreferrer">{s.url.slice(0, 40)}</a> : null}
                </li>
              ))}
            </ul>
          </details>
        ) : (
          <p className="mt-2 text-[10px] text-amber-600 dark:text-amber-400">暂无真实来源，需要验证</p>
        )}
      </Card>

      {/* 1 市场真实需求验证 */}
      <Card>
        <SectionTitle icon={<Search className="size-4" />} title="市场真实需求验证" sub="Google Trends / TikTok / Amazon / Reddit / YouTube / 社媒" />
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] text-slate-600 dark:text-slate-300">
            <thead><tr className="text-left text-slate-400"><th className="pb-1">关键词</th><th className="pb-1">平台</th><th className="pb-1">趋势</th><th className="pb-1">数据来源</th><th className="pb-1">商业意义</th></tr></thead>
            <tbody>
              {plan.marketValidation.rows.map((r, i) => (
                <tr key={i} className="border-t border-slate-100 dark:border-slate-800 align-top">
                  <td className="py-1 pr-2 font-medium">{r.keyword}</td>
                  <td className="py-1 pr-2">{r.platform}</td>
                  <td className="py-1 pr-2">{r.trend}</td>
                  <td className="py-1 pr-2 text-amber-600 dark:text-amber-400">{r.source}</td>
                  <td className="py-1">{r.businessMeaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-[10px] text-slate-400">{plan.marketValidation.summary}</p>
      </Card>

      {/* 2 产品筛选矩阵 */}
      <Card>
        <SectionTitle icon={<Package className="size-4" />} title="产品筛选矩阵" sub={`${plan.productMatrix.candidates.length} 个候选 · 非拍脑袋`} />
        <p className="mb-2 text-[10px] text-slate-400">{plan.productMatrix.summary}</p>
        <div className="space-y-2">
          {plan.productMatrix.candidates.map((p, i) => <ProductCard key={i} p={p} />)}
        </div>
      </Card>

      {/* 3 竞品深度拆解 */}
      <Card>
        <SectionTitle icon={<Users className="size-4" />} title="竞品深度拆解" sub={`${plan.competitorAnalysis.competitors.length} 个真实竞品`} />
        <p className="mb-2 text-[10px] text-slate-400">{plan.competitorAnalysis.summary}</p>
        <div className="space-y-2">
          {plan.competitorAnalysis.competitors.map((c, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{c.brand}</p>
                <span className="text-[10px] text-slate-400">{c.platform}</span>
              </div>
              <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                <span>产品：{c.product}</span><span>价格：{c.price}</span>
                <span>销量：{c.sales}</span><span>评价：{c.reviews}</span>
                <span className="col-span-2">流量来源：{c.trafficSource}</span>
                <span className="col-span-2">核心卖点：{c.coreSellingPoint}</span>
                <span className="col-span-2">用户评价：{c.userReviews}</span>
                <span className="col-span-2 text-rose-600 dark:text-rose-400">差评：{c.negativeReviews}</span>
                <span className="col-span-2 text-emerald-700 dark:text-emerald-400">机会点：{c.opportunity}</span>
              </div>
              {c.website && c.website !== "暂无" ? <a className="mt-1 block text-[10px] text-indigo-500 underline" href={c.website} target="_blank" rel="noreferrer">{c.website}</a> : null}
              <div className="mt-1"><SourceBadge required={c.sourceRequired} /></div>
            </div>
          ))}
        </div>
      </Card>

      {/* 4 供应链 + 5 定价 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <SectionTitle icon={<ShoppingCart className="size-4" />} title="供应链" />
          <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
            <p>渠道：{plan.supplyChain.channels.join("、")}</p>
            <p>价格区间：{plan.supplyChain.priceRange}</p>
            <p>MOQ：{plan.supplyChain.moq}</p>
            <p>生产周期：{plan.supplyChain.productionCycle}</p>
            <p>物流：{plan.supplyChain.logistics}</p>
            <p>预计成本：{plan.supplyChain.estimatedCost}</p>
            <p className="text-amber-600 dark:text-amber-400">备注：{plan.supplyChain.note}</p>
          </div>
          <div className="mt-1"><SourceBadge verified={plan.supplyChain.verified} /></div>
        </Card>
        <Card>
          <SectionTitle icon={<Percent className="size-4" />} title="定价模型" sub="采购-物流-佣金-广告-人工=真实成本" />
          <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
            <p>采购：{plan.pricing.purchaseCost}</p>
            <p>物流：{plan.pricing.logistics} · 佣金：{plan.pricing.platformFee}</p>
            <p>广告：{plan.pricing.adCost} · 人工：{plan.pricing.labor}</p>
            <p className="font-semibold">真实成本：{plan.pricing.totalCost}</p>
            <p>售价：{plan.pricing.sellingPrice} · 毛利：{plan.pricing.grossMargin}</p>
            <p className="font-semibold text-emerald-600 dark:text-emerald-400">净利润：{plan.pricing.netProfit}</p>
            <p>盈亏平衡广告成本：{plan.pricing.breakevenAdCost}</p>
            <p>目标 ROI：{plan.pricing.targetROI}</p>
          </div>
          <div className="mt-1"><SourceBadge required={plan.pricing.sourceRequired} /></div>
        </Card>
      </div>

      {/* 6 页面优化 */}
      <Card>
        <SectionTitle icon={<Tags className="size-4" />} title="页面与销售优化" />
        <details>
          <summary className="cursor-pointer text-[11px] font-medium text-slate-500 dark:text-slate-400">标题（{plan.pageOptimization.titles.length} 个版本）</summary>
          <ul className="mt-1 space-y-0.5">
            {plan.pageOptimization.titles.map((t, i) => <li key={i} className="text-[11px] text-slate-600 dark:text-slate-300">· {t}</li>)}
          </ul>
        </details>
        <details className="mt-2">
          <summary className="cursor-pointer text-[11px] font-medium text-slate-500 dark:text-slate-400">主图方案（{plan.pageOptimization.mainImages.length} 张）</summary>
          <div className="mt-1 space-y-1">
            {plan.pageOptimization.mainImages.map((m, i) => (
              <p key={i} className="text-[11px] text-slate-600 dark:text-slate-300"><b>{m.slot}</b>：{m.purpose} · {m.visual}{m.text ? " · 「" + m.text + "」" : ""}</p>
            ))}
          </div>
        </details>
        <div className="mt-2 grid grid-cols-1 gap-1 text-[11px] text-slate-600 dark:text-slate-300 sm:grid-cols-2">
          <p><b>痛点：</b>{plan.pageOptimization.description.painPoints}</p>
          <p><b>解决方案：</b>{plan.pageOptimization.description.solution}</p>
          <p><b>信任：</b>{plan.pageOptimization.description.trust}</p>
          <p><b>CTA：</b>{plan.pageOptimization.description.cta}</p>
        </div>
        <details className="mt-2">
          <summary className="cursor-pointer text-[11px] font-medium text-slate-500 dark:text-slate-400">SEO 关键词（{plan.pageOptimization.seoKeywords.length}）</summary>
          <ul className="mt-1 space-y-0.5">
            {plan.pageOptimization.seoKeywords.map((k, i) => <li key={i} className="text-[11px] text-slate-600 dark:text-slate-300">· {k.keyword}（搜索量 {k.searchVolume} · 竞争 {k.competition}）</li>)}
          </ul>
        </details>
      </Card>

      {/* 7 内容系统 30 */}
      <Card>
        <SectionTitle icon={<Megaphone className="size-4" />} title="内容增长系统" sub={`${plan.contentPlan.length} 条内容计划`} />
        <div className="space-y-1.5">
          {content.map((c, i) => (
            <div key={i} className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
              <p className="font-medium"><span className="text-indigo-500">{c.day}</span> · {c.title}</p>
              <p className="mt-0.5 text-[10px] text-slate-400">Hook：{c.hook} · 结构：{c.structure}</p>
              <p className="text-[10px] text-slate-400">拍摄：{c.filming} · 展示：{c.productDisplay}</p>
              <p className="text-[10px] text-slate-400">CTA：{c.cta} · 指标：{c.targetMetric}</p>
            </div>
          ))}
        </div>
        {plan.contentPlan.length > 8 ? (
          <button type="button" onClick={() => setShowAll((s) => !s)} className="mt-2 text-[11px] text-indigo-500">{showAll ? "收起" : "展开全部 30 条"}</button>
        ) : null}
      </Card>

      {/* 8 广告 */}
      <Card>
        <SectionTitle icon={<TrendingUp className="size-4" />} title="广告投放方案" />
        <div className="space-y-2">
          {plan.adPlan.map((a, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
              <p className="font-medium">{a.stage} · 预算 {a.budget} · 素材 {a.materials}</p>
              <p className="mt-0.5">目标：{a.goal} · 指标：{a.metrics}</p>
              <p className="text-rose-500">淘汰：{a.eliminateRule}</p>
              <p className="text-emerald-600 dark:text-emerald-400">放量：{a.scaleRule}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* 9 90天 AI 操盘计划 */}
      <Card>
        <SectionTitle icon={<CalendarRange className="size-4" />} title="AI 操盘 90 天计划" sub="AI 负责研究类任务，用户只负责预算/权限/决策" />
        <div className="space-y-2">
          {plan.ninetyDayPlan.map((ph, i) => (
            <div key={i} className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-2.5 text-[11px] text-slate-600 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-slate-300">
              <p className="font-medium text-indigo-700 dark:text-indigo-300">{ph.phase} · {ph.goal}</p>
              <p className="mt-0.5"><b>AI 负责：</b>{ph.aiResponsible}</p>
              <p><b>用户负责：</b>{ph.userResponsible}</p>
              <p><b>工具：</b>{ph.tools} · <b>输出：</b>{ph.output}</p>
              <p className="text-emerald-600 dark:text-emerald-400"><b>成功标准：</b>{ph.successCriteria}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* 10 投资判断 */}
      <Card className="border-violet-200 dark:border-violet-800">
        <SectionTitle icon={<Target className="size-4" />} title="投资判断" sub="投资机构视角" />
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${invStyle}`}>{invLabel}</span>
        </div>
        <div className="mt-2 grid grid-cols-1 gap-1 text-[11px] text-slate-600 dark:text-slate-300 sm:grid-cols-2">
          <p><b>市场：</b>{inv.reasons.market}</p>
          <p><b>竞争：</b>{inv.reasons.competition}</p>
          <p><b>供应链：</b>{inv.reasons.supplyChain}</p>
          <p><b>利润：</b>{inv.reasons.profit}</p>
          <p><b>增长：</b>{inv.reasons.growth}</p>
          <p><b>风险：</b>{inv.reasons.risk}</p>
        </div>
        <div className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          <p className="flex items-center gap-1"><AlertTriangle className="size-3" />最大未知因素：{inv.biggestUnknown}</p>
        </div>
        <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
          <p className="flex items-center gap-1"><CheckCircle2 className="size-3 text-emerald-500" />下一步关键实验：{inv.nextExperiment.experiment}</p>
          <p className="mt-0.5">预算 {inv.nextExperiment.budget} · 周期 {inv.nextExperiment.cycle}</p>
          <p className="text-emerald-600 dark:text-emerald-400">成功：{inv.nextExperiment.successCriteria}</p>
          <p className="text-rose-500">失败：{inv.nextExperiment.failureCriteria}</p>
        </div>
      </Card>

      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
        <LineChart className="size-3.5" />
        由 AI 商业操盘手生成 · 真实来源已标注 · 无真实来源数据均标注「需要验证」
      </div>
    </div>
  );
}
