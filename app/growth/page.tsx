"use client";
/** 个人成长中心（Personal AI Life OS V1.0）：AI人生CEO / 个人画像 / 成长记录 / 成长报告 / 成长知识库 */
import { useCallback, useEffect, useState } from "react";
import { Bot, Brain, CalendarDays, FileText, Library, Send, Sparkles, UserRound, TrendingUp, Play } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StructuredReply } from "@/components/agent-output/StructuredReply";
import type { StructuredOutput } from "@/lib/agent-output/types";
import type { PersonalGrowthBrain, GrowthReport, GrowthInsight, KnowledgeEntry } from "@/lib/personal-growth/types";
import type { ModelingStage } from "@/lib/personal-growth/questions";

type Tab = "ceo" | "profile" | "records" | "reports" | "knowledge";
const TABS: Array<{ id: Tab; label: string; icon: typeof Bot }> = [
  { id: "ceo", label: "AI人生CEO", icon: Bot },
  { id: "profile", label: "个人画像", icon: UserRound },
  { id: "records", label: "成长记录", icon: CalendarDays },
  { id: "reports", label: "成长报告", icon: FileText },
  { id: "knowledge", label: "成长知识库", icon: Library },
];
const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-900";

interface Msg { role: "user" | "assistant"; content?: string; structured?: StructuredOutput; }

