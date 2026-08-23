"use client";

import { AlertTriangle, FileText, Info } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { EvidenceBadge } from "./EvidenceBadge";
import {
  DIMENSION_LABELS,
  NEGATIVE_DIMENSIONS,
  SCORE_DIMENSIONS,
  NO_EXTERNAL_EVIDENCE_NOTICE,
} from "@/lib/research";
import type { EvidenceItem, ResearchRun, ScoreDimension } from "@/lib/research";
import { formatScore } from "@/lib/utils/format";

function EvidenceList({ items }: { items: EvidenceItem[] }) {
  if (!items || items.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
          <EvidenceBadge evidenceClass={item.evidenceClass} />
          <span className="min-w-0 flex-1">
            {item.claim}
            {item.sourceRef ? (
              <span className="block text-[10px] text-slate-400 dark:text-slate-500">
                来源：{item.sourceRef.sourceType}
                {item.sourceRef.sourceId ? ` (${item.sourceRef.sourceId})` : ""}
                {item.sourceRef.url ? ` ${item.sourceRef.url}` : ""}
              </span>
            ) : null}
            {item.note ? <span className="block text-[10px] text-amber-600 dark:text-amber-400">{item.note}</span> : null}
          </span>
          <span className="shrink-0 text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
            {Math.round(item.confidence * 100)}%
          </span>
        </li>
      ))}
    </ul>
  );
}

function ScoreCard({ run }: { run: ResearchRun }) {
  const report = run.report;
  if (!report) return null;
  const score = report.score;
  const dimMap = new Map(score.score_breakdown.map((d) => [d.dimension, d]));
  return (
    <Card className="mt-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">商业机会评分</h3>
        <span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
          Score v{score.version}
        </span>
      </div>
      <div className="mt-2 flex items-end gap-2">
        <span className="text-3xl font-bold text-slate-900 dark:text-white">
          {formatScore(score.overall_score)}
        </span>
        <span className="pb-1 text-sm text-slate-400 dark:text-slate-500">/ 10</span>
        <span className="pb-1 ml-auto text-xs text-slate-400 dark:text-slate-500">
          置信度 {Math.round(score.confidence * 100)}%
        </span>
      </div>
      <div className="mt-4 space-y-2.5">
        {SCORE_DIMENSIONS.map((dim: ScoreDimension) => {
          const d = dimMap.get(dim);
          return (
            <ScoreBar
              key={dim}
              label={DIMENSION_LABELS[dim]}
              value={d?.score ?? 0}
              invert={NEGATIVE_DIMENSIONS.has(dim)}
            />
          );
        })}
      </div>
      {score.assumptions.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">假设（无证据）</p>
          <EvidenceList items={score.assumptions} />
        </div>
      ) : null}
      {score.unknowns.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-medium text-rose-700 dark:text-rose-400">待验证项</p>
          <ul className="mt-1 space-y-1">
            {score.unknowns.map((u, i) => (
              <li key={i} className="text-xs text-slate-600 dark:text-slate-300">· {u}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}

/** 完整研究报告视图（结构化渲染，非一段文本） */
export function ResearchReportView({ run }: { run: ResearchRun }) {
  const report = run.report;
  if (!report) return null;
  const degraded = run.status === "degraded" || report.meta.degraded;

  return (
    <div>
      {degraded ? (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            本报告在部分阶段发生了 Provider 降级（OpenAI 不可用时回退到 DeepSeek），结论置信度可能偏低，请谨慎用于最终决策。
          </span>
        </div>
      ) : null}
      {!report.meta.externalEvidenceAvailable ? (
        <div className="mt-2 flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>{NO_EXTERNAL_EVIDENCE_NOTICE}。市场/竞品/数据类结论为 AI 推断，未经真实来源验证。</span>
        </div>
      ) : null}

      <Card className="mt-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">执行摘要</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {report.executiveSummary}
        </p>
      </Card>

      <ScoreCard run={run} />

      <Card className="mt-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">验证方案</h3>
        <div className="mt-2 space-y-2">
          {report.validationPlan.map((item, i) => (
            <div key={i} className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
              <p className="font-medium text-slate-700 dark:text-slate-200">{item.assumption}</p>
              <p className="mt-0.5">方法：{item.method}（effort: {item.effort}）</p>
              <p className="mt-0.5">成功标准：{item.successCriteria}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-3 space-y-2">
        {report.sections.map((section) => (
          <Card key={section.area} className="py-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{section.title}</h4>
              {section.confidence < 0.7 ? (
                <span className="text-[10px] text-amber-600 dark:text-amber-400">
                  置信度 {Math.round(section.confidence * 100)}%
                </span>
              ) : null}
            </div>
            <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {section.content}
            </p>
            <EvidenceList items={section.evidence} />
          </Card>
        ))}
      </div>

      <Card className="mt-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">下一步行动</h3>
        <ul className="mt-2 space-y-1.5">
          {report.nextActions.map((action, i) => (
            <li key={i} className="flex gap-2 text-xs text-slate-600 dark:text-slate-300">
              <span className="text-indigo-500">{i + 1}.</span>
              {action}
            </li>
          ))}
        </ul>
      </Card>

      {/* 研究明细（可折叠）：provider / 降级 / tokens / 成本 —— 可追踪 */}
      <details className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
        <summary className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <FileText className="size-3.5" />
          研究明细（阶段 / Provider / Token / 成本）
        </summary>
        <table className="mt-2 w-full text-[10px] text-slate-500 dark:text-slate-400">
          <thead>
            <tr className="text-left">
              <th className="pb-1">阶段</th>
              <th className="pb-1">Provider</th>
              <th className="pb-1">降级</th>
              <th className="pb-1 text-right">Token</th>
              <th className="pb-1 text-right">成本$</th>
            </tr>
          </thead>
          <tbody>
            {run.stages.map((s) => (
              <tr key={s.stage} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-1">{s.stage}</td>
                <td className="py-1">{s.provider}</td>
                <td className="py-1">{s.provider_degraded ? "是" : "否"}</td>
                <td className="py-1 text-right tabular-nums">
                  {s.inputTokens + s.outputTokens}
                </td>
                <td className="py-1 text-right tabular-nums">{s.estimatedCost.toFixed(6)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}