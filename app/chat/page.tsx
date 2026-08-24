"use client";

import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BusinessContextBuilder } from "@/lib/context/context-builder";
import { getBusinessRepository, getDecisionRepository, getOpportunityRepository, getProfileRepository } from "@/lib/repository/provider";
import { KnowledgeEngine } from "@/lib/knowledge";
import { LocalKnowledgeRepository } from "@/lib/knowledge/repository";
import { MemoryEngine } from "@/lib/memory";
import { LocalMemoryRepository } from "@/lib/memory/repository";
import type { BusinessOSContext } from "@/lib/context/types";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

/** AI 对话页（V0.6.0 MVP）：Chat → /api/chat → LLM（自动加载 BusinessContext） */
export default function ChatPage() {
  const [context, setContext] = useState<BusinessOSContext | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const builder = new BusinessContextBuilder({
          profileRepository: getProfileRepository(),
          businessRepository: getBusinessRepository(),
          opportunityRepository: getOpportunityRepository(),
          knowledge: new KnowledgeEngine(new LocalKnowledgeRepository()),
          memory: new MemoryEngine({ memoryRepository: new LocalMemoryRepository(), decisionRepository: getDecisionRepository() }),
        });
        const ctx = await builder.build();
        if (!cancelled) setContext(ctx);
      } catch {
        // 上下文构建失败不影响对话
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, context }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "请求失败");
      setMessages((m) => [...m, { role: "assistant", content: data.content }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "请求失败");
    } finally {
      setBusy(false);
    }
  }, [input, busy, messages, context]);

  return (
    <div className="px-5 pb-4">
      <AppHeader title="问 AI" subtitle="你的 Business Agent" />
      {context && (
        <p className="mb-3 text-[11px] text-slate-400">
          已加载上下文：{context.personalProfile?.name ?? "未命名"} · {context.businessProfile?.name ?? "未设置经营"} · 长期认知 {context.confirmedKnowledge.length} 条 · 商机 {context.activeProjects.length} 个
        </p>
      )}
      <Card className="flex min-h-[50vh] flex-col gap-3">
        <div className="flex-1 space-y-2">
          {messages.length === 0 && (
            <p className="text-sm text-slate-500">问 AI：例如「分析一下我现在应该做什么」或「帮我评估这个想法」。</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`rounded-xl px-3 py-2 text-sm ${m.role === "user" ? "bg-indigo-50 text-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-100" : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"}`}>
              {m.content}
            </div>
          ))}
          {busy && <p className="text-xs text-slate-400">AI 思考中…</p>}
        </div>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="输入你的问题…"
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900"
          />
          <Button onClick={send} disabled={busy || !input.trim()}>发送</Button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </Card>
    </div>
  );
}