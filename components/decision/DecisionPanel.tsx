"use client";

import { useMemo, useState } from "react";
import { Brain, ClipboardList, FlaskConical, GitCompare, Scale, Sparkles, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SelectField, TextArea, TextField } from "@/components/ui/FormField";
import {
  ABILITY_LABELS,
  DECISION_LABELS,
  WEAKNESS_LABELS,
  DecisionService,
} from "@/lib/decision";
import { createApiRunAi } from "@/lib/research";
import type {
  DecisionType,
  ValidationResultInput,
  ValidationTaskInput,
} from "@/lib/decision";
import type { Opportunity } from "@/lib/types";
import type { ResearchRun } from "@/lib/research";
import { useDecisionData } from "@/lib/decision/hooks/use-decision-data";
import { getDecisionRepository, getResearchRepository } from "@/lib/repository/provider";
import { formatScore } from "@/lib/utils/format";


const DECISION_OPTIONS: DecisionType[] = ["proceed", "validate", "continue_research", "pause", "abandon"];
const STATUS_OPTIONS = ["pending", "running", "completed", "failed", "cancelled"] as const;
const DIMENSIONS = ["demand", "market", "competition", "willingnessToPay", "moat", "customerAcquisition", "risk"];

const EMPTY_JUDGMENT = {
  why: "",
  coreJudgment: "",
  keyEvidence: "",
  biggestRisk: "",
  mostImportantAssumption: "",
  expectedOutcome: "",
  differentJudgment: "",
};

