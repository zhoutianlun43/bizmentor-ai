"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Radar, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useOpportunities } from "@/lib/opportunity/hooks/use-opportunities";
import { buildScanHistory, parseRadarNotes } from "@/lib/radar/service";
import { uid } from "@/lib/store/storage";
import type { OpportunityStatus, RadarFinding } from "@/lib/types";

const SUGGESTION_STYLE: Record<RadarFinding["suggestion"], string> = {
  值得研究: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  继续观察: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  不建议进入: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  discovered: { label: "已发现·待处理", cls: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" },
  reviewing: { label: "已收藏", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  researching: { label: "研究中", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
};

interface FindingItem {
  f: RadarFinding;
  id?: string;
  status?: string;
}

/** AI 商业雷达（V0.8；V1.2.1 持久化）：扫描结果自动写入数据库，长期机会资产库 */
export default function RadarPage() {
  const router = useRouter();
  const { opportunities, list, create, update } = useOpportunities();
  const [findings, setFindings] = useState<FindingItem[]>([]);
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);

  // 首次加载：拉取商机（含历史 AI 发现）
  useEffect(() => {
    list();
  }, [list]);

  const totalAI = useMemo(() => opportunities.filter((o) => o.source === "ai").length, [opportunities]);
  const scanHistory = useMemo(() => buildScanHistory(opportunities), [opportunities]);

  // 再次进入页面：自动恢复最近一次扫描结果（已保存的机会）
  useEffect(() => {
    if (opportunities.length === 0 || findings.length > 0) return;
    (async () => {
      const latest = scanHistory[0];
      if (!latest) return;
      const items: FindingItem[] = opportunities
        .filter((o) => o.scanId === latest.scanId)
        .map((o) => {
          const p = parseRadarNotes(o.notes);
          return { f: o.radar ?? { name: o.name, description: o.description, source: "AI扫描", category: p.category ?? "未分类", marketSize: "", growth: "", competition: "", entryBarrier: "", profitability: "", score: p.score ?? 0, suggestion: p.suggestion ?? "继续观察", scannedAt: o.createdAt }, id: o.id, status: o.status };
        });
      if (items.length > 0) {
        setFindings(items);
        setSummary(`最近扫描（${latest.scannedAt.slice(0, 10)}）发现 ${latest.found} 个机会`);
      }
    })();
  }, [opportunities, scanHistory, findings.length]);

  async function scan() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const sid = uid();
      const res = await fetch("/api/radar/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanId: sid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "扫描失败");
      const savedMap = new Map<number, string>((data.saved ?? []).map((s: { index: number; id: string }) => [s.index, s.id]));
      setFindings(data.findings.map((f: RadarFinding, i: number) => ({ f, id: savedMap.get(i), status: "discovered" })));
      setSummary(data.summary ?? "");
      await list();
    } catch (e) {
      setError(e instanceof Error ? e.message : "扫描失败");
    } finally {
      setBusy(false);
    }
  }

  async function markStatus(index: number, status: OpportunityStatus) {
    const item = findings[index];
    if (!item) return;
    setSavingIndex(index);
    try {
      let savedId = item.id;
      if (savedId) {
        await update(savedId, { status });
      } else {
        // 兜底：本地保存（未配置数据库时）
        const created = await create({
          name: item.f.name,
          description: item.f.description,
          source: "ai",
          status,
          notes: `[AI雷达] ${item.f.category} · 评分 ${item.f.score} · ${item.f.suggestion}`,
          radar: item.f,
        });
        if (created) savedId = created.id;
      }
      setFindings((prev) => prev.map((it, i) => (i === index ? { ...it, id: savedId, status } : it)));
      if (status === "researching" && savedId) router.push(`/opportunities/${savedId}`);
      await list();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setSavingIndex(null);
    }
  }

  return (
    <div className="px-5 pb-4">
      <AppHeader title="AI 商业雷达" subtitle="AI 主动探索全球市场机会 · 自动保存为长期机会资产" />

      <Button onClick={scan} disabled={busy} className="mt-2 w-full">
        {findings.length > 0 ? <RefreshCw className="size-4" /> : <Radar className="size-4" />}
        {busy ? "扫描中…" : findings.length > 0 ? "重新扫描全球商业机会" : "开始扫描全球商业机会"}
      </Button>

      {/* 统计 */}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Card className="py-2 text-center">
          <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{findings.length}</p>
          <p className="text-[10px] text-slate-400">本次扫描发现</p>
        </Card>
        <Card className="py-2 text-center">
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{totalAI}</p>
          <p className="text-[10px] text-slate-400">累计 AI 发现机会</p>
        </Card>
      </div>

      {summary && <p className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">{summary}</p>}
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      {/* 扫描历史 */}
      {scanHistory.length > 0 && (
        <details className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
          <summary className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Clock className="size-3.5" />
            扫描历史（{scanHistory.length} 次 · 全部已保存）
          </summary>
          <ul className="mt-2 space-y-1">
            {scanHistory.map((h) => (
              <li key={h.scanId} className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>{h.scannedAt.slice(0, 10)} · 全球商业机会扫描</span>
                <span>发现 {h.found} · 进入研究 {h.researched}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* 机会卡片（已自动保存） */}
      <div className="mt-3 space-y-3">
        {findings.map((item, i) => (
          <Card key={i} className={item.status === "researching" ? "opacity-70" : ""}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.f.name}</p>
                <span className="mt-0.5 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">{item.f.category}</span>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{item.f.score}</p>
                <span className={`rounded px-1.5 py-0.5 text-[10px] ${SUGGESTION_STYLE[item.f.suggestion] ?? ""}`}>{item.f.suggestion}</span>
              </div>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{item.f.description}</p>
            <p className="mt-1 text-[11px] text-slate-400">来源/逻辑：{item.f.source}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_LABEL[item.status ?? "discovered"]?.cls ?? ""}`}>
                {STATUS_LABEL[item.status ?? "discovered"]?.label ?? "已发现"}
              </span>
              {item.status !== "researching" && (
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" className="flex-1" disabled={savingIndex !== null} onClick={() => markStatus(i, item.status === "reviewing" ? "discovered" : "reviewing")}>
                    {item.status === "reviewing" ? <Trash2 className="size-3.5" /> : <Sparkles className="size-3.5" />}
                    {savingIndex === i ? "处理中…" : item.status === "reviewing" ? "取消收藏" : "收藏"}
                  </Button>
                  <Button size="sm" className="flex-1" disabled={savingIndex !== null} onClick={() => markStatus(i, "researching")}>
                    {savingIndex === i ? "处理中…" : "进入研究"}
                  </Button>
                </div>
              )}
              {item.status === "researching" && (
                <a href={`/opportunities/${item.id}`} className="text-[11px] text-indigo-500 underline">查看研究 →</a>
              )}
            </div>
          </Card>
        ))}
        {findings.length === 0 && !busy && (
          <Card className="text-center">
            <p className="text-sm text-slate-500">点击上方按钮，AI 将扫描科技 / 消费 / 服务 / 制造 / 贸易 / 互联网 / AI 应用等领域的市场机会，并自动保存到机会池。</p>
          </Card>
        )}
      </div>
    </div>
  );
}
