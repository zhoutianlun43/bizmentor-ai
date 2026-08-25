/**
 * 证据自动验证结果（V1.1）：证据不足 → 扩展搜索 → 增加数据源 → 重新分析 → 生成验证结果；失败展示诊断。
 */
import { AlertTriangle, CheckCircle2, Database, Search, Wrench, XCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { EvidenceVerificationResult } from "@/lib/research";

const AREA_LABELS: Record<string, string> = {
  market: "市场",
  competition: "竞争",
  willingnessToPay: "付费意愿",
  demandStrength: "需求强度",
  targetUser: "目标用户",
  moat: "竞争壁垒",
};

const STEPS = ["扩展搜索", "增加数据源", "重新分析", "生成验证结果"];

export function EvidenceVerificationCard({ verification }: { verification: EvidenceVerificationResult }) {
  if (!verification || verification.areas.length === 0) return null;
  const overallTone =
    verification.overall === "recovered"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
      : verification.overall === "partial"
        ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
        : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300";
  const overallLabel =
    verification.overall === "recovered" ? "全部领域已补充外部来源" : verification.overall === "partial" ? "部分领域已补充，其余需人工验证" : "未能通过自动搜索补充来源";

  return (
    <Card className="mt-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Wrench className="size-4 text-indigo-500" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">证据自动验证</h3>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${overallTone}`}>{overallLabel}</span>
      </div>

      {/* 自动验证流程 */}
      <div className="mt-3 flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <CheckCircle2 className="size-3 text-emerald-500" />
              {s}
            </span>
            {i < STEPS.length - 1 ? <span className="text-slate-300 dark:text-slate-600">→</span> : null}
          </div>
        ))}
      </div>

      <div className="mt-3 space-y-2">
        {verification.areas.map((a) => (
          <div key={a.area} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/60">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{AREA_LABELS[a.area] ?? a.area}</p>
              {a.status === "recovered" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  <Database className="size-3" />已补充 {a.sourcesFound} 个来源
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                  <XCircle className="size-3" />仍失败
                </span>
              )}
            </div>
            <div className="mt-1.5 flex items-start gap-1.5 text-[10px] text-slate-400">
              <Search className="mt-0.5 size-3 shrink-0" />
              <span className="min-w-0">
                {a.searchedQueries.length > 0 ? "搜索：\u200b" + a.searchedQueries.join(" ｜ ") : "未执行搜索"}
              </span>
            </div>
            {a.status === "failed" ? (
              <p className="mt-1.5 flex items-start gap-1 text-[10px] text-rose-600 dark:text-rose-400">
                <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                <span>失败诊断：{a.diagnosis ?? "未找到可用外部数据源"}</span>
              </p>
            ) : a.diagnosis ? (
              <p className="mt-1.5 text-[10px] text-emerald-700 dark:text-emerald-400">{a.diagnosis}</p>
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  );
}
