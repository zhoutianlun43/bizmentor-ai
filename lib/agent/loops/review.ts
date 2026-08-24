/**
 * Evening Review（晚间复盘，V0.4.2 Phase 9B-2）。
 * 输入：今日 Agent Run + 用户决策 + 执行结果 + Validation 结果 + Memory 记录。
 * 输出：DailyReview；**必须调用 MemoryEngine.recordDecision()** 沉淀 AI vs 用户 vs 实际。
 */
import { getCurrentUserId } from "../../identity/resolver";
import { collectState, toDateKey } from "./collect";
import type { LoopDeps } from "./collect";
import type { AgentRunRepository } from "../runs";
import type { DailyReview, DecisionComparison } from "./types";

export interface ReviewDeps extends LoopDeps {
  runs?: AgentRunRepository;
}

export async function generateEveningReview(deps: ReviewDeps, now: Date = new Date()): Promise<DailyReview> {
  const userId = deps.userId ?? getCurrentUserId();
  const date = toDateKey(now);
  const state = await collectState(deps, now);

  // 1) 沉淀决策记忆（幂等 upsert）——AI prediction vs User prediction vs Actual result
  if (deps.memory && deps.decisionRepository) {
    for (const { decision } of state.decisions) {
      await deps.memory.recordDecision(decision.id);
    }
  }

  // 2) 对照：从 Memory 记录读取（已含 AI/用户/实际）
  const records = deps.memory ? await deps.memory.list() : [];
  const decisionComparison: DecisionComparison[] = records.map((r) => ({
    decisionId: r.decisionId,
    opportunityName: r.opportunityName,
    domain: r.domain,
    aiPrediction: r.aiPrediction?.score,
    userJudgment: r.userPrediction?.coreJudgment ?? "",
    outcome: r.outcome,
    scoreDelta: r.scoreDelta,
  }));

  // 3) 今日完成动作：今日 Agent Run + 今日完成的任务
  const completedActions: string[] = [];
  const todayRuns = deps.runs ? (await deps.runs.list()).filter((run) => toDateKey(new Date(run.startedAt)) === date) : [];
  for (const run of todayRuns) {
    completedActions.push(`Agent 运行（${run.trigger}）：${run.toolsUsed.map((t) => t.toolId).join(" → ") || "无工具"}`);
  }
  for (const p of state.plans) {
    for (const t of p.tasks) {
      if (t.status === "completed" && t.completedAt && toDateKey(new Date(t.completedAt)) === date) {
        completedActions.push(`完成任务：${t.assumption.slice(0, 50)}`);
      }
    }
  }

  // 4) 经验沉淀 lessons
  const lessons: string[] = [];
  for (const r of state.rejectedResults) lessons.push(`假设被证伪：${r.actualResult.slice(0, 60)}`);
  for (const t of state.failedTasks) lessons.push(`任务失败：${t.assumption.slice(0, 50)}（建议复盘方法）`);
  for (const u of state.scoreDrops) lessons.push(`评分下降 ${u.before.overall_score}→${u.after.overall_score}：${u.reason.slice(0, 40)}`);
  if (lessons.length === 0) lessons.push("今日无重大证伪/失败，经验平稳。");

  // 5) 明日动作
  const tomorrowActions: string[] = [];
  for (const t of state.overdueTasks) tomorrowActions.push(`处理超期任务：${t.assumption.slice(0, 40)}`);
  for (const d of state.decisions) {
    if (!d.hasPlan) tomorrowActions.push(`为决策「${d.decision.decision}」创建验证计划`);
  }
  if (tomorrowActions.length === 0) tomorrowActions.push("按计划推进下一步研究/验证。");

  return {
    id: `review-${date}-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    date,
    completedActions: completedActions.slice(0, 20),
    decisionComparison,
    lessons: lessons.slice(0, 10),
    tomorrowActions: tomorrowActions.slice(0, 10),
    createdAt: now.toISOString(),
  };
}