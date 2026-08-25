"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Cpu,
  FileText,
  Globe,
  Lightbulb,
  Menu,
  Pencil,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/providers/ThemeProvider";
import { Markdown } from "@/components/chat/Markdown";
import { BusinessContextBuilder } from "@/lib/context/context-builder";
import { getBusinessRepository, getDecisionRepository, getOpportunityRepository, getProfileRepository } from "@/lib/repository/provider";
import { KnowledgeEngine } from "@/lib/knowledge";
import { LocalKnowledgeRepository } from "@/lib/knowledge/repository";
import { MemoryEngine } from "@/lib/memory";
import { LocalMemoryRepository } from "@/lib/memory/repository";
import { LocalConversationRepository, createBrowserConversationStorage } from "@/lib/conversation";
import { uid } from "@/lib/store/storage";
import type { Conversation } from "@/lib/conversation";
import type { BusinessOSContext } from "@/lib/context/types";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

interface Candidate {
  type: string;
  content: string;
}

/** 快捷功能卡片（V0.8.2）：点击即插入高级指令，触发专业模式 */
const QUICK_ACTIONS = [
  {
    command: "/深度分析",
    title: "深度分析",
    desc: "结构化深挖一个商业问题",
    icon: (
      <>
        <Search className="size-3.5" />
        <Cpu className="size-3.5" />
      </>
    ),
    card: "border-indigo-200 bg-indigo-50/70 hover:border-indigo-300 dark:border-indigo-800 dark:bg-indigo-950/40",
    text: "text-indigo-600 dark:text-indigo-300",
  },
  {
    command: "/商业报告",
    title: "商业报告",
    desc: "生成结构化商业报告",
    icon: (
      <>
        <FileText className="size-3.5" />
        <BarChart3 className="size-3.5" />
      </>
    ),
    card: "border-violet-200 bg-violet-50/70 hover:border-violet-300 dark:border-violet-800 dark:bg-violet-950/40",
    text: "text-violet-600 dark:text-violet-300",
  },
  {
    command: "/市场研究",
    title: "市场研究",
    desc: "扫描市场趋势与机会",
    icon: (
      <>
        <Globe className="size-3.5" />
        <Search className="size-3.5" />
      </>
    ),
    card: "border-cyan-200 bg-cyan-50/70 hover:border-cyan-300 dark:border-cyan-800 dark:bg-cyan-950/40",
    text: "text-cyan-600 dark:text-cyan-300",
  },
  {
    command: "/机会评估",
    title: "机会评估",
    desc: "评估一个机会值不值得做",
    icon: (
      <>
        <Lightbulb className="size-3.5" />
        <TrendingUp className="size-3.5" />
      </>
    ),
    card: "border-amber-200 bg-amber-50/70 hover:border-amber-300 dark:border-amber-800 dark:bg-amber-950/40",
    text: "text-amber-600 dark:text-amber-300",
  },
];

