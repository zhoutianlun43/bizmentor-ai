"use client";

import { AlertTriangle, CheckCircle2, FileText, Globe, Info, Link2 } from "lucide-react";
import { ExecutiveDecisionCard } from "@/components/decision/ExecutiveDecisionCard";
import { BusinessJudgmentView } from "@/components/decision/BusinessJudgmentView";
import { Card } from "@/components/ui/Card";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { EvidenceBadge } from "./EvidenceBadge";
import {
  DIMENSION_LABELS,
  NEGATIVE_DIMENSIONS,
  SCORE_DIMENSIONS,
} from "@/lib/research";
import type {
  EvidenceConflict,
  EvidenceItem,
  ResearchRun,
  ScoreDimension,
  SourceCredibility,
  SourceDocument,
} from "@/lib/research";
import { formatScore } from "@/lib/utils/format";

const EVIDENCE_CRED_LABEL: Record<string, string> = {
  high: "高",
  medium: "中",
  low: "低",
  unverified: "未验证",
};

const CREDIBILITY_LABEL: Record<SourceCredibility["level"], string> = {
  official: "官方",
  high: "高",
  medium: "中",
  low: "低",
  unknown: "未知",
};

function CredibilityBadge({ credibility }: { credibility?: SourceCredibility }) {
  if (!credibility) return null;
  const tone =
    credibility.level === "official"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
      : credibility.level === "high"
        ? "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300"
        : credibility.level === "low"
          ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${tone}`}>
      可信度 {CREDIBILITY_LABEL[credibility.level]}
    </span>
  );
}

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
                <span className="inline-flex items-center gap-0.5">
                  <Link2 className="size-3" />
                  来源：{item.sourceRef.publisher ?? item.sourceRef.title ?? item.sourceRef.sourceType}
                  {item.sourceRef.url ? (
                    <a href={item.sourceRef.url} target="_blank" rel="noreferrer" className="underline">
                      {item.sourceRef.url.replace(/^https?:\/\//, "").slice(0, 40)}
                    </a>
                  ) : null}
                </span>
                {item.sourceRef.retrievedAt ? " · 抓取 " + item.sourceRef.retrievedAt.slice(0, 10) : ""}
              </span>
            ) : null}
            {item.credibilityLevel || item.verificationMethod ? (
              <span className="block text-[10px] text-slate-400 dark:text-slate-500">
                {item.credibilityLevel ? "可信度等级：" + EVIDENCE_CRED_LABEL[item.credibilityLevel] + " · " : ""}
                {item.verificationMethod ? "验证方式：" + item.verificationMethod : ""}
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
        <span className="text-3xl font-bold text-slate-900 dark:text-white">{formatScore(score.overall_score)}</span>
        <span className="pb-1 text-sm text-slate-400 dark:text-slate-500">/ 10</span>
        <span className="pb-1 ml-auto text-xs text-slate-400 dark:text-slate-500">
          置信度 {Math.round(score.confidence * 100)}%
        </span>
      </div>
      <div className="mt-4 space-y-2.5">
        {SCORE_DIMENSIONS.map((dim: ScoreDimension) => {
          const d = dimMap.get(dim);
          return <ScoreBar key={dim} label={DIMENSION_LABELS[dim]} value={d?.score ?? 0} invert={NEGATIVE_DIMENSIONS.has(dim)} />;
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

/** 真实来源列表 */
function SourcesCard({ sources }: { sources: SourceDocument[] }) {
  if (!sources || sources.length === 0) return null;
  return (
    <Card className="mt-3">
      <div className="flex items-center gap-2">
        <Globe className="size-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">真实来源（{sources.length}）</h3>
      </div>
      <ul className="mt-2 space-y-2">
        {sources.map((s) => (
          <li key={s.id} className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{s.title}</p>
              <CredibilityBadge credibility={s.credibility} />
            </div>
            <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
              {s.publisher ?? s.sourceType}
              {s.retrievedAt ? ` · 抓取 ${s.retrievedAt.slice(0, 10)}` : ""}
            </p>
            {s.url ? (
              <a href={s.url} target="_blank" rel="noreferrer" className="mt-0.5 block truncate text-[10px] text-indigo-600 underline dark:text-indigo-400">
                {s.url}
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** 多来源冲突 */
function ConflictsCard({ conflicts }: { conflicts: EvidenceConflict[] }) {
  if (!conflicts || conflicts.length === 0) return null;
  return (
    <Card className="mt-3 border-rose-200 bg-rose-50/60 dark:border-rose-900 dark:bg-rose-950/30">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4 text-rose-600 dark:text-rose-400" />
        <h3 className="text-sm font-semibold text-rose-800 dark:text-rose-200">多来源冲突（{conflicts.length}）</h3>
      </div>
      <p className="mt-1 text-xs text-rose-700/80 dark:text-rose-300/80">
        不同来源给出的信息不一致，请勿直接采信，需进一步验证。
      </p>
      <div className="mt-2 space-y-2">
        {conflicts.map((c, i) => (
          <div key={i} className="rounded-xl bg-white/60 px-3 py-2 text-xs dark:bg-slate-900/60">
            <p className="font-medium text-rose-700 dark:text-rose-300">
              [{c.area}] {c.description}
            </p>
            {c.claims.map((claim, j) => (
              <p key={j} className="mt-0.5 text-slate-600 dark:text-slate-300">· {claim}</p>
            ))}
            <p className="mt-0.5 text-[10px] text-slate-400">来源：{c.sources.join("；")}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** 竞品矩阵 */
function CompetitorMatrixCard({ run }: { run: ResearchRun }) {
  const matrix = run.report?.competitorMatrix;
  if (!matrix || matrix.rows.length === 0) return null;
  return (
    <Card className="mt-3">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">竞品矩阵</h3>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-[11px] text-slate-600 dark:text-slate-300">
          <thead>
            <tr className="text-left text-slate-400">
              <th className="py-1 pr-2">竞品</th>
              {matrix.dimensions.map((d) => (
                <th key={d} className="px-2 py-1">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => (
              <tr key={row.competitor} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-1.5 pr-2 font-medium">{row.competitor}</td>
                {matrix.dimensions.map((dim) => {
                  const cell = row.cells.find((c) => c.dimension === dim);
                  return (
                    <td key={dim} className="px-2 py-1.5">
                      {cell?.value ?? "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[10px] text-slate-400">
        竞品与矩阵来自真实来源（见「真实来源」）；无法追溯的单元格已移除引用。
      </p>
    </Card>
  );
}

/** 完整研究报告视图 */
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
            高级模型（OpenAI）当前不可用，本次报告由 DeepSeek 生成（已记录 provider_degraded），
            高价值/最终判断请谨慎使用，并务必核对「真实来源」与「多来源冲突」。
          </span>
        </div>
      ) : null}
      {report.meta.externalEvidenceAvailable ? (
        <div className="mt-2 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span>{report.meta.notice}</span>
        </div>
      ) : (
        <div className="mt-2 flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>{report.meta.notice}</span>
        </div>
      )}
      {report.insufficientEvidence.length > 0 ? (
        <div className="mt-2 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>证据不足：{report.insufficientEvidence.join("；")}</span>
        </div>
      ) : null}

      <ExecutiveDecisionCard
        judgment={report.judgment}
        score={report.score.overall_score}
        confidence={report.score.confidence}
        thesis={report.thesis}
        opportunityName={report.opportunityName}
      />
      {report.judgment ? <BusinessJudgmentView judgment={report.judgment} /> : null}

      <Card className="mt-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">执行摘要</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{report.executiveSummary}</p>
      </Card>

      <ScoreCard run={run} />
      <SourcesCard sources={report.sources} />
      <ConflictsCard conflicts={report.conflicts} />
      <CompetitorMatrixCard run={run} />

      <Card className="mt-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">商业验证实验</h3>
          <span className="text-[10px] text-slate-400">AI 自动生成 · {report.validationPlan.length} 个实验</span>
        </div>
        <div className="mt-2 space-y-2">
          {report.validationPlan.map((item, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/60">
              <div className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">{i + 1}</span>
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">effort {item.effort}</span>
              </div>
              <p className="mt-1.5 text-xs font-medium text-slate-700 dark:text-slate-200">假设：{item.assumption}</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">方法：{item.method}</p>
              <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">成功标准：{item.successCriteria}</p>
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
            <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-600 dark:text-slate-300">{section.content}</p>
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
                <td className="py-1 text-right tabular-nums">{s.inputTokens + s.outputTokens}</td>
                <td className="py-1 text-right tabular-nums">{s.estimatedCost.toFixed(6)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}