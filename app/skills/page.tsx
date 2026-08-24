"use client";

import { useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const SKILLS = [
  { id: "product_selection", name: "选品分析助手", description: "辅助选品：市场机会/用户需求/竞争/风险/历史案例", hint: "例如：法式针织开衫，价格带 100-200" },
  { id: "competitor_analysis", name: "竞品拆解助手", description: "拆解竞品：定位/定价/内容/流量/优势/弱点/可复制策略", hint: "例如：某头部女装品牌，平台抖音" },
];

/** 技能中心（V0.6.0 MVP）：用户点击技能 → /api/skill → SkillOutput */
export default function SkillsPage() {
  const [active, setActive] = useState<string>(SKILLS[0].id);
  const [inputText, setInputText] = useState("");
  const [output, setOutput] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function invoke() {
    setBusy(true);
    setError(null);
    setOutput(null);
    try {
      const res = await fetch("/api/skill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill: active, input: { productIdea: inputText, category: "女装" } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "技能调用失败");
      setOutput(data.output);
    } catch (e) {
      setError(e instanceof Error ? e.message : "调用失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-5 pb-4">
      <AppHeader title="技能中心" subtitle="Agent 商业能力" />
      <div className="mt-2 space-y-2">
        {SKILLS.map((s) => (
          <Card key={s.id} className={`cursor-pointer ${active === s.id ? "border-indigo-400" : ""}`} onClick={() => { setActive(s.id); setOutput(null); }}>
            <p className="text-sm font-semibold">{s.name}</p>
            <p className="text-xs text-slate-500">{s.description}</p>
          </Card>
        ))}
      </div>
      <Card className="mt-3">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={SKILLS.find((s) => s.id === active)?.hint ?? "输入需求"}
          className="min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-900"
        />
        <Button onClick={invoke} disabled={busy} className="mt-2 w-full">{busy ? "分析中…" : "开始分析"}</Button>
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        {output !== null && (
          <pre className="mt-3 max-h-96 overflow-auto rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {JSON.stringify(output, null, 2)}
          </pre>
        )}
      </Card>
    </div>
  );
}