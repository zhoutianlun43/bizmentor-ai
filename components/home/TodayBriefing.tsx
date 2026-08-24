"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { generateMorningBriefing } from "@/lib/agent/loops/briefing";
import { getDecisionRepository, getOpportunityRepository } from "@/lib/repository/provider";
import { MemoryEngine } from "@/lib/memory";
import { LocalMemoryRepository } from "@/lib/memory/repository";
import type { DailyBriefing } from "@/lib/agent/loops/types";

/** 今日经营状态（V0.6.0 MVP Dashboard）：打开自动生成 Morning Briefing */
export function TodayBriefing() {
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const b = await generateMorningBriefing({
          opportunityRepository: getOpportunityRepository(),
          decisionRepository: getDecisionRepository(),
          memory: new MemoryEngine({ memoryRepository: new LocalMemoryRepository(), decisionRepository: getDecisionRepository() }),
        });
        if (!cancelled) setBriefing(b);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "生成今日状态失败");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="text-xs text-slate-400">{error}</p>;
  if (!briefing) return <p className="text-xs text-slate-400">正在生成今日经营状态…</p>;

  const s = briefing.status;
  return (
    <Card className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white dark:from-indigo-700 dark:to-violet-800">
      <p className="text-xs font-medium text-indigo-100">今日经营状态 · {briefing.date}</p>
      <p className="mt-1 text-sm font-semibold leading-snug">{briefing.headline}</p>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        {[
          { label: "商机", value: s.opportunities },
          { label: "研究中", value: s.researching },
          { label: "验证中", value: s.validating },
          { label: "超期", value: s.overdue },
        ].map((x) => (
          <div key={x.label} className="rounded-lg bg-white/10 px-1 py-1.5">
            <p className="text-lg font-bold">{x.value}</p>
            <p className="text-[10px] text-indigo-100">{x.label}</p>
          </div>
        ))}
      </div>
      {briefing.suggestedActions.length > 0 && (
        <ul className="mt-3 space-y-1">
          {briefing.suggestedActions.slice(0, 3).map((a, i) => (
            <li key={i} className="text-[11px] text-indigo-50">· {a}</li>
          ))}
        </ul>
      )}
    </Card>
  );
}