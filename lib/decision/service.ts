/**
 * DecisionService：商业决策与验证闭环的业务入口。
 * AI 研究 → 用户判断 → 真实验证 → AI 复盘 → Score v2 → LearningEvent。
 * - 验证结果只由用户输入（AI 不得伪造）
 * - Score v2 使用真实验证结果确定性计算
 * - 客户端：localStorage repository + createApiRunAi；未来 Supabase 只换 repository
 */
import type { RunAiFn } from "../research/ai-call";
import { LocalResearchRepository } from "../research/repository";
import type { ResearchRepository } from "../research/repository";
import { reviewUserDecision } from "./examiner";
import { generateLearningEvents } from "./learning";
import { LocalDecisionRepository } from "./repository";
import type { DecisionRepository } from "./repository";
import { computeScoreV2 } from "./scoring";
import { uid } from "../store/storage";
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
    const review = await reviewUserDecision({ runAi: this.runAi, opportunity, decision });
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

  /** 验证任务状态流转 */
  async updateTaskStatus(taskId: string, status: ValidationTaskStatus): Promise<ValidationTask> {
    const plan = await this.getPlanByTask(taskId);
    if (!plan) throw new Error("验证任务不存在");
    const task = plan.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error("验证任务不存在");
    task.status = status;
    task.updatedAt = new Date().toISOString();
    plan.updatedAt = task.updatedAt;
    await this.decisions.savePlan(plan);
    return task;
  }

  // ---------- 4. Validation Result（仅用户输入，AI 不参与） ----------

  /** 提交验证结果（真实数据；绝不调用 AI 生成） */
  async submitValidationResult(input: ValidationResultInput): Promise<{ result: ValidationResult; events: LearningEvent[] }> {
    const plan = await this.getPlanByTask(input.taskId);
    if (!plan) throw new Error("验证任务不存在");
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
    const decision = await this.decisions.getDecision(plan.decisionId);
    const events = generateLearningEvents({
      userId: this.userId,
      opportunityId: plan.opportunityId,
      decision: decision ?? undefined,
      results: [result],
    });
    await this.decisions.saveEvents(events);
    return { result, events };
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