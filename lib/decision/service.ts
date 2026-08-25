/**
 * DecisionService：商业决策与验证闭环的业务入口。
 * AI 研究 → 用户判断 → 真实验证 → AI 复盘 → Score v2 → LearningEvent。
 * - 验证结果只由用户输入（AI 不得伪造）
 * - Score v2 使用真实验证结果确定性计算
 * - 客户端：localStorage repository + createApiRunAi；未来 Supabase 只换 repository
 */
import type { RunAiFn } from "../research/ai-call";
import type { InvestmentThesis, UnitEconomicsModel } from "../research/types";
import { LocalResearchRepository } from "../research/repository";
import type { ResearchRepository } from "../research/repository";
import { reviewUserDecision } from "./examiner";
import { generateInvestmentThesis as buildInvestmentThesis } from "./thesis";
import { generateUnitEconomics as buildUnitEconomics } from "./unit-economics";
import { generateBusinessJudgment as buildBusinessJudgment } from "./judgment";
import { createExecutionLearningEvents, generateLearningEvents } from "./learning";
import {
  applyTaskTransition,
  buildExecutionSummary,
  isOverdue,
  ValidationExecutionError,
} from "./execution";
import { LocalDecisionRepository } from "./repository";
import type { DecisionRepository } from "./repository";
import { computeScoreV2 } from "./scoring";
import { uid } from "../store/storage";
import type { BusinessJudgment } from "../research/types";
import type {
  DecisionType,
  LearningEvent,
  ScoreUpdate,
  UserDecision,
  UserDecisionReview,
  ValidationPlan,
  ValidationResult,
  ValidationResultInput,
  ValidationTask,
  ValidationTaskInput,
  ValidationTaskStatus,
} from "./types";

export interface DecisionServiceDeps {
  decisionRepository?: DecisionRepository;
  researchRepository?: ResearchRepository;
  /** AI 调用函数（Examiner 用；客户端传 createApiRunAi()，测试传 fake） */
  runAi: RunAiFn;
  userId?: string;
}

export class DecisionService {
  private readonly decisions: DecisionRepository;
  private readonly research: ResearchRepository;
  private readonly runAi: RunAiFn;
  private readonly userId: string;

  constructor(deps: DecisionServiceDeps) {
    this.decisions = deps.decisionRepository ?? new LocalDecisionRepository();
    this.research = deps.researchRepository ?? new LocalResearchRepository();
    this.runAi = deps.runAi;
    this.userId = deps.userId ?? "local-user";
  }

  private async getPlanByTask(taskId: string): Promise<ValidationPlan | undefined> {
    const plans = await this.decisions.listPlans();
    return plans.find((p) => p.tasks.some((t) => t.id === taskId));
  }

  // ---------- 1. Decision + User Judgment ----------

