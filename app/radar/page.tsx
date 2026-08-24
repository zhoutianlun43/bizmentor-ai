"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Radar } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useOpportunities } from "@/lib/opportunity/hooks/use-opportunities";
import type { RadarFinding } from "@/lib/types";

const SUGGESTION_STYLE: Record<RadarFinding["suggestion"], string> = {
  值得研究: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  继续观察: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  不建议进入: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

/** AI 商业雷达（V0.8）：AI 主动探索全球市场机会 → 机会卡片 → 收藏/进入研究/忽略 */
export default function RadarPage() {
  const router = useRouter();
  const { create } = useOpportunities();
  const [findings, setFindings] = useState<RadarFinding[] | null>(null);
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<number>>(new Set());

  async function scan() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/radar/scan", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "扫描失败");
      setFindings(data.findings ?? []);
      setSummary(data.summary ?? "");
      setSaved(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "扫描失败");
    } finally {
      setBusy(false);
    }
  }

  async function save(f: RadarFinding, index: number, goResearch: boolean) {
    const opp = await create({
      name: f.name,
      description: f.description,
      source: "ai",
      notes: `[AI雷达] ${f.category} · 评分 ${f.score} · ${f.suggestion}`,
      radar: f,
    });
    if (opp) {
      setSaved((s) => new Set(s).add(index));
      if (goResearch) router.push(`/opportunities/${opp.id}`);
    }
  }

  return (
    <div className="px-5 pb-4">
      <AppHeader title="AI 商业雷达" subtitle="AI 主动探索全球市场机会" />
      <Button onClick={scan} disabled={busy} className="mt-2 w-full">
        <Radar className="size-4" />
        {busy ? "扫描中…" : "开始扫描全球商业机会"}
      </Button>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      {summary && <p className="mt-3 text-sm font-semibold text-indigo-600 dark:text-indigo-400">{summary}</p>}

      <div className="mt-3 space-y-3">
        {(findings ?? []).map((f, i) => (
          <Card key={i} className={saved.has(i) ? "opacity-60" : ""}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{f.name}</p>
                <span className="mt-0.5 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">{f.category}</span>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{f.score}</p>
                <span className={`rounded px-1.5 py-0.5 text-[10px] ${SUGGESTION_STYLE[f.suggestion]}`}>{f.suggestion}</span>
              </div>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{f.description}</p>
            <p className="mt-1 text-[11px] text-slate-400">来源/逻辑：{f.source}</p>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
              <span>市场规模：{f.marketSize}</span>
              <span>增长：{f.growth}</span>
              <span>竞争：{f.competition}</span>
              <span>进入门槛：{f.entryBarrier}</span>
              <span className="col-span-2">盈利可能性：{f.profitability}</span>
            </div>
            {!saved.has(i) && (
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="secondary" className="flex-1" onClick={() => save(f, i, false)}>收藏</Button>
                <Button size="sm" className="flex-1" onClick={() => save(f, i, true)}>进入研究</Button>
                <Button size="sm" variant="ghost" className="flex-1" onClick={() => setFindings((list) => list!.filter((_, x) => x !== i))}>忽略</Button>
              </div>
            )}
            {saved.has(i) && <p className="mt-2 text-xs text-emerald-600">已加入商机列表，可进入研究流程</p>}
          </Card>
        ))}
        {findings !== null && findings.length === 0 && <p className="text-xs text-slate-400">本次扫描未发现机会，可重试。</p>}
        {findings === null && !busy && (
          <Card className="text-center">
            <p className="text-sm text-slate-500">点击上方按钮，AI 将扫描科技 / 消费 / 服务 / 制造 / 贸易 / 互联网 / AI 应用等领域的市场机会。</p>
          </Card>
        )}
      </div>
    </div>
  );
}