/**
 * AnomalyDetector（V0.4.2 Phase 9B-2）。
 * 日间监控：超期任务 / 决策未执行 / 任务失败 / 评分下降 / 验证证伪。
 */
import { uid } from "../../store/storage";
import { collectState, toDateKey } from "./collect";
import type { LoopDeps } from "./collect";
import type { AnomalyAlert } from "./types";

export class AnomalyDetector {
  private readonly deps: LoopDeps;

  constructor(deps: LoopDeps) {
    this.deps = deps;
  }

  async detect(now: Date = new Date()): Promise<AnomalyAlert[]> {
    const state = await collectState(this.deps, now);
    const alerts: AnomalyAlert[] = [];
    const at = () => new Date(now).toISOString();

    for (const t of state.overdueTasks) {
      alerts.push({
        id: uid(),
        type: "task_overdue",
        severity: 3,
        message: `验证任务超期：${t.assumption.slice(0, 60)}（截止 ${t.deadline}）`,
        relatedId: t.planId,
        createdAt: at(),
      });
    }

    for (const d of state.decisions) {
      if (!d.hasPlan) {
        alerts.push({
          id: uid(),
          type: "decision_not_executed",
          severity: 2,
          message: `决策未执行：${d.decision.decision}（无验证计划）`,
          relatedId: d.decision.id,
          createdAt: at(),
        });
      }
    }

    for (const t of state.failedTasks) {
      alerts.push({
        id: uid(),
        type: "task_failed",
        severity: 3,
        message: `验证任务失败：${t.assumption.slice(0, 60)}`,
        relatedId: t.planId,
        createdAt: at(),
      });
    }

    for (const u of state.scoreDrops) {
      alerts.push({
        id: uid(),
        type: "score_drop",
        severity: u.after.overall_score < u.before.overall_score - 0.5 ? 3 : 2,
        message: `评分下降：${u.before.overall_score} → ${u.after.overall_score}（${u.reason.slice(0, 40)}）`,
        relatedId: u.decisionId,
        createdAt: at(),
      });
    }

    for (const r of state.rejectedResults) {
      alerts.push({
        id: uid(),
        type: "validation_rejected",
        severity: 2,
        message: `假设被证伪：${r.actualResult.slice(0, 60)}`,
        relatedId: r.decisionId,
        createdAt: at(),
      });
    }

    return alerts.sort((a, b) => b.severity - a.severity);
  }

  /** 便捷：某一天的异常（确定性，date 用于去重/恢复） */
  async detectForDate(date: Date = new Date()): Promise<{ date: string; anomalies: AnomalyAlert[] }> {
    const anomalies = await this.detect(date);
    return { date: toDateKey(date), anomalies };
  }
}