function sortByUpdated(list: Conversation[]): Conversation[] {
  return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function groupKey(iso: string, now: Date): "今天" | "昨天" | "历史" {
  const d = new Date(iso);
  const day = Math.floor(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      86400000,
  );
  if (day <= 0) return "今天";
  if (day === 1) return "昨天";
  return "历史";
}

function relTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return "刚刚";
  if (diff < 3600000) return Math.floor(diff / 60000) + " 分钟前";
  if (diff < 86400000) return Math.floor(diff / 3600000) + " 小时前";
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

/** AI 对话页（V0.8.2）：个人 AI 商业伙伴 + 多会话管理 + Markdown 渲染 */
export default function ChatPage() {
  const [convoRepo] = useState(() => new LocalConversationRepository(createBrowserConversationStorage()));
  const [context, setContext] = useState<BusinessOSContext | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [listOpen, setListOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [savedCandidate, setSavedCandidate] = useState(false);


  // 首次加载：BusinessContext + 会话列表（无会话则自动新建）
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
        // 上下文失败不影响对话
      }
      try {
        let list = sortByUpdated(await convoRepo.list("local-user"));
        let active = list[0];
        if (!active) {
          const now = new Date().toISOString();
          active = { id: uid(), userId: "local-user", title: "新对话", messages: [], createdAt: now, updatedAt: now };
          await convoRepo.save(active);
          list = [active];
        }
        if (!cancelled) {
          setConversations(list);
          setActiveId(active.id);
          setMessages(active.messages.map((m) => ({ role: m.role, content: m.content })));
        }
      } catch {
        // 会话加载失败：保持空
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [convoRepo]);

  const refreshList = useCallback(async () => {
    setConversations(sortByUpdated(await convoRepo.list("local-user")));
  }, [convoRepo]);

  async function newConversation() {
    const now = new Date().toISOString();
    const c: Conversation = { id: uid(), userId: "local-user", title: "新对话", messages: [], createdAt: now, updatedAt: now };
    await convoRepo.save(c);
    await refreshList();
    setActiveId(c.id);
    setMessages([]);
    setInput("");
    setListOpen(false);
    setCandidate(null);
    setSavedCandidate(false);
    setConfirmDeleteId(null);
  }

  function openConversation(id: string) {
    const c = conversations.find((x) => x.id === id);
    if (!c) return;
    setActiveId(id);
    setMessages(c.messages.map((m) => ({ role: m.role, content: m.content })));
    setListOpen(false);
    setCandidate(null);
    setSavedCandidate(false);
    setConfirmDeleteId(null);
  }

  async function rename(id: string, title: string) {
    const list = await convoRepo.list("local-user");
    const c = list.find((x) => x.id === id);
    if (!c) return;
    c.title = title.trim() || "未命名对话";
    await convoRepo.save(c);
    await refreshList();
    setEditingId(null);
  }

  async function removeConvo(id: string) {
    await convoRepo.remove(id);
    await refreshList();
    setConfirmDeleteId(null);
    if (id === activeId) {
      const next = conversations.filter((c) => c.id !== id)[0] ?? null;
      if (next) {
        setActiveId(next.id);
        setMessages(next.messages.map((m) => ({ role: m.role, content: m.content })));
      } else {
        const now = new Date().toISOString();
        const fresh: Conversation = { id: uid(), userId: "local-user", title: "新对话", messages: [], createdAt: now, updatedAt: now };
        await convoRepo.save(fresh);
        await refreshList();
        setActiveId(fresh.id);
        setMessages([]);
      }
    }
  }

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy || !activeId) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError(null);
    setCandidate(null);
    setSavedCandidate(false);
    try {
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

      // 持久化到当前会话（独立上下文；标题由首条用户消息生成）
      const now = new Date().toISOString();
      const firstUser = withReply.find((m) => m.role === "user");
      const autoTitle = firstUser
        ? firstUser.content.slice(0, 16) + (firstUser.content.length > 16 ? "…" : "")
        : "新对话";
      const list = await convoRepo.list("local-user");
      let convo = list.find((c) => c.id === activeId);
      if (!convo) {
        convo = { id: activeId, userId: "local-user", messages: [], createdAt: now, updatedAt: now };
      }
      convo.title = convo.title && convo.title !== "新对话" ? convo.title : autoTitle;
      convo.messages = withReply.map((m) => ({ role: m.role, content: m.content, createdAt: now }));
      convo.updatedAt = now;
      await convoRepo.save(convo);
      await refreshList();

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
  }, [input, busy, messages, context, activeId, convoRepo, refreshList]);

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

  const groups = useMemo(() => {
    const now = new Date();
    const map: Record<string, Conversation[]> = { 今天: [], 昨天: [], 历史: [] };
    for (const c of conversations) {
      const k = groupKey(c.updatedAt, now);
      map[k].push(c);
    }
    return (["今天", "昨天", "历史"] as const).filter((k) => map[k].length > 0).map((k) => ({ label: k, items: map[k] }));
  }, [conversations]);

  return (
    <div className="px-5 pb-4">
      {/* 顶部：品牌标题 + 新建/会话列表/主题 */}
      <header className="flex items-start justify-between gap-2 px-5 pb-2 pt-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">BizMentor AI</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">你的个人商业智能助手</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={newConversation}
            className="inline-flex h-9 items-center gap-1 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition-colors hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <Plus className="size-3.5" />
            新建对话
          </button>
          <button
            onClick={() => setListOpen(true)}
            aria-label="会话列表"
            className="inline-flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <Menu className="size-4" />
          </button>
          <ThemeToggle />
        </div>
      </header>

      {context && (
        <p className="mb-3 mt-1 text-[11px] text-slate-400">
          已加载上下文：{context.personalProfile?.name ?? "未命名"} · {context.businessProfile?.name ?? "未设置经营"} · 长期认知 {context.confirmedKnowledge.length} 条 · 商机 {context.activeProjects.length} 个
        </p>
      )}

      {/* 快捷功能卡片（空会话时展示） */}
      {messages.length === 0 && (
        <div className="mb-3 mt-1 grid grid-cols-2 gap-2">
          {QUICK_ACTIONS.map((a) => (
            <button
              key={a.command}
              onClick={() => setInput(a.command + " ")}
              className={"rounded-2xl border p-3 text-left transition-colors " + a.card}
            >
              <span className={"flex items-center gap-1.5 text-sm font-semibold " + a.text}>
                {a.icon}
                {a.title}
              </span>
              <span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">{a.desc}</span>
            </button>
          ))}
        </div>
      )}

      <Card className="flex min-h-[50vh] flex-col gap-3">
        <div className="flex-1 space-y-3">
          {messages.length === 0 && (
            <p className="text-sm text-slate-500">我是你的个人 AI 商业伙伴。直接问我，或选择上方快捷功能。</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className="space-y-1">
              <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">{m.role === "user" ? "你" : "BizMentor AI"}</p>
              {m.role === "user" ? (
                <div className="rounded-2xl bg-indigo-500 px-3.5 py-2.5 text-sm text-white">
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              ) : (
                <div className="rounded-2xl bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700">
                  <Markdown content={m.content} />
                </div>
              )}
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

      {/* 会话列表抽屉 */}
      {listOpen && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setListOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">会话</h2>
              <button onClick={() => setListOpen(false)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="size-4" />
              </button>
            </div>
            <Button size="sm" variant="secondary" className="m-3" onClick={newConversation}>
              <Plus className="size-4" />
              新建对话
            </Button>
            <div className="flex-1 overflow-y-auto px-2 pb-4">
              {groups.map((g) => (
                <div key={g.label} className="mt-2">
                  <p className="px-2 text-[11px] font-medium text-slate-400">{g.label}</p>
                  {g.items.map((c) => (
                    <div
                      key={c.id}
                      className={
                        "rounded-xl px-2 py-2 text-sm " +
                        (c.id === activeId
                          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                          : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800")
                      }
                    >
                      {editingId === c.id ? (
                        <input
                          autoFocus
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={() => rename(c.id, editTitle)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") rename(c.id, editTitle);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="w-full rounded-md border border-indigo-300 bg-white px-1.5 py-0.5 text-xs outline-none dark:bg-slate-800"
                        />
                      ) : (
                        <>
                          <button className="block w-full truncate text-left" onClick={() => openConversation(c.id)} title={c.title ?? "未命名对话"}>
                            {c.title ?? "未命名对话"}
                          </button>
                          <div className="mt-0.5 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400">{relTime(c.updatedAt)}</span>
                            <span className="flex gap-1">
                              <button
                                onClick={() => {
                                  setEditingId(c.id);
                                  setEditTitle(c.title ?? "");
                                }}
                                className="rounded p-1 text-slate-400 hover:text-indigo-500"
                                aria-label="重命名"
                              >
                                <Pencil className="size-3" />
                              </button>
                              {confirmDeleteId === c.id ? (
                                <button onClick={() => removeConvo(c.id)} className="rounded bg-red-50 px-1.5 text-[10px] font-medium text-red-600">
                                  确认删除?
                                </button>
                              ) : (
                                <button onClick={() => setConfirmDeleteId(c.id)} className="rounded p-1 text-slate-400 hover:text-red-500" aria-label="删除">
                                  <Trash2 className="size-3" />
                                </button>
                              )}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ))}
              {groups.length === 0 && <p className="px-2 py-4 text-center text-xs text-slate-400">暂无会话</p>}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}


