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
import { LocalConversationRepository, createBrowserConversationStorage } from "@/lib/conversation";
import { uid } from "@/lib/store/storage";
import type { BusinessOSContext } from "@/lib/context/types";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

interface Candidate {
  type: string;
  content: string;
}

/** AI 对话页（V0.6.1）：历史持久化 + BusinessContext + AI 认知候选确认 */
export default function ChatPage() {
  const [convoRepo] = useState(() => new LocalConversationRepository(createBrowserConversationStorage()));
  const [context, setContext] = useState<BusinessOSContext | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [savedCandidate, setSavedCandidate] = useState(false);

  // 恢复上下文 + 最近会话
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
        const conversations = await convoRepo.list("local-user");
        const latest = conversations[0];
        if (latest && latest.messages.length > 0 && !cancelled) {
          setMessages(latest.messages.map((m) => ({ role: m.role, content: m.content })));
        }
      } catch {
        // 忽略：上下文/历史失败不影响对话
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [convoRepo]);

  const persist = useCallback(
    async (next: Msg[]) => {
      const now = new Date().toISOString();
      const list = await convoRepo.list("local-user");
      let convo = list[0];
      if (!convo) {
        convo = { id: uid(), userId: "local-user", messages: [], createdAt: now, updatedAt: now };
      }
      convo.messages = next.map((m) => ({ role: m.role, content: m.content, createdAt: now }));
      convo.updatedAt = now;
      await convoRepo.save(convo);
    },
    [convoRepo],
  );

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError(null);
    setCandidate(null);
    setSavedCandidate(false);
    try {
      // 历史摘要：只发送最近 10 条 + 首条摘要占位（避免过长）
      const history: Msg[] = next.slice(-10);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, context }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "请求失败");
      const withReply: Msg[] = [...next, { role: "assistant", content: data.content }];
      setMessages(withReply);
      await persist(withReply);
      // 尝试提炼学习候选
      try {
        const kr = await fetch("/api/knowledge-candidate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: withReply }),
        });
        const kd = await kr.json();
        if (kd.found && kd.content) setCandidate({ type: kd.type, content: kd.content });
      } catch {
        // 候选失败不影响对话
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "请求失败");
    } finally {
      setBusy(false);
    }
  }, [input, busy, messages, context, persist]);

  async function confirmCandidate() {
    if (!candidate) return;
    const engine = new KnowledgeEngine(new LocalKnowledgeRepository());
    await engine.save({
      id: uid(),
      userId: "local-user",
      type: (candidate.type as "habit" | "judgment_style" | "industry_experience" | "success_case" | "failure_case") ?? "habit",
      content: candidate.content,
      tags: [],
      source: "ai_suggestion",
      confidence: 0.6,
      confirmed: true,
      createdAt: new Date().toISOString(),
    });
    setSavedCandidate(true);
  }

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

      {candidate && !savedCandidate && (
        <Card className="mt-3 border-amber-300">
          <p className="text-xs text-slate-500">AI 发现一条可能值得记住的信息：</p>
          <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">「{candidate.content}」</p>
          <Button onClick={confirmCandidate} variant="secondary" size="sm" className="mt-2">确认加入 AI 认知</Button>
        </Card>
      )}
      {savedCandidate && <p className="mt-2 text-xs text-emerald-600">已加入你的长期认知。</p>}
      <p className="mt-3 text-center text-[11px] text-slate-400">
        <a href="/knowledge" className="text-indigo-500">查看我的AI认知</a> · <a href="/skills" className="text-indigo-500">技能中心</a>
      </p>
    </div>
  );
}