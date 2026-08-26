/**
 * 项目 AI 主理人面板（V1.5；V1.9：项目运营系统——每日CEO简报/战略状态/商业数据库/决策闭环/经验沉淀）。
 */
"use client";
import { useCallback, useEffect, useState } from "react";
import { Bot, Brain, FileUp, ImageIcon, Link2, RotateCcw, Send, Pencil, Check, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StructuredReply } from "@/components/agent-output/StructuredReply";
import { buildArtifacts } from "@/lib/ai/artifacts/builder";
import { AGENT_MODE_LABELS } from "@/lib/project-agent/types";
import type { ProjectUpdate, StructuredOutput } from "@/lib/agent-output/types";
import type { AgentMode, BusinessFact, ProjectCognitionProfile, ProjectDailyBrief, ProjectDecision, ProjectMemory } from "@/lib/project-agent/types";

const MODES: AgentMode[] = ["advisor", "manager", "investor", "operations"];

interface Msg { role: "user" | "assistant"; content?: string; structured?: StructuredOutput; }
interface KnowledgeChips { newViews: boolean; newDecisions: boolean; newData: boolean; newRisks: boolean; }

const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-900";

function factText(f: BusinessFact | string): string {
  return typeof f === "string" ? f : f.content;
}
function factType(f: BusinessFact | string): string {
  return typeof f === "string" ? "FACT" : f.type;
}
function factSource(f: BusinessFact | string): string | undefined {
  return typeof f === "string" ? undefined : f.source;
}
function factConfidence(f: BusinessFact | string): number | undefined {
  return typeof f === "string" ? undefined : f.confidence;
}
function factImpact(f: BusinessFact | string): string | undefined {
  return typeof f === "string" ? undefined : f.impact;
}

