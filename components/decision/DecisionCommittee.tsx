/**
 * AI 商业决策委员会（V0.9.1）：
 * AI 建议 / 决策依据（支持因素·反对因素·关键变量）/ 决策记录 / AI 复盘。
 */
import { Landmark, ListChecks, RotateCcw, Scale, ThumbsDown, ThumbsUp, GitBranch } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { DECISION_LABELS } from "@/lib/decision";
import { RECOMMENDATION_LABELS } from "@/lib/decision/labels";
import type { ScoreUpdate, UserDecision, ValidationResult } from "@/lib/decision";
import type { ResearchRun } from "@/lib/research";
import { formatScore, formatDate } from "@/lib/utils/format";

const AI_ADVICE_STYLE: Record<string, string> = {
  推进: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  先验证: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  继续观察: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  暂停: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
};

interface Props {
  run: ResearchRun;
  decisions: UserDecision[];
  results: ValidationResult[];
  updates: ScoreUpdate[];
}

export function DecisionCommittee({ run, decisions, results, updates }: Props) {
  const report = run.report;
  const judgment = report?.judgment;
  const thesis = report?.thesis;
  const latestScore = run.scoreHistory[run.scoreHistory.length - 1];

  // AI 建议
  const advice = judgment
    ? {
        label: RECOMMENDATION_LABELS[judgment.recommendation] ?? "继续观察",
        reason: judgment.oneLineJudgment + (judgment.suggestedAction ? "；" + judgment.suggestedAction : ""),
      }
    : latestScore
      ? {
          label: latestScore.overall_score >= 7 ? "推进" : latestScore.overall_score >= 5 ? "先验证" : latestScore.overall_score >= 3.5 ? "继续观察" : "暂停",
          reason: `基于当前评分 ${formatScore(latestScore.overall_score)}/10（置信度 ${Math.round(latestScore.confidence * 100)}%）给出建议；生成 AI 商业判断后理由更完整。`,
        }
      : { label: "继续观察", reason: "暂无评分，建议先完成 AI 研究。" };

  // 决策依据
  const support = [
    judgment?.biggestOpportunity,
    thesis ? "核心假设：" + thesis.coreHypothesis : "",
    ...(thesis?.logicChain ?? []),
  ].filter((s): s is string => Boolean(s));
  const against = [
    judgment?.biggestRisk,
    ...(thesis?.invalidators ?? []),
  ].filter((s): s is string => Boolean(s));
  const variables = [
    thesis?.decisionGate ? "决策门：" + thesis.decisionGate : "",
    ...(judgment?.day90Plan ?? []).map((s) => `${s.phase} ${s.title} → ${s.successMetric}`),
    ...(report?.evidenceScore?.dimensions ?? []).filter((d) => d.confidence < 0.5).map((d) => `${d.label}：低置信度（${Math.round(d.confidence * 100)}%）`),
  ].filter((s): s is string => Boolean(s));

  const history = [...decisions].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <Card className="border-indigo-200 dark:border-indigo-800">
      <div className="flex items-center gap-2">
        <Landmark className="size-4 text-indigo-500" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">AI 商业决策委员会</h3>
      </div>

      {/* AI 建议 */}
      <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
        <div className="flex items-center gap-2">
          <Scale className="size-3.5 text-indigo-500" />
          <span className="text-[10px] font-medium text-slate-400">AI 建议</span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${AI_ADVICE_STYLE[advice.label] ?? AI_ADVICE_STYLE["继续观察"]}`}>
            {advice.label}
          </span>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{advice.reason}</p>
      </div>

      {/* 决策依据 */}
      <div className="mt-3 grid grid-cols-1 gap-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950/20">
          <p className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-300"><ThumbsUp className="size-3" />支持因素</p>
          <ul className="mt-1 space-y-0.5">
            {(support.length ? support : ["暂无"]).map((s, i) => (
              <li key={i} className="text-[11px] text-slate-600 dark:text-slate-300">· {s}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 px-3 py-2 dark:border-rose-900 dark:bg-rose-950/20">
          <p className="flex items-center gap-1 text-[10px] font-medium text-rose-700 dark:text-rose-300"><ThumbsDown className="size-3" />反对因素</p>
          <ul className="mt-1 space-y-0.5">
            {(against.length ? against : ["暂无"]).map((s, i) => (
              <li key={i} className="text-[11px] text-slate-600 dark:text-slate-300">· {s}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50/50 px-3 py-2 dark:border-sky-900 dark:bg-sky-950/20">
          <p className="flex items-center gap-1 text-[10px] font-medium text-sky-700 dark:text-sky-300"><GitBranch className="size-3" />关键变量</p>
          <ul className="mt-1 space-y-0.5">
            {(variables.length ? variables : ["暂无"]).map((s, i) => (
              <li key={i} className="text-[11px] text-slate-600 dark:text-slate-300">· {s}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* AI 复盘 */}
      {(results.length > 0 || updates.length > 0) && (
        <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50/50 px-3 py-2 dark:border-violet-900 dark:bg-violet-950/20">
          <p className="flex items-center gap-1 text-[10px] font-medium text-violet-700 dark:text-violet-300"><RotateCcw className="size-3" />AI 复盘（预测 vs 实际）</p>
          {results.map((r, i) => (
            <p key={i} className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
              · 验证 {r.outcome === "confirmed" ? "证实" : r.outcome === "rejected" ? "证伪" : "不确定"}：{r.actualResult}
            </p>
          ))}
          {updates.map((u, i) => (
            <p key={i} className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
              · Score v{u.fromVersion} → v{u.toVersion}：{formatScore(u.before.overall_score)} → {formatScore(u.after.overall_score)}（{u.reason}）
            </p>
          ))}
          <p className="mt-1 text-[10px] text-slate-400">复盘结果已沉淀为商业记忆，供后续决策参考。</p>
        </div>
      )}

      {/* 决策记录 */}
      {history.length > 0 && (
        <div className="mt-3">
          <p className="flex items-center gap-1 text-[10px] font-medium text-slate-400"><ListChecks className="size-3" />决策记录（{history.length}）</p>
          <ul className="mt-1 space-y-1">
            {history.slice(0, 5).map((d) => (
              <li key={d.id} className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>
                  {DECISION_LABELS[d.decision]}
                  {d.differentFromAi ? <span className="ml-1 rounded bg-amber-100 px-1 text-[9px] text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">与AI不同</span> : null}
                </span>
                <span>{formatDate(d.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
