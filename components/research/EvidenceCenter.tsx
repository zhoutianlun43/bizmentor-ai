/**
 * 商业证据中心 EvidenceCenter（V0.9.1）。
 * 每个研究维度展示：数据来源 / 来源类型 / 数据时间 / 数据可信度 / AI 推理比例。
 * 数据支持比例 = FACT（有真实来源）证据占比；其余为 AI 推理。
 */
import { Database, Link2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { ResearchSection } from "@/lib/research";
import type { EvidenceItem } from "@/lib/research";

const SOURCE_TYPE_LABELS: Record<string, string> = {
  USER_PROVIDED: "用户资料",
  EXTERNAL_WEB: "外部网页",
  OFFICIAL_SOURCE: "官方来源",
  PLATFORM_DATA: "平台数据",
  UPLOADED_DOCUMENT: "上传文档",
};

const CRED_LEVEL: Record<string, string> = { high: "高", medium: "中", low: "低", unverified: "未验证" };

/** 数据支持比例（0-1）：FACT（有真实来源）为数据支持 */
function coverage(items: EvidenceItem[]): { data: number; ai: number } {
  if (!items || items.length === 0) return { data: 0, ai: 1 };
  const data = items.filter((e) => e.evidenceClass === "FACT").length / items.length;
  return { data, ai: 1 - data };
}

function RatioBar({ data, ai }: { data: number; ai: number }) {
  const d = Math.round(data * 100);
  const a = Math.round(ai * 100);
  return (
    <div>
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div className="bg-emerald-500" style={{ width: d + "%" }} />
        <div className="bg-amber-400" style={{ width: a + "%" }} />
      </div>
      <p className="mt-1 text-[10px] text-slate-400">
        数据支持 <span className="font-semibold text-emerald-600 dark:text-emerald-400">{d}%</span>
        <span className="mx-1">·</span>
        AI 推理 <span className="font-semibold text-amber-600 dark:text-amber-400">{a}%</span>
      </p>
    </div>
  );
}

export function EvidenceCenter({ sections }: { sections: ResearchSection[] }) {
  const allEvidence = sections.flatMap((s) => s.evidence ?? []);
  const overall = coverage(allEvidence);

  return (
    <Card className="mt-3">
      <div className="flex items-center gap-1.5">
        <Database className="size-4 text-indigo-500" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">商业证据中心</h3>
        <span className="ml-auto text-[10px] text-slate-400">{sections.length} 个维度</span>
      </div>

      <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
        <p className="text-[10px] font-medium text-slate-400">整体证据覆盖</p>
        <div className="mt-1.5">
          <RatioBar data={overall.data} ai={overall.ai} />
        </div>
      </div>

      <div className="mt-3 space-y-2.5">
        {sections.map((s) => {
          const ev = s.evidence ?? [];
          const c = coverage(ev);
          const sources = ev
            .map((e) => e.sourceRef)
            .filter((r): r is NonNullable<typeof r> => Boolean(r && (r.title || r.url)));
          return (
            <div key={s.area} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{s.title}</p>
                <span className="text-[10px] text-slate-400">置信度 {Math.round(s.confidence * 100)}%</span>
              </div>
              <div className="mt-2">
                <RatioBar data={c.data} ai={c.ai} />
              </div>

              {sources.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {sources.slice(0, 4).map((r, i) => (
                    <li key={i} className="flex items-start gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                      <Link2 className="mt-0.5 size-3 shrink-0" />
                      <span className="min-w-0">
                        {r.title ?? r.url ?? "来源"}
                        <span className="text-slate-300 dark:text-slate-600">
                          {" "}· {SOURCE_TYPE_LABELS[r.sourceType] ?? r.sourceType}
                          {r.retrievedAt ? ` · 数据时间 ${r.retrievedAt.slice(0, 10)}` : ""}
                          {r.credibility ? ` · 可信度 ${CRED_LEVEL[r.credibility.level] ?? r.credibility.level}` : ""}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[10px] text-amber-600 dark:text-amber-400">该维度暂无真实数据来源，结论以 AI 推理为主，需验证。</p>
              )}

              {ev.length > 0 ? (
                <ul className="mt-2 space-y-0.5">
                  {ev.slice(0, 3).map((e, i) => (
                    <li key={i} className="text-[11px] text-slate-600 dark:text-slate-300">
                      · {e.claim}
                    </li>
                  ))}
                  {ev.length > 3 ? <li className="text-[10px] text-slate-400">…共 {ev.length} 条证据</li> : null}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