export function ProjectAgentPanel({ projectId }: { projectId: string }) {
  const [cognition, setCognition] = useState<ProjectCognitionProfile | null>(null);
  const [memory, setMemory] = useState<ProjectMemory | null>(null);
  const [brief, setBrief] = useState<ProjectDailyBrief | null>(null);
  const [mode, setMode] = useState<AgentMode>("manager");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [lastKnowledge, setLastKnowledge] = useState<KnowledgeChips | null>(null);
  const [lastOut, setLastOut] = useState<StructuredOutput | null>(null);
  const [lastQuality, setLastQuality] = useState<string[]>([]);
  const [lastUpdate, setLastUpdate] = useState<ProjectUpdate | null>(null);
  const [input, setInput] = useState("");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // V1.9：战略/指标编辑 + 决策结果回填
  const [editState, setEditState] = useState(false);
  const [draft, setDraft] = useState({ currentStatus: "", coreQuestion: "", forbidden: "", northStar: "", metrics: "" });
  const [backfillId, setBackfillId] = useState<string | null>(null);
  const [bf, setBf] = useState({ actualData: "", prediction: "", deviation: "", aiLearning: "" });

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/project-agent?projectId=${projectId}`, { cache: "no-store" });
      const data = await res.json();
      if (data.cognition) {
        setCognition(data.cognition);
        setMemory(data.memory);
        setBrief(data.dailyBrief ?? null);
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
          setBrief(data.dailyBrief ?? null);
        }
      } catch {
        // 忽略
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  function openEdit() {
    if (!cognition) return;
    setDraft({
      currentStatus: cognition.strategyStatus.currentStatus,
      coreQuestion: cognition.strategyStatus.coreQuestion,
      forbidden: cognition.strategyStatus.forbiddenActions.join("，"),
      northStar: cognition.projectMetrics.northStarMetric,
      metrics: cognition.projectMetrics.keyMetrics.map((m) => `${m.name}|${m.current}|${m.target}`).join("\n"),
    });
    setEditState(true);
  }

  async function saveState() {
    const keyMetrics = draft.metrics.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
      const [name, current = "", target = ""] = l.split("|").map((x) => x.trim());
      return { name, current, target };
    }).filter((m) => m.name);
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/project-agent", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "update-state", projectId,
          strategyStatus: draft.currentStatus.trim(), coreQuestion: draft.coreQuestion.trim(),
          forbiddenActions: draft.forbidden.split(/[，,]/).map((x) => x.trim()).filter(Boolean),
          northStarMetric: draft.northStar.trim(), keyMetrics,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "失败");
      setEditState(false);
      await load();
    } catch (e) { setError((e as Error).message ?? "失败"); } finally { setBusy(false); }
  }

  async function submitResult(d: ProjectDecision) {
    if (!bf.actualData.trim() || busy) return;
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/project-agent", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "decision-result", projectId, decisionId: d.id, actualData: bf.actualData, prediction: bf.prediction, deviation: bf.deviation, aiLearning: bf.aiLearning }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "失败");
      setBackfillId(null); setBf({ actualData: "", prediction: "", deviation: "", aiLearning: "" });
      await load();
    } catch (e) { setError((e as Error).message ?? "失败"); } finally { setBusy(false); }
  }

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
      setLastUpdate(data.projectUpdate ?? null);
      if (data.structured) { setLastOut(data.structured); setLastQuality((data.quality ?? []).map((q: { message: string }) => q.message)); }
      await load();
    } catch (e) {
      setError((e as Error).message ?? "失败");
    } finally {
      setBusy(false);
    }
  }

  async function quickSend(text: string) {
    setMessages((m) => [...m, { role: "user", content: text }]);
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/project-agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "chat", projectId, message: text, mode }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "失败");
      setMessages((m) => [...m, data.structured ? { role: "assistant", structured: data.structured } : { role: "assistant", content: data.reply ?? "" }]);
      setLastKnowledge(data.knowledge ?? null);
      setLastUpdate(data.projectUpdate ?? null);
      if (data.structured) { setLastOut(data.structured); setLastQuality((data.quality ?? []).map((q: { message: string }) => q.message)); }
      await load();
    } catch (e) { setError((e as Error).message ?? "失败"); } finally { setBusy(false); }
  }

  function exportLastReport() {
    if (!lastOut) return;
    const report = buildArtifacts(lastOut).find((a) => a.type === "report");
    if (!report) return;
    const blob = new Blob([report.content], { type: "text/html;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (lastOut.title || "bizmentor") + ".report.html";
    a.click();
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
      {/* 项目每日 CEO 简报（V1.9） */}
      {brief && (
        <Card className="border-indigo-200 dark:border-indigo-800">
          <div className="flex items-center gap-1.5">
            <Bot className="size-4 text-indigo-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">AI 每日 CEO 简报</h4>
            <span className="ml-auto text-[10px] text-slate-400">{brief.date}</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
            <div className="rounded-xl bg-slate-50 px-1 py-1.5 dark:bg-slate-800/60"><p className="text-[9px] text-slate-400">项目阶段</p><p className="text-[11px] font-semibold text-slate-800 dark:text-slate-100">{brief.currentPhase}</p></div>
            <div className="rounded-xl bg-slate-50 px-1 py-1.5 dark:bg-slate-800/60"><p className="text-[9px] text-slate-400">战略状态</p><p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">{brief.strategyStatus}</p></div>
            <div className="rounded-xl bg-slate-50 px-1 py-1.5 dark:bg-slate-800/60"><p className="text-[9px] text-slate-400">执行中决策</p><p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">{brief.openDecisions}</p></div>
          </div>
          <div className="mt-2 rounded-xl bg-indigo-50 px-2.5 py-1.5 text-[11px] text-slate-700 dark:bg-indigo-950/30 dark:text-slate-200">
            <p><b>北极星：</b>{brief.northStar}</p>
            <p className="mt-0.5"><b>核心问题：</b>{brief.coreQuestion}</p>
            {brief.forbiddenActions.length > 0 && <p className="mt-0.5"><b>禁止：</b>{brief.forbiddenActions.join("、")}</p>}
            {brief.topRisks.length > 0 && <p className="mt-0.5"><b>风险：</b>{brief.topRisks.join("；")}</p>}
          </div>
          <p className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-300"><b>🤖 AI 今日建议：</b>{brief.aiAdvice}</p>
          <p className="mt-1 text-[10px] text-slate-400"><b>今日优先：</b>{brief.todayPriority}</p>
        </Card>
      )}

      {/* 项目认知档案 */}
      {cognition && (
        <Card className="border-violet-200 dark:border-violet-800">
          <div className="flex items-center gap-1.5">
            <Bot className="size-4 text-violet-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">项目认知卡</h4>
            <button onClick={openEdit} className="ml-auto inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"><Pencil className="size-2.5" />战略状态</button>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{cognition.aiIdentity}</p>
          <div className="mt-2 rounded-xl bg-violet-50 px-3 py-2 text-[11px] text-slate-700 dark:bg-violet-950/30 dark:text-slate-200">
            <p><b>当前项目：</b>{cognition.projectName}</p>
            <p className="mt-0.5"><b>当前阶段：</b>{cognition.currentPhase}</p>
            <p className="mt-0.5"><b>战略状态：</b>{cognition.strategyStatus.currentStatus}</p>
            <p className="mt-0.5"><b>核心问题：</b>{cognition.strategyStatus.coreQuestion}</p>
            {cognition.strategyStatus.forbiddenActions.length > 0 && <p className="mt-0.5"><b>禁止事项：</b>{cognition.strategyStatus.forbiddenActions.join("、")}</p>}
            <p className="mt-0.5"><b>北极星：</b>{cognition.projectMetrics.northStarMetric}</p>
            {cognition.projectMetrics.keyMetrics.length > 0 && (
              <p className="mt-0.5"><b>关键指标：</b>{cognition.projectMetrics.keyMetrics.map((m) => `${m.name} ${m.current}→${m.target}`).join("；")}</p>
            )}
            <p className="mt-0.5"><b>当前目标：</b>{cognition.currentGoal}</p>
            <p className="mt-0.5"><b>核心假设：</b>{cognition.coreAssumption}</p>
            <p className="mt-0.5"><b>最大风险：</b>{cognition.mainRisks[0] ?? "待评估"}</p>
            <p className="mt-0.5"><b>下一步动作：</b>{cognition.nextAction}</p>
          </div>
          {editState && (
            <div className="mt-2 space-y-1.5 rounded-xl border border-violet-200 bg-violet-50/60 p-2 dark:border-violet-800 dark:bg-violet-950/20">
              <p className="text-[10px] font-semibold text-violet-600 dark:text-violet-300">编辑战略状态 / 成功指标</p>
              <div><label className="text-[10px] text-slate-400">战略状态</label><input className={inputCls} value={draft.currentStatus} onChange={(e) => setDraft({ ...draft, currentStatus: e.target.value })} placeholder="等待用户需求验证" /></div>
              <div><label className="text-[10px] text-slate-400">核心问题</label><input className={inputCls} value={draft.coreQuestion} onChange={(e) => setDraft({ ...draft, coreQuestion: e.target.value })} placeholder="是否有人愿意付费" /></div>
              <div><label className="text-[10px] text-slate-400">禁止事项（逗号分隔）</label><input className={inputCls} value={draft.forbidden} onChange={(e) => setDraft({ ...draft, forbidden: e.target.value })} placeholder="暂不扩大库存，暂不扩大团队" /></div>
              <div><label className="text-[10px] text-slate-400">北极星指标</label><input className={inputCls} value={draft.northStar} onChange={(e) => setDraft({ ...draft, northStar: e.target.value })} placeholder="30天获得100个真实客户" /></div>
              <div><label className="text-[10px] text-slate-400">关键指标（每行：名称|当前|目标）</label><textarea className={inputCls + " min-h-[54px]"} value={draft.metrics} onChange={(e) => setDraft({ ...draft, metrics: e.target.value })} placeholder={"转化率|2%|5%\n留存率|40%|60%"} /></div>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveState} disabled={busy}><Check className="size-3" />保存</Button>
                <Button size="sm" variant="secondary" onClick={() => setEditState(false)}><X className="size-3" />取消</Button>
              </div>
            </div>
          )}
          <details className="mt-2">
            <summary className="cursor-pointer text-[11px] text-slate-400">项目关键事实（{cognition.keyFacts.length}）</summary>
            <ul className="mt-1 space-y-0.5">
              {cognition.keyFacts.map((f, i) => <li key={i} className="text-[11px] text-slate-500 dark:text-slate-400">· {f}</li>)}
            </ul>
          </details>
        </Card>
      )}

      {/* 快捷动作（V1.8.1：驾驶舱/今日建议/执行中心/风险雷达） */}
      <div className="flex gap-1.5 overflow-x-auto">
        <button onClick={() => { document.getElementById("agent-dashboard")?.scrollIntoView({ behavior: "smooth" }); }} className="shrink-0 rounded-full bg-violet-600 px-3 py-1.5 text-xs font-medium text-white">项目驾驶舱</button>
        <button onClick={() => quickSend("给我今天的优先事项：今天最重要的一件事是什么，为什么")} className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">AI今日建议</button>
        <button onClick={() => quickSend("把执行方案拆成今天可执行的任务清单（负责人/截止/状态）")} className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">执行中心</button>
        <button onClick={() => quickSend("当前有哪些风险？给概率/影响/触发条件/解决方案")} className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">风险雷达</button>
        <button onClick={exportLastReport} disabled={!lastOut} className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-300">导出</button>
      </div>

      {/* 模式选择 */}
      <div className="flex gap-1.5 overflow-x-auto">
        {MODES.map((m) => (
          <button key={m} onClick={() => setMode(m)} className={"shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors " + (mode === m ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300")}>
            {AGENT_MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* 项目驾驶舱（V1.8.1：第一层永久显示） */}
      {cognition && memory && (
        <Card id="agent-dashboard" className="border-violet-200 dark:border-violet-800">
          <p className="text-xs font-semibold text-slate-900 dark:text-white">项目驾驶舱</p>
          <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
            <div className="rounded-xl bg-slate-50 px-1 py-1.5 dark:bg-slate-800/60"><p className="text-[9px] text-slate-400">阶段</p><p className="text-[11px] font-semibold text-slate-800 dark:text-slate-100">{cognition.currentPhase}</p></div>
            <div className="rounded-xl bg-slate-50 px-1 py-1.5 dark:bg-slate-800/60"><p className="text-[9px] text-slate-400">完成度</p><p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">{cognition.keyFacts.length > 3 ? 35 : 15}%</p></div>
            <div className="rounded-xl bg-slate-50 px-1 py-1.5 dark:bg-slate-800/60"><p className="text-[9px] text-slate-400">健康度</p><p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{cognition.mainRisks.length < 3 ? "🟢 正常" : "🟡 关注"}</p></div>
          </div>
          <div className="mt-2 rounded-xl bg-violet-50 px-2.5 py-1.5 text-[11px] text-slate-700 dark:bg-violet-950/30 dark:text-slate-200">
            <p><b>当前目标：</b>{cognition.currentGoal}</p>
            <p className="mt-0.5"><b>最大风险：</b>{cognition.mainRisks[0] ?? "待评估"}</p>
          </div>
          <p className="mt-1.5 text-[10px] text-slate-400">今日优先：{cognition.nextAction}</p>
        </Card>
      )}

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
            {lastUpdate && !busy && (
              <div className="rounded-lg bg-violet-50 px-2.5 py-1.5 text-[10px] text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                📌 本次项目更新（已同步项目大脑）：{lastUpdate.newFacts?.length ? `新增事实 ${lastUpdate.newFacts.length} 条 · ` : ""}{lastUpdate.newRisks?.length ? `新风险 ${lastUpdate.newRisks.length} · ` : ""}{lastUpdate.newJudgments?.length ? `判断变化 ${lastUpdate.newJudgments.length} · ` : ""}{lastUpdate.planChanges?.length ? `方案变化 ${lastUpdate.planChanges.length} · ` : ""}{lastUpdate.strategyUpdate ? "战略状态已更新 · " : ""}{lastUpdate.metricsUpdate ? "指标已更新 · " : ""}{lastUpdate.decision ? `已记录决策：${lastUpdate.decision.decision.slice(0, 30)}` : "本次无新沉淀"}
              </div>
            )}
            {lastQuality.length > 0 && !busy && (
              <div className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[10px] text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                ⚠ AI 质量自检：{lastQuality[0]}
              </div>
            )}
            {lastKnowledge && !busy && (
              <div className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                ✓ 已沉淀到项目知识库：{lastKnowledge.newViews ? <span className="ml-1 rounded bg-white/70 px-1 dark:bg-slate-900/50">新观点</span> : null}{lastKnowledge.newData ? <span className="ml-1 rounded bg-white/70 px-1 dark:bg-slate-900/50">新数据</span> : null}{lastKnowledge.newDecisions ? <span className="ml-1 rounded bg-white/70 px-1 dark:bg-slate-900/50">新决策</span> : null}{lastKnowledge.newRisks ? <span className="ml-1 rounded bg-white/70 px-1 dark:bg-slate-900/50">新风险</span> : null}
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

      {/* 项目大脑（V1.8.1；V1.9：商业数据库 + 决策闭环 + 经验沉淀） */}
      {memory && (
        <details className="rounded-xl border border-violet-200 bg-white px-3 py-2.5 dark:border-violet-800 dark:bg-slate-900" open>
          <summary className="cursor-pointer text-xs font-bold text-violet-700 dark:text-violet-300">🧠 项目大脑（商业数据库/决策闭环/判断/变化/知识/经验）</summary>
          <div className="mt-2 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
            {/* 商业数据库（V1.9） */}
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-100">商业数据库（{memory.facts.length}）</p>
              {memory.facts.length ? memory.facts.slice(-8).map((f, i) => (
                <p key={i} className="mt-0.5">
                  <span className={"mr-1 inline-block rounded px-1 text-[9px] font-bold " + (factType(f) === "FACT" ? "bg-emerald-100 text-emerald-700" : factType(f) === "INFERENCE" ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700")}>{factType(f)}</span>
                  {factText(f)}
                  {factSource(f) ? <span className="text-slate-400"> · 来源：{factSource(f)}</span> : null}
                  {factConfidence(f) != null ? <span className="text-slate-400"> · 可信度 {factConfidence(f)}%</span> : null}
                  {factImpact(f) ? <span className="text-slate-400"> · 影响：{factImpact(f)}</span> : null}
                </p>
              )) : <p className="text-slate-400">暂无事实（回答时会自动沉淀）</p>}
            </div>
            {/* 决策记录 + 结果回填（V1.9 闭环） */}
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-100">决策记录（{memory.decisionLog.length}）</p>
              {(memory.decisionLog ?? []).length ? (memory.decisionLog ?? []).slice(-6).map((d, i) => (
                <div key={i} className="mt-1 rounded-lg bg-slate-50 px-2 py-1.5 dark:bg-slate-800/60">
                  <p>· {d.time.slice(0, 10)} {d.decision}（{d.reason}）[{d.status}]</p>
                  {d.result ? (
                    <p className="mt-0.5 text-[10px] text-slate-500">📊 结果：{d.result.actualData}{d.result.deviation ? ` · 偏差：${d.result.deviation}` : ""}{d.result.aiLearning ? ` · 学习：${d.result.aiLearning.slice(0, 60)}` : ""}</p>
                  ) : null}
                  {d.status === "executing" && (
                    <div className="mt-1">
                      {backfillId === d.id ? (
                        <div className="space-y-1">
                          <input className={inputCls} placeholder="实际数据（如 转化率2%）" value={bf.actualData} onChange={(e) => setBf({ ...bf, actualData: e.target.value })} />
                          <input className={inputCls} placeholder="预测（可选）" value={bf.prediction} onChange={(e) => setBf({ ...bf, prediction: e.target.value })} />
                          <input className={inputCls} placeholder="偏差（可选）" value={bf.deviation} onChange={(e) => setBf({ ...bf, deviation: e.target.value })} />
                          <input className={inputCls} placeholder="AI 学习（可选）" value={bf.aiLearning} onChange={(e) => setBf({ ...bf, aiLearning: e.target.value })} />
                          <div className="flex gap-1.5">
                            <Button size="sm" onClick={() => submitResult(d)} disabled={busy || !bf.actualData.trim()}><Check className="size-3" />回填结果</Button>
                            <Button size="sm" variant="secondary" onClick={() => { setBackfillId(null); setBf({ actualData: "", prediction: "", deviation: "", aiLearning: "" }); }}><X className="size-3" />取消</Button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setBackfillId(d.id)} className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300">回填实际结果</button>
                      )}
                    </div>
                  )}
                </div>
              )) : <p className="text-slate-400">暂无决策记录</p>}
            </div>
            {/* 经验沉淀（V1.9 AI 学习） */}
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-100">经验沉淀（AI 学习）</p>
              {(memory.lessonsLearned ?? []).length ? (memory.lessonsLearned ?? []).slice(-4).map((l, i) => <p key={i}>· {l}</p>) : <p className="text-slate-400">暂无（回填决策结果后 AI 会从成败中学习）</p>}
            </div>
            {/* AI 判断变化 */}
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-100">AI 判断变化</p>
              {(memory.aiJudgmentChanges ?? []).length ? (memory.aiJudgmentChanges ?? []).slice(-4).map((j, i) => <p key={i}>· {j.before ?? "—"} → {j.after}（{j.reason}）</p>) : <p className="text-slate-400">暂无判断变化</p>}
            </div>
            {/* 项目变化 */}
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-100">项目变化</p>
              {memory.changes.length ? memory.changes.slice(-5).map((c, i) => <p key={i}>· {c}</p>) : <p className="text-slate-400">暂无</p>}
            </div>
            {/* 知识库 */}
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-100">知识库</p>
              {memory.knowledgeBase.length ? memory.knowledgeBase.slice(-4).map((k, i) => <p key={i} className="truncate">· {k}</p>) : <p className="text-slate-400">暂无</p>}
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