  /** 创建决策（记录 AI 当时怎么判断 + 用户判断） */
  async createDecision(input: {
    opportunityId: string;
    decision: DecisionType;
    differentFromAi: boolean;
    judgment: UserDecision["judgment"];
  }): Promise<{ decision: UserDecision; events: LearningEvent[] }> {
    const run = await this.research.getRun(input.opportunityId);
    const latest = run?.scoreHistory[run.scoreHistory.length - 1];
    const decision: UserDecision = {
      id: uid(),
      opportunityId: input.opportunityId,
      runId: run?.runId,
      decision: input.decision,
      differentFromAi: input.differentFromAi,
      judgment: input.judgment,
      aiScoreSnapshot: latest
        ? { version: latest.version, overall_score: latest.overall_score, confidence: latest.confidence }
        : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.decisions.saveDecision(decision);
    const events = generateLearningEvents({ userId: this.userId, opportunityId: input.opportunityId, decision });
    await this.decisions.saveEvents(events);
    return { decision, events };
  }

  // ---------- 2. AI Examiner ----------

  /** AI Examiner 评审用户判断 */
  async reviewDecision(
    decisionId: string,
    opportunity: { name: string; description: string },
  ): Promise<{ review: UserDecisionReview; events: LearningEvent[] }> {
    const decision = await this.decisions.getDecision(decisionId);
    if (!decision) throw new Error("决策不存在");
    // V0.4.1 Phase 6.1B：从研究结果读取领域，注入 Examiner（保持一致，避免重复检测）
    const run = await this.research.getRun(decision.opportunityId);
    const domain = run?.report?.meta?.domain
      ? { id: run.report.meta.domain.id, label: run.report.meta.domain.label }
      : undefined;
    const review = await reviewUserDecision({ runAi: this.runAi, opportunity, decision, domain });
    await this.decisions.saveReview(review);
    const events = generateLearningEvents({ userId: this.userId, opportunityId: decision.opportunityId, decision, review });
    await this.decisions.saveEvents(events);
    return { review, events };
  }

  // ---------- 3. Validation Plan ----------

  /** 创建验证计划（proceed/validate 后） */
  async createValidationPlan(input: { decisionId: string; opportunityId: string; tasks: ValidationTaskInput[] }): Promise<ValidationPlan> {
    const planId = uid();
    const now = new Date().toISOString();
    const plan: ValidationPlan = {
      id: planId,
      decisionId: input.decisionId,
      opportunityId: input.opportunityId,
      tasks: input.tasks.map((t) => ({
        id: uid(),
        planId,
        ...t,
        status: "pending" as const,
        createdAt: now,
        updatedAt: now,
      })),
      createdAt: now,
      updatedAt: now,
    };
    await this.decisions.savePlan(plan);
    return plan;
  }

  /** 验证任务状态流转（V0.4.1 Phase 7B-2：状态机 + 历史记录 + actor；非法转移抛错） */
  async updateTaskStatus(taskId: string, status: ValidationTaskStatus, opts: { actor?: string; note?: string } = {}): Promise<ValidationTask> {
    const plan = await this.getPlanByTask(taskId);
    if (!plan) throw new Error("验证任务不存在");
    const task = plan.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error("验证任务不存在");
    const next = applyTaskTransition(task, status, { actor: opts.actor ?? "user", note: opts.note });
    if (next === task) return task; // 同状态 no-op
    plan.tasks = plan.tasks.map((t) => (t.id === taskId ? next : t));
    plan.updatedAt = next.updatedAt;
    await this.decisions.savePlan(plan);
    return next;
  }

  // ---------- 4.0 验证执行（V0.4.1 Phase 7B-2） ----------

  /** 开始验证任务（pending → running） */
  async startTask(taskId: string, opts: { actor?: string; note?: string } = {}): Promise<ValidationTask> {
    return this.transitionTask(taskId, "running", opts);
  }

  /** 完成验证任务（running → completed） */
  async completeTask(taskId: string, opts: { actor?: string; note?: string } = {}): Promise<ValidationTask> {
    return this.transitionTask(taskId, "completed", opts);
  }

  /** 标记验证任务失败（running → failed） */
  async failTask(taskId: string, reason?: string, opts: { actor?: string } = {}): Promise<ValidationTask> {
    return this.transitionTask(taskId, "failed", { actor: opts.actor, note: reason });
  }

  /** 取消验证任务（pending/running → cancelled） */
  async cancelTask(taskId: string, reason?: string, opts: { actor?: string } = {}): Promise<ValidationTask> {
    return this.transitionTask(taskId, "cancelled", { actor: opts.actor, note: reason });
  }

  /** 重试失败任务（failed → running） */
  async retryTask(taskId: string, opts: { actor?: string; note?: string } = {}): Promise<ValidationTask> {
    return this.transitionTask(taskId, "running", opts);
  }

  /** 统一转移入口（加载 plan → applyTaskTransition → 保存 + 学习事件） */
  private async transitionTask(taskId: string, to: ValidationTaskStatus, opts: { actor?: string; note?: string } = {}): Promise<ValidationTask> {
    const plan = await this.getPlanByTask(taskId);
    if (!plan) throw new Error("验证任务不存在");
    const task = plan.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error("验证任务不存在");
    const next = applyTaskTransition(task, to, { actor: opts.actor ?? "user", note: opts.note });
    if (next === task) return task;
    plan.tasks = plan.tasks.map((t) => (t.id === taskId ? next : t));
    plan.updatedAt = next.updatedAt;
    await this.decisions.savePlan(plan);

    const decision = await this.decisions.getDecision(plan.decisionId);
    const action =
      to === "running"
        ? "task_started"
        : to === "completed"
          ? "task_completed"
          : to === "failed"
            ? "task_failed"
            : to === "cancelled"
              ? "task_cancelled"
              : undefined;
    if (action) {
      const events = createExecutionLearningEvents({
        userId: this.userId,
        opportunityId: plan.opportunityId,
        decisionId: plan.decisionId,
        action,
        task: next,
        actor: opts.actor,
      });
      await this.decisions.saveEvents(events);
      void decision;
    }
    return next;
  }

  /** 执行摘要（计划级状态 + 进度 + 每任务状态/结果） */
  async getExecutionSummary(decisionId: string) {
    const plan = await this.decisions.getPlan(decisionId);
    if (!plan) throw new Error("验证计划不存在");
    const results = await this.decisions.listResults(plan.id);
    return buildExecutionSummary(plan, results);
  }

  /** 超期且未完成的任务（可限定决策） */
  async listOverdueTasks(decisionId?: string): Promise<ValidationTask[]> {
    const plans = decisionId
      ? (([await this.decisions.getPlan(decisionId)] as (ValidationPlan | undefined)[]).filter(Boolean) as ValidationPlan[])
      : await this.decisions.listPlans();
    const overdue: ValidationTask[] = [];
    for (const p of plans) for (const t of p.tasks) if (isOverdue(t)) overdue.push(t);
    return overdue;
  }

  // ---------- 4. Validation Result（仅用户输入，AI 不参与） ----------

  /** 提交验证结果（V0.4.1 Phase 7B-2：仅 running/completed 可提交；回写任务 resultId/outcome/状态历史） */
  async submitValidationResult(input: ValidationResultInput, opts: { actor?: string } = {}): Promise<{ result: ValidationResult; events: LearningEvent[] }> {
    const plan = await this.getPlanByTask(input.taskId);
    if (!plan) throw new Error("验证任务不存在");
    const task = plan.tasks.find((t) => t.id === input.taskId);
    if (!task) throw new Error("验证任务不存在");
    if (task.status === "cancelled") {
      throw new ValidationExecutionError(`任务状态 cancelled 不允许提交结果`);
    }
    const result: ValidationResult = {
      id: uid(),
      taskId: input.taskId,
      planId: plan.id,
      decisionId: plan.decisionId,
      opportunityId: plan.opportunityId,
      actualSample: input.actualSample,
      actualResult: input.actualResult,
      userFeedback: input.userFeedback,
      actualConversionRate: input.actualConversionRate,
      actualRevenue: input.actualRevenue,
      actualCost: input.actualCost,
      otherEvidence: input.otherEvidence,
      outcome: input.outcome,
      submittedBy: input.submittedBy || this.userId,
      submittedAt: new Date().toISOString(),
    };
    await this.decisions.saveResult(result);

    // 任务回写：提交结果 = 自动完成（cancelled 除外）；写入 resultId / outcome / completedAt / stateHistory
    const at = new Date().toISOString();
    const updated: ValidationTask =
      task.status === "completed"
        ? { ...task, resultId: result.id, outcome: result.outcome, updatedAt: at }
        : {
            ...task,
            status: "completed",
            resultId: result.id,
            outcome: result.outcome,
            startedAt: task.startedAt ?? at,
            completedAt: at,
            updatedAt: at,
            stateHistory: [
              ...(task.stateHistory ?? []),
              { from: task.status, to: "completed", at, actor: opts.actor ?? "user", note: "提交验证结果（自动完成）" },
            ],
          };
    plan.tasks = plan.tasks.map((t) => (t.id === input.taskId ? updated : t));
    plan.updatedAt = at;
    await this.decisions.savePlan(plan);

    const decision = await this.decisions.getDecision(plan.decisionId);
    const events = [
      ...generateLearningEvents({
        userId: this.userId,
        opportunityId: plan.opportunityId,
        decision: decision ?? undefined,
        results: [result],
      }),
      ...createExecutionLearningEvents({
        userId: this.userId,
        opportunityId: plan.opportunityId,
        decisionId: plan.decisionId,
        action: "result_submitted",
        task: updated,
        result,
        actor: opts.actor,
      }),
    ];
    await this.decisions.saveEvents(events);
    return { result, events };
  }

  // ---------- 4.5 Investment Thesis + Unit Economics（V0.4.1 Phase 7A） ----------

  /** 生成投资论点并保存到研究报告（report.jsonb，无需改 schema） */
  async generateInvestmentThesis(opportunityId: string): Promise<InvestmentThesis> {
    const run = await this.research.getRun(opportunityId);
    if (!run || !run.report) throw new Error("研究运行不存在或未完成");
    const thesis = await buildInvestmentThesis({
      runAi: this.runAi,
      report: run.report,
      runId: run.runId,
      opportunity: { id: opportunityId, name: run.report.opportunityName },
    });
    run.report.thesis = thesis;
    run.updatedAt = new Date().toISOString();
    await this.research.saveRun(run);
    return thesis;
  }

  /** 生成单位经济模型并保存到研究报告（Business Model Analyzer） */
  async generateUnitEconomics(opportunityId: string): Promise<UnitEconomicsModel> {
    const run = await this.research.getRun(opportunityId);
    if (!run || !run.report) throw new Error("研究运行不存在或未完成");
    const model = await buildUnitEconomics({
      runAi: this.runAi,
      report: run.report,
      runId: run.runId,
      opportunity: { id: opportunityId, name: run.report.opportunityName },
    });
    run.report.unitEconomics = model;
    run.updatedAt = new Date().toISOString();
    await this.research.saveRun(run);
    return model;
  }
  // ---------- 5. Score v2 ----------

  /** 使用真实验证结果计算 Score v2 并追加到研究运行的 scoreHistory */
  async applyValidationToScore(decisionId: string): Promise<{ next: ScoreUpdate["after"]; update: ScoreUpdate }> {
    const decision = await this.decisions.getDecision(decisionId);
    if (!decision) throw new Error("决策不存在");
    const run = await this.research.getRun(decision.opportunityId);
    if (!run || !run.report) throw new Error("研究运行不存在或未完成");
    const prev = run.scoreHistory[run.scoreHistory.length - 1];
    if (!prev) throw new Error("无评分版本");

    const plan = await this.decisions.getPlan(decisionId);
    if (!plan) throw new Error("验证计划不存在");
    const results = await this.decisions.listResults(plan.id);
    if (results.length === 0) throw new Error("暂无验证结果");

    const taskDimension: Record<string, string | undefined> = {};
    for (const t of plan.tasks) taskDimension[t.id] = t.relatedDimension;

    const { next, update } = computeScoreV2(prev, results, taskDimension);
    const persistedUpdate: ScoreUpdate = { ...update, decisionId };
    run.scoreHistory.push(next);
    run.updatedAt = new Date().toISOString();
    await this.research.saveRun(run);
    await this.decisions.saveScoreUpdate(persistedUpdate);

    const events = generateLearningEvents({
      userId: this.userId,
      opportunityId: decision.opportunityId,
      decision,
      results,
      scoreUpdate: persistedUpdate,
    });
    await this.decisions.saveEvents(events);
    return { next, update: persistedUpdate };
  }

  // ---------- 4. AI 商业判断（V0.9：决策型报告核心） ----------

  /** 生成 AI 商业判断：是否建议进入 / 切入方向 / 不建议做什么 / 90 天计划 / 首批客户 */
  async generateJudgment(opportunityId: string): Promise<BusinessJudgment> {
    const run = await this.research.getRun(opportunityId);
    if (!run || !run.report) throw new Error("研究运行不存在或未完成");
    const judgment = await buildBusinessJudgment({
      runAi: this.runAi,
      report: run.report,
      runId: run.runId,
      opportunity: { id: opportunityId, name: run.report.opportunityName },
    });
    run.report.judgment = judgment;
    run.updatedAt = new Date().toISOString();
    await this.research.saveRun(run);
    return judgment;
  }

  // ---------- 查询 ----------

  async listDecisions(opportunityId: string) {
    return this.decisions.listDecisions(opportunityId);
  }
  async getDecision(decisionId: string) {
    return this.decisions.getDecision(decisionId);
  }
  async getReview(decisionId: string) {
    return this.decisions.getReview(decisionId);
  }
  async getPlan(decisionId: string) {
    return this.decisions.getPlan(decisionId);
  }
  async listResults(planId: string) {
    return this.decisions.listResults(planId);
  }
  async listEvents(opportunityId?: string) {
    return this.decisions.listEvents(opportunityId);
  }
}