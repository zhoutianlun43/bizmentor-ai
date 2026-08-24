"use client";

import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { KnowledgeEngine } from "@/lib/knowledge";
import { LocalKnowledgeRepository } from "@/lib/knowledge/repository";
import type { KnowledgeRecord, KnowledgeType } from "@/lib/knowledge/types";

const TYPE_LABELS: Record<KnowledgeType, string> = {
  habit: "我的偏好",
  judgment_style: "我的判断方式",
  industry_experience: "我的经验",
  success_case: "我的成功案例",
  failure_case: "我的失败案例",
};

/** 我的AI认知（V0.6.0 MVP）：确认/删除/新增 + Learning Center（复盘→候选→确认） */
export default function KnowledgePage() {
  const [engine] = useState(() => new KnowledgeEngine(new LocalKnowledgeRepository()));
  const [records, setRecords] = useState<KnowledgeRecord[]>([]);
  const [candidates, setCandidates] = useState<KnowledgeRecord[]>([]);
  const [newContent, setNewContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const all = await engine.list();
    setRecords(all);
    setCandidates(all.filter((r) => !r.confirmed));
  }, [engine]);

  useEffect(() => {
    let cancelled = false;
    engine.list().then((all) => {
      if (!cancelled) {
        setRecords(all);
        setCandidates(all.filter((r) => !r.confirmed));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [engine]);

  async function confirm(id: string) {
    await engine.confirm(id);
    await load();
  }
  async function remove(id: string) {
    await engine.remove(id);
    await load();
  }
  async function add() {
    if (!newContent.trim()) return;
    await engine.captureFromUserInput({ content: newContent.trim(), type: "habit" });
    setNewContent("");
    await load();
  }
  async function runReview() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/review", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "复盘失败");
      // 把候选存入本地（未确认），等待用户确认
      for (const c of data.knowledgeCandidates ?? []) {
        await engine.save({ id: c.id, userId: "local-user", type: c.type, content: c.content, tags: [], source: c.source ?? "review", confidence: 0.6, confirmed: false, createdAt: new Date().toISOString() });
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "复盘失败");
    } finally {
      setBusy(false);
    }
  }

  const confirmed = records.filter((r) => r.confirmed);
  const groups = (Object.keys(TYPE_LABELS) as KnowledgeType[]).map((t) => ({ type: t, items: confirmed.filter((r) => r.type === t) }));

  return (
    <div className="px-5 pb-4">
      <AppHeader title="我的AI认知" subtitle="AI 只在你确认后学习" />
      <Card className="mt-2">
        <h3 className="text-sm font-semibold">Learning Center（今晚复盘）</h3>
        <p className="mt-1 text-xs text-slate-500">AI 总结今日经验 → 生成候选 → 你确认后才进入长期认知。</p>
        <Button onClick={runReview} disabled={busy} className="mt-2 w-full">{busy ? "复盘中…" : "开始复盘"}</Button>
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      </Card>

      <Card className="mt-3">
        <h3 className="text-sm font-semibold">新增认知</h3>
        <div className="mt-2 flex gap-2">
          <input value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="例如：我主做女装，偏好低库存" className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-900" />
          <Button onClick={add}>新增</Button>
        </div>
      </Card>

      {candidates.length > 0 && (
        <Card className="mt-3 border-amber-300">
          <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400">待确认候选（AI 建议）</h3>
          <div className="mt-2 space-y-2">
            {candidates.map((c) => (
              <div key={c.id} className="rounded-xl bg-amber-50 p-2 text-xs dark:bg-amber-900/20">
                <p className="font-medium text-amber-800 dark:text-amber-200">[{TYPE_LABELS[c.type] ?? c.type}] {c.content}</p>
                <button onClick={() => confirm(c.id)} className="mt-1 rounded-md bg-amber-500 px-2 py-1 text-white">确认</button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <p className="mt-3 text-center text-[11px] text-slate-400"><a href="/profile" className="text-indigo-500">返回我的</a> · <a href="/chat" className="text-indigo-500">去问 AI</a></p>
      <div className="mt-3 space-y-3">
        {groups.map((g) => (
          <Card key={g.type}>
            <h3 className="text-sm font-semibold">{TYPE_LABELS[g.type]}</h3>
            {g.items.length === 0 && <p className="mt-1 text-xs text-slate-400">暂无</p>}
            <div className="mt-2 space-y-1.5">
              {g.items.map((r) => (
                <div key={r.id} className="flex items-start justify-between gap-2 text-xs">
                  <span className="flex-1 text-slate-700 dark:text-slate-200">{r.content}</span>
                  <button onClick={() => remove(r.id)} className="text-red-500">删除</button>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}