/** 商业决策与验证闭环（V0.3-C） */
export function DecisionPanel({ opportunity, run }: { opportunity: Opportunity; run?: ResearchRun }) {
  const decisionData = useDecisionData(opportunity.id);
  const data = decisionData.data;
  const decisions = data.decisions
    .filter((d) => d.opportunityId === opportunity.id)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const decision = decisions[0];
  const review = decision ? data.reviews.find((r) => r.decisionId === decision.id) : undefined;
  const plan = decision ? data.plans.find((p) => p.decisionId === decision.id) : undefined;
  const results = plan ? data.results.filter((r) => r.planId === plan.id) : [];
  const updates = decision ? data.updates.filter((u) => u.decisionId === decision.id) : [];
  const events = data.events.filter((e) => e.opportunityId === opportunity.id);

  const service = useMemo(
    () =>
      new DecisionService({
        decisionRepository: getDecisionRepository(),
        researchRepository: getResearchRepository(),
        runAi: createApiRunAi(),
        userId: "local-user",
      }),
    [],
  );

  // 表单状态
  const [decisionType, setDecisionType] = useState<DecisionType>("validate");
  const [differentFromAi, setDifferentFromAi] = useState(false);
  const [judgment, setJudgment] = useState({ ...EMPTY_JUDGMENT });
  const [busy, setBusy] = useState<string>("");
  const [error, setError] = useState("");

  // 验证计划草稿
  const [draftTasks, setDraftTasks] = useState<ValidationTaskInput[]>([]);
  const [taskForm, setTaskForm] = useState({
    assumption: "",
    hypothesis: "",
    method: "",
    sampleSize: "",
    successCriteria: "",
    failureCriteria: "",
    deadline: "",
    costEstimate: "",
    owner: "",
    relatedDimension: "willingnessToPay",
  });
  const [resultForm, setResultForm] = useState<Record<string, { actualSample: string; actualResult: string; userFeedback: string; actualConversionRate: string; actualRevenue: string; actualCost: string; otherEvidence: string; outcome: string }>>({});

  const setField = (key: keyof typeof judgment, value: string) => setJudgment((prev) => ({ ...prev, [key]: value }));
  const setTaskField = (key: keyof typeof taskForm, value: string) => setTaskForm((prev) => ({ ...prev, [key]: value }));

  async function handleCreateDecision() {
    setBusy("decision");
    setError("");
    try {
      await service.createDecision({
        opportunityId: opportunity.id,
        decision: decisionType,
        differentFromAi,
        judgment: {
          why: judgment.why,
          coreJudgment: judgment.coreJudgment,
          keyEvidence: judgment.keyEvidence,
          biggestRisk: judgment.biggestRisk,
          mostImportantAssumption: judgment.mostImportantAssumption,
          expectedOutcome: judgment.expectedOutcome,
          differentJudgment: differentFromAi ? judgment.differentJudgment : undefined,
        },
      });
      if (typeof window !== "undefined") window.dispatchEvent(new Event("storage"));
    } catch (err) {
      setError((err as Error).message?.slice(0, 200) ?? "创建决策失败");
    } finally {
      setBusy("");
    }
  }

  async function handleReview() {
    if (!decision) return;
    setBusy("review");
    setError("");
    try {
      await service.reviewDecision(decision.id, { name: opportunity.name, description: opportunity.description });
      if (typeof window !== "undefined") window.dispatchEvent(new Event("storage"));
    } catch (err) {
      setError((err as Error).message?.slice(0, 200) ?? "AI 评审失败");
    } finally {
      setBusy("");
    }
  }

  async function handleAddTask() {
    if (!taskForm.assumption.trim() || !taskForm.hypothesis.trim()) return;
    setDraftTasks((prev) => [...prev, { ...taskForm, relatedDimension: taskForm.relatedDimension as ValidationTaskInput["relatedDimension"] }]);
    setTaskForm({
      assumption: "", hypothesis: "", method: "", sampleSize: "", successCriteria: "",
      failureCriteria: "", deadline: "", costEstimate: "", owner: "", relatedDimension: "willingnessToPay",
    });
  }

  async function handleCreatePlan() {
    if (!decision) return;
    setBusy("plan");
    setError("");
    try {
      await service.createValidationPlan({
        decisionId: decision.id,
        opportunityId: opportunity.id,
        tasks: draftTasks,
      });
      if (typeof window !== "undefined") window.dispatchEvent(new Event("storage"));
      setDraftTasks([]);
    } catch (err) {
      setError((err as Error).message?.slice(0, 200) ?? "创建验证计划失败");
    } finally {
      setBusy("");
    }
  }

  async function handleStatus(taskId: string, status: string) {
    setBusy(`status-${taskId}`);
    try {
      await service.updateTaskStatus(taskId, status as "pending" | "running" | "completed" | "failed" | "cancelled");
      if (typeof window !== "undefined") window.dispatchEvent(new Event("storage"));
    } finally {
      setBusy("");
    }
  }

  async function handleSubmitResult(taskId: string) {
    const f = resultForm[taskId];
    if (!f || !f.actualResult.trim()) return;
    setBusy(`result-${taskId}`);
    setError("");
    const input: ValidationResultInput = {
      taskId,
      actualSample: f.actualSample,
      actualResult: f.actualResult,
      userFeedback: f.userFeedback,
      actualConversionRate: f.actualConversionRate ? Number(f.actualConversionRate) : undefined,
      actualRevenue: f.actualRevenue ? Number(f.actualRevenue) : undefined,
      actualCost: f.actualCost ? Number(f.actualCost) : undefined,
      otherEvidence: f.otherEvidence,
      outcome: f.outcome as "confirmed" | "rejected" | "uncertain",
      submittedBy: "local-user",
    };
    try {
      await service.submitValidationResult(input);
      if (typeof window !== "undefined") window.dispatchEvent(new Event("storage"));
    } catch (err) {
      setError((err as Error).message?.slice(0, 200) ?? "提交验证结果失败");
    } finally {
      setBusy("");
    }
  }

  async function handleScoreV2() {
    if (!decision) return;
    setBusy("score");
    setError("");
    try {
      await service.applyValidationToScore(decision.id);
      if (typeof window !== "undefined") window.dispatchEvent(new Event("storage"));
    } catch (err) {
      setError((err as Error).message?.slice(0, 200) ?? "评分更新失败");
    } finally {
      setBusy("");
    }
  }

  if (!run?.report) {
    return (
      <Card className="mt-3">
        <div className="flex items-center gap-2">
          <Scale className="size-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">商业决策与验证</h3>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">请先完成 AI 研究，才能进行商业决策与验证闭环。</p>
      </Card>
    );
  }

  const canValidate = decision && (decision.decision === "proceed" || decision.decision === "validate");
  const latestScore = run.scoreHistory[run.scoreHistory.length - 1];

  return (
    <div className="mt-3 space-y-3">
      {/* 决策 */}
      {!decision ? (
        <Card>
          <div className="flex items-center gap-2">
            <Scale className="size-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">你的商业决策</h3>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            AI 研究只提供参考（当前评分 {latestScore ? formatScore(latestScore.overall_score) : "-"}）。最终决定权在你。
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {DECISION_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDecisionType(d)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition-colors ${
                  decisionType === d
                    ? "bg-indigo-600 text-white ring-indigo-600"
                    : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700"
                }`}
              >
                {DECISION_LABELS[d]}
              </button>
            ))}
          </div>
          <label className="mt-3 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={differentFromAi} onChange={(e) => setDifferentFromAi(e.target.checked)} />
            我有不同判断（与 AI 评分/建议不一致）
          </label>
          {differentFromAi ? (
            <TextArea label="我的不同判断" id="different-judgment" className="mt-2 min-h-16" placeholder="说明你与 AI 判断不同的理由…" value={judgment.differentJudgment} onChange={(e) => setField("differentJudgment", e.target.value)} />
          ) : null}
          <div className="mt-3 space-y-2">
            <TextArea label="为什么做/不做" id="judgment-why" className="min-h-14" value={judgment.why} onChange={(e) => setField("why", e.target.value)} placeholder="说明你的核心理由…" />
            <TextArea label="核心判断" id="judgment-core" className="min-h-14" value={judgment.coreJudgment} onChange={(e) => setField("coreJudgment", e.target.value)} />
            <TextArea label="关键证据" id="judgment-evidence" className="min-h-14" value={judgment.keyEvidence} onChange={(e) => setField("keyEvidence", e.target.value)} />
            <TextArea label="最大风险" id="judgment-risk" className="min-h-14" value={judgment.biggestRisk} onChange={(e) => setField("biggestRisk", e.target.value)} />
            <TextArea label="最重要假设" id="judgment-assumption" className="min-h-14" value={judgment.mostImportantAssumption} onChange={(e) => setField("mostImportantAssumption", e.target.value)} />
            <TextArea label="预计结果" id="judgment-expected" className="min-h-14" value={judgment.expectedOutcome} onChange={(e) => setField("expectedOutcome", e.target.value)} />
          </div>
          <Button type="button" className="mt-3 w-full" disabled={busy === "decision"} onClick={handleCreateDecision}>
            确认决策
          </Button>
        </Card>
      ) : (
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="size-4 text-indigo-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">我的决策：{DECISION_LABELS[decision.decision]}</h3>
            </div>
            <span className="text-[10px] text-slate-400">{decision.differentFromAi ? "与 AI 判断不同" : "与 AI 判断一致"}</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <div className="rounded-lg bg-slate-50 px-2 py-1.5 dark:bg-slate-800/60">
              AI 当时评分（v{decision.aiScoreSnapshot?.version}）：{formatScore(decision.aiScoreSnapshot?.overall_score)}
            </div>
            <div className="rounded-lg bg-slate-50 px-2 py-1.5 dark:bg-slate-800/60">
              用户预计结果：{decision.judgment.expectedOutcome || "—"}
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            核心判断：{decision.judgment.coreJudgment || "—"} · 最大风险：{decision.judgment.biggestRisk || "—"} · 最重要假设：{decision.judgment.mostImportantAssumption || "—"}
          </p>
        </Card>
      )}

      {/* AI Examiner */}
      {decision && !review ? (
        <Card>
          <div className="flex items-center gap-2">
            <Brain className="size-4 text-violet-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">AI Examiner 评审</h3>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">AI 将评审你的判断：事实错误 / 证据不足 / 逻辑跳跃 / 过度乐观 / 风险低估 / 需求付费竞争误判 / 商业模式 / 验证方案。</p>
          <Button type="button" className="mt-3 w-full" disabled={busy === "review"} onClick={handleReview}>
            <Sparkles className="size-4" />
            开始 AI 评审
          </Button>
        </Card>
      ) : null}

      {review ? (
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="size-4 text-violet-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">AI Examiner 评审</h3>
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white">{formatScore(review.score)}</span>
          </div>
          {review.provider_degraded ? (
            <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">高级模型（OpenAI）不可用，本次评审由 {review.provider} 生成。</p>
          ) : null}
          {review.strengths.length > 0 ? (
            <div className="mt-2">
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">优点</p>
              <ul className="mt-1 space-y-0.5 text-xs text-slate-600 dark:text-slate-300">{review.strengths.map((s, i) => <li key={i}>· {s}</li>)}</ul>
            </div>
          ) : null}
          {review.weaknesses.length > 0 ? (
            <div className="mt-2">
              <p className="text-xs font-medium text-rose-700 dark:text-rose-400">问题</p>
              <ul className="mt-1 space-y-1">
                {review.weaknesses.map((w, i) => (
                  <li key={i} className="text-xs text-slate-600 dark:text-slate-300">
                    <span className="rounded bg-rose-50 px-1 py-0.5 text-[10px] font-medium text-rose-600 dark:bg-rose-950 dark:text-rose-300">{WEAKNESS_LABELS[w.category]}</span> {w.description}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {review.reasoningGaps.length > 0 ? (
            <div className="mt-2">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">逻辑缺口</p>
              <ul className="mt-1 space-y-0.5 text-xs text-slate-600 dark:text-slate-300">{review.reasoningGaps.map((g, i) => <li key={i}>· {g}</li>)}</ul>
            </div>
          ) : null}
          {review.missingEvidence.length > 0 ? (
            <div className="mt-2">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">缺少的证据</p>
              <ul className="mt-1 space-y-0.5 text-xs text-slate-600 dark:text-slate-300">{review.missingEvidence.map((m, i) => <li key={i}>· {m}</li>)}</ul>
            </div>
          ) : null}
          {review.recommendedActions.length > 0 ? (
            <div className="mt-2">
              <p className="text-xs font-medium text-indigo-700 dark:text-indigo-400">建议</p>
              <ul className="mt-1 space-y-0.5 text-xs text-slate-600 dark:text-slate-300">{review.recommendedActions.map((a, i) => <li key={i}>· {a}</li>)}</ul>
            </div>
          ) : null}
          {review.abilitySignals.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {review.abilitySignals.map((s, i) => (
                <span key={i} className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${s.signal === "positive" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : s.signal === "negative" ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                  {ABILITY_LABELS[s.skill]}{s.signal === "positive" ? " +" : s.signal === "negative" ? " −" : " ±"}
                </span>
              ))}
            </div>
          ) : null}
        </Card>
      ) : null}

      {/* 验证计划 */}
      {canValidate ? (
        <Card>
          <div className="flex items-center gap-2">
            <ClipboardList className="size-4 text-sky-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">验证计划</h3>
          </div>
          {!plan ? (
            <>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">创建验证任务：假设 → 假设描述 → 方法 → 样本 → 成功/失败标准 → 截止 → 成本 → 负责人 → 关联评分维度。</p>
              <div className="mt-2 space-y-2">
                <TextField label="假设" id="task-assumption" value={taskForm.assumption} onChange={(e) => setTaskField("assumption", e.target.value)} placeholder="要验证的假设" />
                <TextField label="假设描述（hypothesis）" id="task-hypothesis" value={taskForm.hypothesis} onChange={(e) => setTaskField("hypothesis", e.target.value)} placeholder="可验证的描述" />
                <TextField label="验证方法" id="task-method" value={taskForm.method} onChange={(e) => setTaskField("method", e.target.value)} placeholder="访谈 / 投放测试 / 问卷…" />
                <div className="grid grid-cols-2 gap-2">
                  <TextField label="样本量" id="task-sample" value={taskForm.sampleSize} onChange={(e) => setTaskField("sampleSize", e.target.value)} placeholder="10 位用户" />
                  <TextField label="成本估算" id="task-cost" value={taskForm.costEstimate} onChange={(e) => setTaskField("costEstimate", e.target.value)} placeholder="¥500" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <TextField label="成功标准" id="task-success" value={taskForm.successCriteria} onChange={(e) => setTaskField("successCriteria", e.target.value)} />
                  <TextField label="失败标准" id="task-failure" value={taskForm.failureCriteria} onChange={(e) => setTaskField("failureCriteria", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <TextField label="截止日期" id="task-deadline" value={taskForm.deadline} onChange={(e) => setTaskField("deadline", e.target.value)} placeholder="2026-09-30" />
                  <TextField label="负责人" id="task-owner" value={taskForm.owner} onChange={(e) => setTaskField("owner", e.target.value)} />
                </div>
                <SelectField label="关联评分维度" id="task-dimension" value={taskForm.relatedDimension} onChange={(e) => setTaskField("relatedDimension", e.target.value)}>
                  {DIMENSIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                </SelectField>
                <Button type="button" variant="secondary" size="sm" onClick={handleAddTask}>添加验证任务（{draftTasks.length}）</Button>
              </div>
              {draftTasks.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {draftTasks.map((t, i) => <li key={i} className="text-[11px] text-slate-500 dark:text-slate-400">· {t.assumption} → {t.method}</li>)}
                </ul>
              ) : null}
              <Button type="button" className="mt-3 w-full" disabled={busy === "plan" || draftTasks.length === 0} onClick={handleCreatePlan}>
                创建验证计划
              </Button>
            </>
          ) : (
            <div className="mt-2 space-y-2">
              {plan.tasks.map((task) => {
                const res = results.find((r) => r.taskId === task.id);
                const f = resultForm[task.id] ?? { actualSample: "", actualResult: "", userFeedback: "", actualConversionRate: "", actualRevenue: "", actualCost: "", otherEvidence: "", outcome: "uncertain" };
                return (
                  <div key={task.id} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{task.assumption}</p>
                      <SelectField label="" id={`status-${task.id}`} className="!w-28 !py-1 text-[11px]" value={task.status} onChange={(e) => handleStatus(task.id, e.target.value)}>
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </SelectField>
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-400">{task.method} · 样本 {task.sampleSize} · {task.deadline}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">成功：{task.successCriteria} · 失败：{task.failureCriteria}</p>
                    {res ? (
                      <p className="mt-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                        ✓ 已提交结果：{res.actualResult}（{res.outcome}）
                      </p>
                    ) : (
                      <div className="mt-2 space-y-1.5">
                        <TextField label="实际样本" id={`rs-${task.id}`} className="!py-1 text-[11px]" value={f.actualSample} onChange={(e) => setResultForm((prev) => ({ ...prev, [task.id]: { ...f, actualSample: e.target.value } }))} />
                        <TextField label="实际结果" id={`rr-${task.id}`} className="!py-1 text-[11px]" value={f.actualResult} onChange={(e) => setResultForm((prev) => ({ ...prev, [task.id]: { ...f, actualResult: e.target.value } }))} />
                        <TextField label="用户反馈" id={`rf-${task.id}`} className="!py-1 text-[11px]" value={f.userFeedback} onChange={(e) => setResultForm((prev) => ({ ...prev, [task.id]: { ...f, userFeedback: e.target.value } }))} />
                        <div className="grid grid-cols-3 gap-1.5">
                          <TextField label="转化率" id={`rc-${task.id}`} className="!py-1 text-[11px]" value={f.actualConversionRate} onChange={(e) => setResultForm((prev) => ({ ...prev, [task.id]: { ...f, actualConversionRate: e.target.value } }))} />
                          <TextField label="收入" id={`ri-${task.id}`} className="!py-1 text-[11px]" value={f.actualRevenue} onChange={(e) => setResultForm((prev) => ({ ...prev, [task.id]: { ...f, actualRevenue: e.target.value } }))} />
                          <TextField label="成本" id={`rco-${task.id}`} className="!py-1 text-[11px]" value={f.actualCost} onChange={(e) => setResultForm((prev) => ({ ...prev, [task.id]: { ...f, actualCost: e.target.value } }))} />
                        </div>
                        <SelectField label="结论" id={`ro-${task.id}`} className="!py-1 text-[11px]" value={f.outcome} onChange={(e) => setResultForm((prev) => ({ ...prev, [task.id]: { ...f, outcome: e.target.value } }))}>
                          <option value="confirmed">证实</option>
                          <option value="rejected">证伪</option>
                          <option value="uncertain">不确定</option>
                        </SelectField>
                        <Button type="button" variant="secondary" size="sm" disabled={busy === `result-${task.id}` || !f.actualResult.trim()} onClick={() => handleSubmitResult(task.id)}>
                          提交验证结果（真实数据）
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      ) : null}

      {/* Score v2 */}
      {plan && results.length > 0 && updates.length === 0 ? (
        <Card>
          <div className="flex items-center gap-2">
            <GitCompare className="size-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">使用真实验证结果更新评分</h3>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">将生成 Score v2（变化前/变化后/原因/新增证据/验证结果全部保留）。</p>
          <Button type="button" className="mt-3 w-full" disabled={busy === "score"} onClick={handleScoreV2}>
            更新为 Score v{latestScore ? latestScore.version + 1 : 2}
          </Button>
        </Card>
      ) : null}

      {/* Score 历史与更新记录 */}
      {run.scoreHistory.length > 1 || updates.length > 0 ? (
        <Card>
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">评分版本</h3>
          </div>
          <div className="mt-2 space-y-2">
            {run.scoreHistory.map((v) => (
              <div key={v.version} className="rounded-lg bg-slate-50 px-2 py-1.5 text-[11px] dark:bg-slate-800/60">
                Score v{v.version}：{formatScore(v.overall_score)}（置信度 {Math.round(v.confidence * 100)}%）
                {v.reason ? <span className="block text-[10px] text-slate-400">{v.reason}</span> : null}
              </div>
            ))}
            {updates.map((u, i) => (
              <div key={i} className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-2 py-1.5 text-[11px] dark:border-emerald-900 dark:bg-emerald-950/30">
                <p className="font-medium text-emerald-700 dark:text-emerald-300">v{u.fromVersion} → v{u.toVersion}：{formatScore(u.before.overall_score)} → {formatScore(u.after.overall_score)}</p>
                <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{u.reason}</p>
                {u.newEvidence.map((e, j) => (
                  <p key={j} className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">新增证据：{e.claim}</p>
                ))}
                {u.validationResults.map((vr, j) => (
                  <p key={j} className="text-[10px] text-slate-400">验证：{vr.outcome} · {vr.note}</p>
                ))}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {/* Learning Events */}
      {events.length > 0 ? (
        <details className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
          <summary className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <FlaskConical className="size-3.5" />
            学习事件（{events.length}）—— 未来能力画像数据源
          </summary>
          <ul className="mt-2 space-y-1">
            {events.slice(-10).map((e) => (
              <li key={e.id} className="text-[10px] text-slate-500 dark:text-slate-400">
                [{ABILITY_LABELS[e.skill] ?? e.skill}] {e.signal} · {e.evidence}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {error ? <p className="text-xs text-rose-500" role="alert">{error}</p> : null}
      <p className="text-center text-[10px] text-slate-400">AI 不是最终决策者：AI 研究 → 用户判断 → 真实验证 → AI 复盘。验证结果只由你输入，AI 不会伪造。</p>
    </div>
  );
}
