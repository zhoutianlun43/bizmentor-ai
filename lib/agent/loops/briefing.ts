/**
 * Morning Briefing（每日晨报，V0.4.2 Phase 9B-2）。
 * 输入：Identity + 商机状态 + 执行任务 + 昨日异常 + Memory 模式。
 * 输出：DailyBriefing（可保存/可恢复；确定性生成，AI 文案增强留作未来）。
 */
import { getCurrentUserId } from "../../identity/resolver";
import { collectState, toDateKey } from "./collect";
import type { LoopDeps } from "./collect";
import { AnomalyDetector } from "./anomaly";
import type { DailyBriefing } from "./types";

export async function generateMorningBriefing(deps: LoopDeps, now: Date = new Date()): Promise<DailyBriefing> {
  const userId = deps.userId ?? getCurrentUserId();
  const date = toDateKey(now);
  const state = await collectState(deps, now);
  const anomalies = await new AnomalyDetector(deps).detect(now);

  const researching = state.decisions.filter((d) => d.decision.decision === "continue_research" || !d.hasPlan).length;
  const validating = state.decisions.filter((d) => d.hasPlan).length;
  const overdue = state.overdueTasks.length;

  const headline = buildHeadline(state.opportunities.length, researching, validating, overdue, anomalies.length);
  const suggestedActions = buildSuggestedActions(state, anomalies);
  const memoryInsights = state.memoryPatterns.slice(0, 3).map((p) => {
    const domain = p.domain ? `「${p.domain}」` : "全部";
    const rate = p.confirmRate === null ? "暂无验证" : `验证率 ${Math.round(p.confirmRate * 100)}%`;
    return `${domain}${p.decision ? ` ${p.decision}` : ""}：${rate}（${p.count} 条记录）`;
  });

  return {
    id: `brief-${date}-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    date,
    headline,
    status: { opportunities: state.opportunities.length, researching, validating, overdue },
    anomalies: anomalies.slice(0, 10),
    suggestedActions,
    memoryInsights,
    createdAt: now.toISOString(),
  };
}

function buildHeadline(opportunities: number, researching: number, validating: number, overdue: number, anomalies: number): string {
  const parts = [`今日 ${opportunities} 个商机`];
  if (researching > 0) parts.push(`${researching} 个研究中`);
  if (validating > 0) parts.push(`${validating} 个验证中`);
  if (overdue > 0) parts.push(`⚠ ${overdue} 个任务超期`);
  if (anomalies === 0 && overdue === 0) parts.push("，无异常，平稳推进");
  return parts.join("，");
}

function buildSuggestedActions(state: Awaited<ReturnType<typeof collectState>>, anomalies: import("./types").AnomalyAlert[]): string[] {
  const actions: string[] = [];
  for (const a of anomalies) {
    if (a.type === "task_overdue") actions.push(`处理超期验证任务：${a.message.slice(0, 40)}`);
    if (a.type === "decision_not_executed") actions.push(`为决策创建验证计划（${a.message.slice(0, 40)}）`);
    if (a.type === "task_failed") actions.push(`复盘失败任务并决定重试/放弃：${a.message.slice(0, 40)}`);
    if (a.type === "score_drop") actions.push(`查看评分下降原因并更新决策：${a.message.slice(0, 40)}`);
    if (a.type === "validation_rejected") actions.push(`评估被证伪假设对商机的影响：${a.message.slice(0, 40)}`);
  }
  const noAction = state.opportunities.length === 0 && actions.length === 0;
  if (noAction) actions.push("暂无商机，可新增一个商机开始研究。");
  if (actions.length === 0 && !noAction) actions.push("今日无异常，按计划推进验证与决策。");
  return actions.slice(0, 6);
}