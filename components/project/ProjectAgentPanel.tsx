/**
 * 项目 AI 主理人面板（V1.5）：项目认知档案 + 绑定项目的对话 + 长期记忆 + URL/文本分析 + 复盘。
 */
"use client";
import { useCallback, useEffect, useState } from "react";
import { Bot, Brain, FileUp, ImageIcon, Link2, RotateCcw, Send } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StructuredReply } from "@/components/agent-output/StructuredReply";
import { AGENT_MODE_LABELS } from "@/lib/project-agent/types";
import type { StructuredOutput } from "@/lib/agent-output/types";
import type { AgentMode, ProjectCognitionProfile, ProjectMemory } from "@/lib/project-agent/types";

const MODES: AgentMode[] = ["advisor", "manager", "investor", "operations"];

interface Msg { role: "user" | "assistant"; content?: string; structured?: StructuredOutput; }
interface KnowledgeChips { newViews: boolean; newDecisions: boolean; newData: boolean; newRisks: boolean; }

export function ProjectAgentPanel({ projectId }: { projectId: string }) {
  const [cognition, setCognition] = useState<ProjectCognitionProfile | null>(null);
  const [memory, setMemory] = useState<ProjectMemory | null>(null);
  const [mode, setMode] = useState<AgentMode>("manager");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [lastKnowledge, setLastKnowledge] = useState<KnowledgeChips | null>(null);
  const [input, setInput] = useState("");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/project-agent?projectId=${projectId}`, { cache: "no-store" });
      const data = await res.json();
      if (data.cognition) {
        setCognition(data.cognition);
        setMemory(data.memory);
      } else if (data.error) {
        setError(data.message ?? data.error);
      }
    } catch {
      // 忽略
    }
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/project-agent?projectId=${projectId}`, { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && data.cognition) {
          setCognition(data.cognition);
          setMemory(data.memory);
        }
      } catch {
        // 忽略
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/project-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "chat", projectId, message: text, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "失败");
      setMessages((m) => [...m, data.structured ? { role: "assistant", structured: data.structured } : { role: "assistant", content: data.reply ?? data.structured?.title ?? "" }]);
      setLastKnowledge(data.knowledge ?? null);
      await load();
    } catch (e) {
      setError((e as Error).message ?? "失败");
    } finally {
      setBusy(false);
    }
  }

  function handleImage() {
    setMessages((m) => [...m, { role: "assistant", content: "图片分析需要视觉模型（当前 DeepSeek 暂不支持图片）。请把图片/截图中的关键文字（价格、卖点、评论等）粘贴到「分析资料」输入框，我会帮你分析并写入项目记忆。" }]);
  }

  async function analyzeUrl() {
    if (!url.trim() || busy) return;
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/project-agent", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "analyze-url", projectId, url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "失败");
      setMessages((m) => [...m, { role: "assistant", content: `🔗 网页分析：${data.analysis}` }]);
      setUrl("");
      await load();
    } catch (e) { setError((e as Error).message ?? "失败"); } finally { setBusy(false); }
  }

  async function analyzeText() {
    if (!text.trim() || busy) return;
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/project-agent", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "analyze-text", projectId, text: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "失败");
      setMessages((m) => [...m, { role: "assistant", content: `📄 资料分析：${data.analysis}` }]);
      setText("");
      await load();
    } catch (e) { setError((e as Error).message ?? "失败"); } finally { setBusy(false); }
  }

  async function review() {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/project-agent", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "review", projectId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "失败");
      setMessages((m) => [...m, { role: "assistant", content: `📊 项目复盘：\n${data.review}` }]);
      await load();
    } catch (e) { setError((e as Error).message ?? "失败"); } finally { setBusy(false); }
  }

  return (
    <div className="mt-3 space-y-3">
      {/* 项目认知档案 */}
      {cognition && (
        <Card className="border-violet-200 dark:border-violet-800">
          <div className="flex items-center gap-1.5">
            <Bot className="size-4 text-violet-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">AI 项目主理人</h4>
            <span className="ml-auto text-[10px] text-slate-400">已读取项目全部资料</span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{cognition.aiIdentity}</p>
          <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
            <p><b>当前目标：</b>{cognition.currentGoal}</p>
            <p className="mt-0.5"><b>核心判断：</b>{cognition.coreJudgment}</p>
            <p className="mt-0.5"><b>主要风险：</b>{cognition.mainRisks.join("；") || "待评估"}</p>
          </div>
          <details className="mt-2">
            <summary className="cursor-pointer text-[11px] text-slate-400">项目关键事实（{cognition.keyFacts.length}）</summary>
            <ul className="mt-1 space-y-0.5">
              {cognition.keyFacts.map((f, i) => <li key={i} className="text-[11px] text-slate-500 dark:text-slate-400">· {f}</li>)}
            </ul>
          </details>
        </Card>
      )}

      {/* 模式选择 */}
      <div className="flex gap-1.5 overflow-x-auto">
        {MODES.map((m) => (
          <button key={m} onClick={() => setMode(m)} className={"shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors " + (mode === m ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300")}>
            {AGENT_MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* 对话 */}
      <Card>
        <div className="flex min-h-[220px] flex-col gap-2">
          <div className="flex-1 space-y-2">
            {messages.length === 0 && (
              <p className="text-xs text-slate-400">问项目 AI：例如「这个项目最大的风险是什么？」「为什么推荐这个方案？」「如果预算只有 1000 美元怎么办？」</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "rounded-xl bg-indigo-50 px-3 py-2 text-xs whitespace-pre-wrap text-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-100" : ""}>
                {m.role === "assistant" && m.structured ? (
                  <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
                    <StructuredReply out={m.structured} />
                  </div>
                ) : (
                  <div className={"rounded-xl px-3 py-2 text-xs whitespace-pre-wrap " + (m.role === "user" ? "" : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100")}>{m.content}</div>
                )}
              </div>
            ))}
            {busy && <p className="text-[10px] text-slate-400">AI 思考中…</p>}
            {lastKnowledge && !busy && (
              <div className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                ✓ 已沉淀到项目知识库：
                {lastKnowledge.newViews ? <span className="ml-1 rounded bg-white/70 px-1 dark:bg-slate-900/50">新观点</span> : null}
                {lastKnowledge.newDecisions ? <span className="ml-1 rounded bg-white/70 px-1 dark:bg-slate-900/50">新决策</span> : null}
                {lastKnowledge.newData ? <span className="ml-1 rounded bg-white/70 px-1 dark:bg-slate-900/50">新数据</span> : null}
                {lastKnowledge.newRisks ? <span className="ml-1 rounded bg-white/70 px-1 dark:bg-slate-900/50">新风险</span> : null}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="问项目 AI…" className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-900" />
            <Button onClick={send} disabled={busy || !input.trim()}><Send className="size-3.5" />发送</Button>
          </div>
        </div>
        {error && <p className="mt-1 text-[11px] text-rose-500">{error}</p>}
      </Card>

      {/* URL / 文本分析 */}
      <div className="grid grid-cols-1 gap-2">
        <div className="flex gap-2">
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="输入网址分析（Amazon/TikTok/竞品/独立站）…" className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-900" />
          <Button variant="secondary" size="sm" onClick={analyzeUrl} disabled={busy || !url.trim()}><Link2 className="size-3.5" />分析网址</Button>
        </div>
        <div className="flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="粘贴资料/截图文字（竞品信息、用户评论…）" className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-900" />
          <Button variant="secondary" size="sm" onClick={analyzeText} disabled={busy || !text.trim()}><FileUp className="size-3.5" />分析资料</Button>
          <Button variant="secondary" size="sm" onClick={handleImage} disabled={busy} title="图片分析（需视觉模型）"><ImageIcon className="size-3.5" />图片</Button>
        </div>
      </div>

      {/* 主动提醒 + 复盘 */}
      <div className="flex items-center justify-between">
        <Button variant="secondary" size="sm" onClick={review} disabled={busy}><RotateCcw className="size-3.5" />项目复盘</Button>
        <span className="text-[10px] text-slate-400"><Brain className="mr-1 inline size-3" />AI 会持续吸收新研究/上传/决策</span>
      </div>

      {/* 长期记忆 */}
      {memory && (
        <details className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
          <summary className="cursor-pointer text-xs font-medium text-slate-500 dark:text-slate-400">项目长期记忆（事实/决策/变化/判断/知识库）</summary>
          <div className="mt-2 space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
            <p><b>项目事实：</b>{memory.facts.length ? memory.facts.join("；") : "暂无"}</p>
            <p><b>用户决策：</b>{memory.userDecisions.length ? memory.userDecisions.join("；") : "暂无"}</p>
            <p><b>项目变化：</b>{memory.changes.length ? memory.changes.slice(-5).join("；") : "暂无"}</p>
            <p><b>AI 判断历史：</b>{memory.aiJudgments.length ? memory.aiJudgments.slice(-5).join("；") : "暂无"}</p>
            <p><b>知识库：</b>{memory.knowledgeBase.length ? memory.knowledgeBase.slice(-5).join("；") : "暂无"}</p>
          </div>
        </details>
      )}
    </div>
  );
}
