/**
 * 项目每日 CEO 简报（V1.9）：每次进入项目首页显示「今日项目状态」。
 * 确定性构建（零额外 LLM 成本），基于 认知卡 + 项目大脑 实时聚合。
 */
import type { ProjectCognitionProfile, ProjectDailyBrief, ProjectMemory } from "./types";

export function buildDailyBrief(
  cognition: ProjectCognitionProfile,
  memory: ProjectMemory,
  date = new Date(),
): ProjectDailyBrief {
  const today = date.toISOString().slice(0, 10);
  const factsToday = (memory.facts ?? [])
    .slice(-3)
    .map((f) => (f.type === "FACT" ? f.content : `[${f.type}] ${f.content}`));

  const openDecisions = (memory.decisionLog ?? []).filter((d) => d.status === "executing" || d.status === "revised").length;

  const topRisks: string[] = [];
  topRisks.push(...(cognition.mainRisks ?? []).slice(0, 2));
  const recentChanges = (memory.changes ?? []).filter((c) => c.includes("风险")).slice(-2);
  topRisks.push(...recentChanges);
  const uniqueRisks = Array.from(new Set(topRisks)).slice(0, 3);

  const metricLines = cognition.projectMetrics.keyMetrics
    .map((m) => `${m.name}：当前 ${m.current} → 目标 ${m.target}`)
    .join("；");

  const forbidden = cognition.strategyStatus.forbiddenActions.length
    ? `，当前禁止：${cognition.strategyStatus.forbiddenActions.join("、")}`
    : "";

  const advice =
    openDecisions > 0
      ? `今日重点：围绕「${cognition.strategyStatus.coreQuestion}」推进，优先回填 ${openDecisions} 个执行中决策的实际结果（数据→偏差→经验），让项目大脑持续学习。`
      : `今日重点：围绕「${cognition.strategyStatus.coreQuestion}」推进「${cognition.nextAction}」；关注指标 ${metricLines || "北极星进展"}${forbidden}。`;

  return {
    date: today,
    projectName: cognition.projectName,
    currentPhase: cognition.currentPhase,
    strategyStatus: cognition.strategyStatus.currentStatus,
    coreQuestion: cognition.strategyStatus.coreQuestion,
    forbiddenActions: cognition.strategyStatus.forbiddenActions,
    northStar: cognition.projectMetrics.northStarMetric,
    metrics: cognition.projectMetrics.keyMetrics.slice(0, 8),
    keyFactsToday: factsToday,
    topRisks: uniqueRisks,
    todayPriority: cognition.nextAction,
    openDecisions,
    aiAdvice: advice,
  };
}