export default function GrowthPage() {
  const [brain, setBrain] = useState<PersonalGrowthBrain | null>(null);
  const [stages, setStages] = useState<ModelingStage[]>([]);
  const [tab, setTab] = useState<Tab>("ceo");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // 建模
  const [answer, setAnswer] = useState("");
  const [blueprint, setBlueprint] = useState<Record<string, unknown> | null>(null);
  // CEO 对话
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  // 每日复盘
  const [rv, setRv] = useState({ plan: "", execution: "", reflection: "", mood: "", problems: "" });
  // 画像编辑
  const [editProfile, setEditProfile] = useState(false);
  const [pf, setPf] = useState({ traits: "", strengths: "", weaknesses: "", stress: "", decision: "", values: "", longTerm: "", fiveYear: "", tenYear: "", abilities: "", toImprove: "" });

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/growth", { cache: "no-store" });
      const data = await res.json();
      if (data.brain) { setBrain(data.brain); setStages(data.stages ?? []); }
      else if (data.error) setError(data.message ?? data.error);
    } catch { /* 忽略 */ }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/growth", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && data.brain) { setBrain(data.brain); setStages(data.stages ?? []); }
        else if (!cancelled && data.error) setError(data.message ?? data.error);
      } catch { /* 忽略 */ }
    })();
    return () => { cancelled = true; };
  }, []);

  async function api(body: Record<string, unknown>) {
    const res = await fetch("/api/growth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? data.error ?? "失败");
    return data;
  }

  async function startModeling() {
    setBusy(true); setError("");
    try { const d = await api({ type: "start-modeling" }); setBrain(d.brain); setStages(d.stages); setBlueprint(null); setAnswer(""); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function submitAnswer() {
    if (!brain || !answer.trim() || busy) return;
    setBusy(true); setError("");
    try {
      const stage = brain.modeling.currentStage;
      const d = await api({ type: "modeling-answer", stage, answer: answer.trim() });
      setBrain(d.brain);
      if (d.done) { setBlueprint(d.blueprint ?? null); setAnswer(""); }
      else { setAnswer(""); }
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function sendChat() {
    const text = input.trim();
    if (!text || busy) return;
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput(""); setBusy(true); setError("");
    try {
      const d = await api({ type: "chat", message: text });
      setMessages((m) => [...m, d.structured ? { role: "assistant", structured: d.structured } : { role: "assistant", content: "（AI 未能生成结构化回复）" }]);
      await load();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function submitReview() {
    if (busy) return;
    if (!rv.plan.trim() && !rv.execution.trim() && !rv.reflection.trim()) { setError("请至少填写今日计划/执行/复盘之一"); return; }
    setBusy(true); setError("");
    try { await api({ type: "daily-review", ...rv }); setRv({ plan: "", execution: "", reflection: "", mood: "", problems: "" }); await load(); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function genReport(type: "weekly" | "monthly") {
    setBusy(true); setError("");
    try { await api({ type: "report", reportType: type }); await load(); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function runProactive() {
    setBusy(true); setError("");
    try { await api({ type: "proactive" }); await load(); setTab("knowledge"); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  function openEditProfile() {
    const p = brain?.personality, s = brain?.strategy, a = brain?.abilities;
    setPf({
      traits: p?.traits.join("，") ?? "", strengths: p?.strengths.join("，") ?? "", weaknesses: p?.weaknesses.join("，") ?? "",
      stress: p?.stressPatterns.join("，") ?? "", decision: p?.decisionStyle ?? "",
      values: s?.values.join("，") ?? "", longTerm: s?.longTermGoal ?? "", fiveYear: s?.fiveYearGoal ?? "", tenYear: s?.tenYearDirection ?? "",
      abilities: a?.current.map((x) => `${x.name}|${x.current}|${x.target}`).join("\n") ?? "", toImprove: a?.toImprove.join("，") ?? "",
    });
    setEditProfile(true);
  }

  async function saveProfile() {
    const split = (s: string) => s.split(/[，,;；\n]/).map((x) => x.trim()).filter(Boolean);
    const abilities = pf.abilities.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
      const [name, current = "40", target = "70"] = l.split("|").map((x) => x.trim());
      return { name: name || "能力", current: Number(current) || 40, target: Number(target) || 70 };
    }).filter((x) => x.name);
    setBusy(true); setError("");
    try {
      await api({
        type: "save-profile",
        personality: { traits: split(pf.traits), strengths: split(pf.strengths), weaknesses: split(pf.weaknesses), stressPatterns: split(pf.stress), decisionStyle: pf.decision, summary: brain?.personality?.summary ?? "" },
        strategy: { values: split(pf.values), longTermGoal: pf.longTerm, fiveYearGoal: pf.fiveYear, tenYearDirection: pf.tenYear },
        abilities: { current: abilities, toImprove: split(pf.toImprove) },
        motivation: brain?.motivation ?? null,
      });
      setEditProfile(false);
      await load();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  const stage = brain && stages[brain.modeling.currentStage];
  const lastReview = brain?.dailyReviews?.[brain.dailyReviews.length - 1];
  const lastScore = lastReview?.score?.overall;
  const currentStageLabel = brain?.modeling.completed ? "持续成长" : brain?.modeling.started ? `建模中（${(brain.modeling.currentStage + 1)}/${stages.length}）` : "待建模";
  const coreGoal = brain?.strategy?.longTermGoal || (blueprint as { sections?: { 核心成长方向?: string } } | null)?.sections?.["核心成长方向"] || brain?.modeling.blueprint ? "长期成长（见蓝图）" : "完成个人深度建模";
  const topProblem = brain?.insights?.slice(-1)[0]?.content || lastReview?.problems?.split(/[。；;\n]/)[0] || "暂无";
  const todayAdvice = lastReview?.tomorrowPlan?.[0] || (brain?.modeling.completed ? "保持每日复盘，让 AI 人生 CEO 持续了解你" : "先完成首次个人深度建模");

  return (
    <div className="px-5 pb-4">
      <AppHeader title="个人成长中心" subtitle="Personal AI Life OS · 你的 AI 人生 CEO" />

      {/* 个人成长状态卡 */}
      <Card className="border-emerald-200 dark:border-emerald-800">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="size-4 text-emerald-500" />
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">个人成长状态</h4>
          <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">{currentStageLabel}</span>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
          <div className="rounded-xl bg-slate-50 px-1 py-1.5 dark:bg-slate-800/60"><p className="text-[9px] text-slate-400">成长评分</p><p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{lastScore ?? "—"}</p></div>
          <div className="col-span-2 rounded-xl bg-slate-50 px-2 py-1.5 text-left dark:bg-slate-800/60"><p className="text-[9px] text-slate-400">核心目标</p><p className="truncate text-[11px] font-semibold text-slate-700 dark:text-slate-200">{coreGoal}</p></div>
        </div>
        <div className="mt-2 rounded-xl bg-emerald-50 px-2.5 py-1.5 text-[11px] text-slate-700 dark:bg-emerald-950/30 dark:text-slate-200">
          <p><b>当前最大问题：</b>{topProblem}</p>
          <p className="mt-0.5"><b>今日成长建议：</b>{todayAdvice}</p>
        </div>
      </Card>

      {/* Tab 导航 */}
      <div className="mt-3 flex gap-1.5 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={"shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors " + (tab === t.id ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300")}>
            <t.icon className="size-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* 首次建模向导 */}
      {tab === "ceo" && brain && !brain.modeling.completed && (
        <Card className="mt-3 border-emerald-200 dark:border-emerald-800">
          <p className="text-xs font-semibold text-slate-900 dark:text-white">首次启动：个人深度建模</p>
          {!brain.modeling.started ? (
            <>
              <p className="mt-1 text-[11px] text-slate-500">我会通过六阶段 AI 访谈了解你（人生经历 → 性格思维 → 事业财富 → 能力结构 → 生活方式 → 价值观愿景），完成后生成《个人成长战略蓝图 V1.0》。</p>
              <Button className="mt-2" onClick={startModeling} disabled={busy}><Play className="size-3.5" />开始深度建模</Button>
            </>
          ) : stage ? (
            <>
              <div className="mt-1.5 flex gap-1">
                {stages.map((s, i) => <div key={s.key} className={"h-1 flex-1 rounded-full " + (i < brain.modeling.currentStage ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700")} />)}
              </div>
              <p className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">{stage.title}</p>
              <p className="text-[10px] text-slate-400">{stage.description}</p>
              <ul className="mt-1.5 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                {stage.questions.map((q, i) => <li key={i}>· {q}</li>)}
              </ul>
              <textarea className={inputCls + " mt-2 min-h-[90px]"} placeholder="在这里回答本阶段问题（可以一并回答）" value={answer} onChange={(e) => setAnswer(e.target.value)} />
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={submitAnswer} disabled={busy || !answer.trim()}>{brain.modeling.currentStage === stages.length - 1 ? "完成建模，生成蓝图" : "下一步"}<Send className="ml-1 size-3" /></Button>
              </div>
            </>
          ) : null}
        </Card>
      )}

      {/* AI人生CEO 聊天 */}
      {tab === "ceo" && (
        <Card className="mt-3">
          <div className="flex items-center gap-1.5">
            <Bot className="size-4 text-emerald-500" />
            <p className="text-xs font-semibold text-slate-900 dark:text-white">AI 人生 CEO</p>
            <button onClick={runProactive} disabled={busy} className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-600 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300"><Sparkles className="size-2.5" />AI 主动扫描</button>
          </div>
          <div className="mt-2 flex min-h-[200px] flex-col gap-2">
            <div className="flex-1 space-y-2">
              {messages.length === 0 && <p className="text-[11px] text-slate-400">{brain?.modeling.completed ? "问你的 AI 人生 CEO：例如「我最近最大的成长瓶颈是什么？」「帮我做 5 年规划」" : "先完成上面的首次建模，AI 人生 CEO 才能给出有依据的成长建议。"}</p>}
              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "rounded-xl bg-emerald-50 px-3 py-2 text-xs whitespace-pre-wrap text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100" : ""}>
                  {m.role === "assistant" && m.structured ? <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60"><StructuredReply out={m.structured} /></div>
                    : <div className={"rounded-xl px-3 py-2 text-xs whitespace-pre-wrap " + (m.role === "user" ? "" : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100")}>{m.content}</div>}
                </div>
              ))}
              {busy && <p className="text-[10px] text-slate-400">AI 人生 CEO 思考中…</p>}
            </div>
            <div className="flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendChat()} placeholder="问 AI 人生 CEO…" className={inputCls} />
              <Button onClick={sendChat} disabled={busy || !input.trim()}><Send className="size-3.5" /></Button>
            </div>
          </div>
        </Card>
      )}

      {/* 个人画像 */}
      {tab === "profile" && (
        <Card className="mt-3">
          <div className="flex items-center gap-1.5">
            <UserRound className="size-4 text-emerald-500" />
            <p className="text-xs font-semibold text-slate-900 dark:text-white">个人画像</p>
            <button onClick={openEditProfile} className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300">编辑</button>
          </div>
          {!editProfile ? (
            <div className="mt-2 space-y-2 text-[11px] text-slate-600 dark:text-slate-300">
              <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60"><p className="font-semibold">人格档案</p>{brain?.personality ? <><p>性格：{brain.personality.traits.join("、") || "—"}</p><p>优势：{brain.personality.strengths.join("、") || "—"}</p><p>弱点：{brain.personality.weaknesses.join("、") || "—"}</p><p>压力模式：{brain.personality.stressPatterns.join("、") || "—"}</p><p>决策方式：{brain.personality.decisionStyle || "—"}</p></> : <p className="text-slate-400">完成建模后生成</p>}</div>
              <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60"><p className="font-semibold">人生战略</p>{brain?.strategy ? <><p>价值观：{brain.strategy.values.join("、") || "—"}</p><p>长期目标：{brain.strategy.longTermGoal || "—"}</p><p>五年目标：{brain.strategy.fiveYearGoal || "—"}</p><p>十年方向：{brain.strategy.tenYearDirection || "—"}</p></> : <p className="text-slate-400">完成建模后生成</p>}</div>
              <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60"><p className="font-semibold">能力模型</p>{brain?.abilities ? <>{brain.abilities.current.map((a) => <p key={a.name}>· {a.name}：{a.current} → {a.target}{a.note ? `（${a.note}）` : ""}</p>)}<p>待提升：{brain.abilities.toImprove.join("、") || "—"}</p></> : <p className="text-slate-400">完成建模后生成</p>}</div>
              <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60"><p className="font-semibold">动力模型</p>{brain?.motivation ? <><p>让我成长：{brain.motivation.energizes.join("、") || "—"}</p><p>让我消耗：{brain.motivation.drains.join("、") || "—"}</p><p>让我坚持：{brain.motivation.sustains.join("、") || "—"}</p></> : <p className="text-slate-400">完成建模后生成</p>}</div>
            </div>
          ) : (
            <div className="mt-2 space-y-1.5">
              <div><label className="text-[10px] text-slate-400">性格特点（逗号分隔）</label><input className={inputCls} value={pf.traits} onChange={(e) => setPf({ ...pf, traits: e.target.value })} /></div>
              <div><label className="text-[10px] text-slate-400">优势</label><input className={inputCls} value={pf.strengths} onChange={(e) => setPf({ ...pf, strengths: e.target.value })} /></div>
              <div><label className="text-[10px] text-slate-400">弱点</label><input className={inputCls} value={pf.weaknesses} onChange={(e) => setPf({ ...pf, weaknesses: e.target.value })} /></div>
              <div><label className="text-[10px] text-slate-400">压力模式</label><input className={inputCls} value={pf.stress} onChange={(e) => setPf({ ...pf, stress: e.target.value })} /></div>
              <div><label className="text-[10px] text-slate-400">决策方式</label><input className={inputCls} value={pf.decision} onChange={(e) => setPf({ ...pf, decision: e.target.value })} /></div>
              <div><label className="text-[10px] text-slate-400">价值观</label><input className={inputCls} value={pf.values} onChange={(e) => setPf({ ...pf, values: e.target.value })} /></div>
              <div><label className="text-[10px] text-slate-400">长期目标</label><input className={inputCls} value={pf.longTerm} onChange={(e) => setPf({ ...pf, longTerm: e.target.value })} /></div>
              <div><label className="text-[10px] text-slate-400">五年目标</label><input className={inputCls} value={pf.fiveYear} onChange={(e) => setPf({ ...pf, fiveYear: e.target.value })} /></div>
              <div><label className="text-[10px] text-slate-400">十年方向</label><input className={inputCls} value={pf.tenYear} onChange={(e) => setPf({ ...pf, tenYear: e.target.value })} /></div>
              <div><label className="text-[10px] text-slate-400">能力（每行 名称|当前|目标）</label><textarea className={inputCls + " min-h-[60px]"} value={pf.abilities} onChange={(e) => setPf({ ...pf, abilities: e.target.value })} placeholder={"商业能力|40|70\n学习能力|50|75"} /></div>
              <div><label className="text-[10px] text-slate-400">待提升能力</label><input className={inputCls} value={pf.toImprove} onChange={(e) => setPf({ ...pf, toImprove: e.target.value })} /></div>
              <div className="flex gap-2"><Button size="sm" onClick={saveProfile} disabled={busy}>保存</Button><Button size="sm" variant="secondary" onClick={() => setEditProfile(false)}>取消</Button></div>
            </div>
          )}
        </Card>
      )}

      {/* 成长记录 */}
      {tab === "records" && (
        <div className="mt-3 space-y-3">
          <Card>
            <p className="text-xs font-semibold text-slate-900 dark:text-white">每日成长记录</p>
            <div className="mt-2 space-y-1.5">
              <input className={inputCls} placeholder="今日计划" value={rv.plan} onChange={(e) => setRv({ ...rv, plan: e.target.value })} />
              <input className={inputCls} placeholder="今日执行" value={rv.execution} onChange={(e) => setRv({ ...rv, execution: e.target.value })} />
              <textarea className={inputCls + " min-h-[60px]"} placeholder="今日复盘" value={rv.reflection} onChange={(e) => setRv({ ...rv, reflection: e.target.value })} />
              <input className={inputCls} placeholder="情绪状态（如：平静、焦虑、充实）" value={rv.mood} onChange={(e) => setRv({ ...rv, mood: e.target.value })} />
              <input className={inputCls} placeholder="遇到的问题" value={rv.problems} onChange={(e) => setRv({ ...rv, problems: e.target.value })} />
              <Button size="sm" onClick={submitReview} disabled={busy}><Brain className="size-3.5" />生成今日深度分析</Button>
            </div>
          </Card>
          {lastReview && (
            <Card className="border-emerald-200 dark:border-emerald-800">
              <p className="text-xs font-semibold text-slate-900 dark:text-white">今日深度分析 · {lastReview.date} <span className="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">评分 {lastReview.score?.overall ?? "—"}</span></p>
              {lastReview.deepAnalysis && <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">{lastReview.deepAnalysis}</p>}
              {lastReview.expertBoard?.map((e) => <p key={e.expert} className="mt-1 text-[11px] text-slate-600 dark:text-slate-300"><b>{e.role}：</b>{e.insight}</p>)}
              {lastReview.tomorrowPlan && lastReview.tomorrowPlan.length > 0 && <div className="mt-1.5"><p className="text-[10px] font-semibold text-slate-500">明日最重要 3 件事</p>{(lastReview.tomorrowPlan ?? []).map((t, i) => <p key={i} className="text-[11px] text-slate-600 dark:text-slate-300">· {t}</p>)}</div>}
            </Card>
          )}
          {brain?.dailyReviews && brain.dailyReviews.length > 1 && (
            <Card>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">历史记录</p>
              <div className="mt-1.5 space-y-1">
                {[...brain.dailyReviews].reverse().slice(0, 20).map((r) => <p key={r.id} className="text-[11px] text-slate-600 dark:text-slate-300">· {r.date} 评分 {r.score?.overall ?? "—"}：{(r.reflection || r.execution || "—").slice(0, 60)}</p>)}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* 成长报告 */}
      {tab === "reports" && (
        <div className="mt-3 space-y-3">
          <Card>
            <p className="text-xs font-semibold text-slate-900 dark:text-white">周期成长报告</p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={() => genReport("weekly")} disabled={busy}><CalendarDays className="size-3.5" />生成周报</Button>
              <Button size="sm" variant="secondary" onClick={() => genReport("monthly")} disabled={busy}><FileText className="size-3.5" />生成月报</Button>
            </div>
          </Card>
          {brain?.reports && [...brain.reports].reverse().map((r: GrowthReport) => (
            <Card key={r.id}>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">{r.title}</p>
              <p className="mt-1 text-[11px] text-slate-500">{r.summary}</p>
              {r.sections.map((s) => <div key={s.title} className="mt-1.5"><p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">{s.title}</p><p className="whitespace-pre-wrap text-[11px] text-slate-600 dark:text-slate-300">{s.content}</p></div>)}
            </Card>
          ))}
        </div>
      )}

      {/* 成长知识库 */}
      {tab === "knowledge" && (
        <div className="mt-3 space-y-3">
          <Card className="border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-1.5">
              <Sparkles className="size-4 text-amber-500" />
              <p className="text-xs font-semibold text-slate-900 dark:text-white">AI 人生洞察</p>
              <button onClick={runProactive} disabled={busy} className="ml-auto rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-600 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300">主动扫描</button>
            </div>
            <div className="mt-1.5 space-y-1">
              {brain?.insights?.length ? [...brain.insights].reverse().slice(0, 10).map((i: GrowthInsight) => <p key={i.time + i.content} className="text-[11px] text-slate-600 dark:text-slate-300">· {i.time.slice(0, 10)} [{i.category}] {i.content}</p>) : <p className="text-[11px] text-slate-400">暂无洞察（AI 会主动发现成长问题）</p>}
            </div>
          </Card>
          {brain?.knowledge && brain.knowledge.length > 0 && (
            <Card>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">成长知识库（{brain.knowledge.length}）</p>
              <div className="mt-1.5 space-y-1">
                {[...brain.knowledge].reverse().slice(0, 30).map((k: KnowledgeEntry) => <p key={k.id} className="text-[11px] text-slate-600 dark:text-slate-300">· <span className="rounded bg-slate-100 px-1 text-[9px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">{k.category}</span> {k.title}</p>)}
              </div>
            </Card>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-[11px] text-rose-500">{error}</p>}
    </div>
  );
}
