"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { generateMorningBriefing } from "@/lib/agent/loops/briefing";
import { getDecisionRepository, getOpportunityRepository } from "@/lib/repository/provider";
import { MemoryEngine } from "@/lib/memory";
import { LocalMemoryRepository } from "@/lib/memory/repository";
import { KnowledgeEngine } from "@/lib/knowledge";
import { LocalKnowledgeRepository } from "@/lib/knowledge/repository";
import type { DailyBriefing } from "@/lib/agent/loops/types";

interface Suggestion {
  text: string;
  why: string[];
  sources: string[];
}

/** AI Daily Assistant（V0.6.1）：今日关注/风险/下一步 + 为什么这样建议（来源可追溯） */
export function DailyAssistant() {
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [knowledge, setKnowledge] = useState<string[]>([]);
  const [patterns, setPatterns] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const deps = {
          opportunityRepository: getOpportunityRepository(),
          decisionRepository: getDecisionRepository(),
          memory: new MemoryEngine({ memoryRepository: new LocalMemoryRepository(), decisionRepository: getDecisionRepository() }),
        };
        const [b, k] = await Promise.all([
          generateMorningBriefing(deps),
          new KnowledgeEngine(new LocalKnowledgeRepository()).confirmed(),
        ]);
        if (!cancelled) {
          setBriefing(b);
          setKnowledge(k.map((r) => `[${r.type}] ${r.content}`));
          setPatterns(b.memoryInsights);
        }
      } catch {
        // 忽略
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!briefing) return null;

  const risks = briefing.anomalies.slice(0, 3).map((a) => a.message);
  const suggestions: Suggestion[] = [
    ...briefing.suggestedActions.slice(0, 3).map((text) => ({
      text,
      why: [
        briefing.anomalies.some((a) => a.message === text.replace(/^处理|^为|^查看|^评估/, "")) ? "来自今日异常检测" : "来自今日状态与优先级",
        ...(patterns.length ? ["参考历史模式验证率"] : []),
        ...(knowledge.length ? ["结合你的长期认知"] : []),
      ],
      sources: ["今日简报"],
    })),
  ];
  if (risks.length > 0) {
    suggestions.unshift({
      text: `今日有 ${risks.length} 项需要关注：${risks[0]}`,
      why: ["来自异常检测（超期/失败/评分下降/证伪）", ...(patterns.length ? ["历史中类似情况通常需及时处理"] : [])],
      sources: ["异常检测"],
    });
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">AI Daily Assistant</h3>
        <span className="text-[10px] text-slate-400">今日 {briefing.date}</span>
      </div>
      <div className="mt-2 space-y-2">
        {suggestions.map((s, i) => (
          <div key={i} className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
            <p className="text-xs font-medium text-slate-800 dark:text-slate-100">{s.text}</p>
            <button onClick={() => setExpanded(expanded === i ? null : i)} className="mt-1 text-[11px] text-indigo-500">
              {expanded === i ? "收起" : "为什么这样建议"}
            </button>
            {expanded === i && (
              <div className="mt-1.5 space-y-1 border-t border-slate-200 pt-1.5 dark:border-slate-700">
                {s.why.map((w, j) => (
                  <p key={j} className="text-[11px] text-slate-500">· {w}</p>
                ))}
                <p className="text-[10px] text-slate-400">来源：{s.sources.join(" / ")} · 认知 {knowledge.length} 条 · 模式 {patterns.length} 条</p>
              </div>
            )}
          </div>
        ))}
        {suggestions.length === 0 && <p className="text-xs text-slate-400">暂无建议，先和 AI 聊聊或新增商机。</p>}
      </div>
      <a href="/chat" className="mt-2 block rounded-xl bg-indigo-50 px-3 py-2 text-center text-xs font-medium text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">去问 AI 深入聊聊</a>
    </Card>
  );
}