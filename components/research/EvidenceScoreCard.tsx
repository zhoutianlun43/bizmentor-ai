/**
 * Evidence Score 卡片（V0.9.1）：证据关联评分（6 维度 + 权重 + 证据覆盖）。
 */
import { Scale } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EVIDENCE_SCORE_LABELS } from "@/lib/research";
import type { EvidenceScore } from "@/lib/research";
import { formatScore } from "@/lib/utils/format";

export function EvidenceScoreCard({ score }: { score: EvidenceScore }) {
  const data = Math.round(score.evidenceCoverage.dataSupported * 100);
  const ai = Math.round(score.evidenceCoverage.aiInferred * 100);
  return (
    <Card className="mt-3 border-violet-200 dark:border-violet-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Scale className="size-4 text-violet-500" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Evidence Score</h3>
        </div>
        <span className="rounded-lg bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-300">
          证据关联评分
        </span>
      </div>

      <div className="mt-2 flex items-end gap-2">
        <span className="text-3xl font-bold text-violet-600 dark:text-violet-400">{formatScore(score.overall)}</span>
        <span className="pb-1 text-sm text-slate-400 dark:text-slate-500">/ 10</span>
        <span className="pb-1 ml-auto text-xs text-slate-400 dark:text-slate-500">置信度 {Math.round(score.confidence * 100)}%</span>
      </div>

      <div className="mt-3 space-y-2">
        {score.dimensions.map((d) => (
          <div key={d.dimension}>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-medium">{EVIDENCE_SCORE_LABELS[d.dimension] ?? d.label}</span>
              <span>
                权重 {Math.round(d.weight * 100)}% · 证据 {d.evidence.length} 条 · 置信 {Math.round(d.confidence * 100)}%
              </span>
            </div>
            <div className="mt-1 flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
              <div className={d.score >= 7 ? "bg-emerald-500" : d.score >= 4 ? "bg-amber-500" : "bg-rose-500"} style={{ width: Math.min(100, d.score * 10) + "%" }} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
        <p className="text-[10px] font-medium text-slate-400">证据覆盖</p>
        <div className="mt-1 flex h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div className="bg-emerald-500" style={{ width: data + "%" }} />
          <div className="bg-amber-400" style={{ width: ai + "%" }} />
        </div>
        <p className="mt-1 text-[10px] text-slate-400">
          数据支持 <span className="font-semibold text-emerald-600 dark:text-emerald-400">{data}%</span>
          <span className="mx-1">·</span>
          AI 推理 <span className="font-semibold text-amber-600 dark:text-amber-400">{ai}%</span>
        </p>
      </div>
    </Card>
  );
}
