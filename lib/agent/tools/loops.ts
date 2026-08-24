/**
 * Loop 工具（V0.4.2 Phase 9B-2）：让 AgentRuntime 可调用晨报/晚报/异常检测。
 */
import { generateMorningBriefing } from "../loops/briefing";
import { generateEveningReview } from "../loops/review";
import { AnomalyDetector } from "../loops/anomaly";
import type { LoopDeps } from "../loops/collect";
import type { ReviewDeps } from "../loops/review";
import type { AgentTool } from "../types";

export function createMorningBriefingTool(deps: LoopDeps): AgentTool {
  return {
    id: "morning_briefing_tool",
    name: "晨报工具",
    description: "生成每日晨报（今日状态/异常/建议/记忆洞察）",
    async execute() {
      const briefing = await generateMorningBriefing(deps);
      return { date: briefing.date, headline: briefing.headline, status: briefing.status, anomalies: briefing.anomalies.length, suggestedActions: briefing.suggestedActions };
    },
  };
}

export function createEveningReviewTool(deps: ReviewDeps): AgentTool {
  return {
    id: "evening_review_tool",
    name: "晚报工具",
    description: "生成晚间复盘（沉淀决策记忆 AI vs 用户 vs 实际）",
    async execute() {
      const review = await generateEveningReview(deps);
      return { date: review.date, completedActions: review.completedActions.length, decisionComparison: review.decisionComparison.length, lessons: review.lessons, tomorrowActions: review.tomorrowActions };
    },
  };
}

export function createMonitoringTool(deps: LoopDeps): AgentTool {
  return {
    id: "monitoring_tool",
    name: "异常监控工具",
    description: "检测经营异常（超期/未执行/失败/评分下降/证伪）",
    async execute() {
      const anomalies = await new AnomalyDetector(deps).detect();
      return { count: anomalies.length, anomalies: anomalies.map((a) => ({ type: a.type, severity: a.severity, message: a.message })) };
    },
  };
}