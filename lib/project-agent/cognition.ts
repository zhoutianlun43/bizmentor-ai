/**
 * 项目认知档案 + 系统提示（V1.5；V1.9 增加战略状态/成功指标/商业数据库/经验沉淀）。
 * 自动读取：商机描述/研究报告/Evidence/判断/操盘报告/决策历史 → 项目认知；不重复生成（复用研究报告）。
 */
import type { Opportunity } from "../types/opportunity";
import type { ResearchRun } from "../research/types";
import type { UserDecision } from "../decision/types";
import { parseRadarNotes } from "../radar/service";
import type { AgentMode, ProjectCognitionProfile, ProjectMemory } from "./types";

/** 从项目全部资料生成认知档案（确定性提取，无需额外 LLM 调用） */
export function buildCognition(
  opportunity: Opportunity,
  run?: ResearchRun,
  decisions: UserDecision[] = [],
  memory?: ProjectMemory,
): ProjectCognitionProfile {
  const report = run?.report;
  const judgment = report?.judgment;
  const thesis = report?.thesis;
  const op = report?.operationPlan;
  const meta = parseRadarNotes(opportunity.notes);

  const risks: string[] = [];
  if (judgment?.biggestRisk) risks.push(judgment.biggestRisk);
  if (thesis?.invalidators) risks.push(...thesis.invalidators.slice(0, 3));
  if (op?.investmentJudgment?.reasons?.risk) risks.push(op.investmentJudgment.reasons.risk);

  // V1.8：当前阶段（机会生命周期 → 阶段标签）
  const PHASE_MAP: Record<string, string> = {
    discovered: "已发现（待处理）",
    favorite: "收藏观察",
    researching: "深度研究中",
    promoting: "推进中（创业执行）",
    rejected: "已放弃",
    validating: "验证中",
    validated: "已验证",
    abandoned: "已放弃",
    researching_old: "研究中",
  };
  const phaseKey = opportunity.opportunityStatus ?? opportunity.status;
  const currentPhase = PHASE_MAP[phaseKey] ?? "已发现";
  // 核心假设：来自 thesis 或判断
  const coreAssumption = thesis?.coreHypothesis ?? judgment?.oneLineJudgment?.slice(0, 80) ?? "核心假设待研究报告确认";
  // 下一步动作：优先执行方案第一阶段 → 投资判断关键实验 → 判断建议 → 决策门
  const nextAction =
    op?.ninetyDayPlan?.[0]?.goal
    ?? op?.investmentJudgment?.nextExperiment?.experiment
    ?? judgment?.suggestedAction
    ?? thesis?.decisionGate
    ?? "进入创业执行决策，制定落地作战方案";

  const facts: string[] = [];
  if (opportunity.source === "ai") facts.push(`来源：AI 商业雷达${meta.scanId ? `（批次 ${meta.scanId.slice(0, 8)}）` : ""}`);
  else facts.push("来源：用户手动创建");
  if (meta.category) facts.push(`市场方向：${meta.category}`);
  if (meta.score !== undefined) facts.push(`AI 初始评分：${meta.score}`);
  if (report?.score) facts.push(`研究报告评分：${report.score.overall_score}/10（置信度 ${Math.round(report.score.confidence * 100)}%）`);
  if (report?.evidenceScore) facts.push(`Evidence Score：${report.evidenceScore.overall}/10（数据支持 ${Math.round(report.evidenceScore.evidenceCoverage.dataSupported * 100)}%）`);
  if (report?.sources?.length) facts.push(`研究报告引用真实来源：${report.sources.length} 个`);
  if (decisions.length) facts.push(`历史决策：${decisions.length} 次（最近：${decisions[decisions.length - 1].decision}）`);
  if (report?.sources?.some((s) => s.title?.includes("市场"))) facts.push("已获取市场数据来源");

  // V1.9：项目战略状态（按阶段推导 + 记忆覆盖）
  const STRATEGY_BY_PHASE: Record<string, { status: string; question: string; forbidden: string[] }> = {
    "已发现（待处理）": { status: "等待用户决策：是否进入深度研究", question: "该机会是否值得投入研究资源", forbidden: ["暂不扩大库存", "暂不扩大团队", "暂不投放广告"] },
    "收藏观察": { status: "收藏观察：等待更多信号", question: "该机会是否值得进入深度研究", forbidden: ["暂不投入资金", "暂不扩大团队"] },
    "深度研究中": { status: "AI 深度研究中，等待研究报告", question: "市场/竞争/支付意愿是否成立", forbidden: ["暂不扩大库存", "暂不投放广告"] },
    "推进中（创业执行）": { status: "等待用户需求验证", question: "是否有人愿意付费", forbidden: ["暂不扩大库存", "暂不扩大团队"] },
    "验证中": { status: "等待用户需求验证", question: "是否有人愿意付费", forbidden: ["暂不扩大库存", "暂不扩大团队"] },
    "已验证": { status: "已验证：进入放量与规模化", question: "如何规模化并获得稳定增长", forbidden: ["避免过度扩张"] },
    "已放弃": { status: "已放弃：沉淀经验，等待新机会", question: "复盘失败原因", forbidden: [] },
  };
  const phaseStrategy = STRATEGY_BY_PHASE[currentPhase] ?? { status: "等待验证", question: coreAssumption, forbidden: [] };
  const strategyStatus = {
    currentPhase,
    currentStatus: memory?.strategy?.currentStatus || phaseStrategy.status,
    coreQuestion: memory?.strategy?.coreQuestion || phaseStrategy.question || coreAssumption,
    forbiddenActions: (memory?.strategy?.forbiddenActions?.length ? memory.strategy.forbiddenActions : phaseStrategy.forbidden).slice(0, 5),
  };

  // V1.9：项目成功指标（记忆覆盖优先，否则默认围绕核心假设验证）
  const defaultMetrics = {
    northStarMetric: phaseKey === "validated" ? "30天内获得100个真实付费客户" : "完成核心假设验证并获得首批真实反馈",
    keyMetrics: [
      { name: "转化率", current: "待验证", target: "5%" },
      { name: "留存率", current: "待验证", target: "60%" },
      { name: "单客户毛利", current: "待验证", target: "≥50%" },
    ],
  };
  const projectMetrics = memory?.metrics
    ? {
        northStarMetric: memory.metrics.northStarMetric || defaultMetrics.northStarMetric,
        keyMetrics: (memory.metrics.keyMetrics?.length ? memory.metrics.keyMetrics : defaultMetrics.keyMetrics).slice(0, 8),
      }
    : defaultMetrics;

  return {
    projectId: opportunity.id,
    projectName: opportunity.name,
    aiIdentity: "你是该项目的 AI 主理人（项目 CEO 数字员工）：你负责长期管理项目、推动执行、维护项目大脑，而不是做研究员。",
    currentGoal: op?.investmentJudgment?.nextExperiment?.experiment ?? judgment?.suggestedAction ?? thesis?.decisionGate ?? "验证商机核心假设",
    currentPhase,
    coreJudgment: judgment?.oneLineJudgment ?? thesis?.coreHypothesis ?? op?.investmentJudgment?.reasons?.market ?? "基于研究报告判断",
    coreAssumption,
    mainRisks: risks.slice(0, 4),
    nextAction,
    keyFacts: facts,
    strategyStatus,
    projectMetrics,
    updatedAt: new Date().toISOString(),
  };
}

/** 构建项目 AI 对话系统提示（结合认知 + 长期记忆 + 研究报告 + 模式；V1.9 锚定战略状态与指标） */
export function buildAgentSystemPrompt(
  cognition: ProjectCognitionProfile,
  memory: ProjectMemory,
  run: ResearchRun | undefined,
  mode: AgentMode,
): string {
  const modeLine: Record<AgentMode, string> = {
    advisor: "【顾问模式】回答用户问题：结合项目资料给出分析、依据与建议；先判断再追问。",
    manager: "【主理人模式】主动分析项目：发现问题、提醒风险、推动下一步；不只被动回答。",
    investor: "【投资人模式】挑战商业逻辑：质疑假设、指出致命问题、要求证据；理性审视。",
    operations: "【运营模式】关注执行：把战略落到可执行动作，关注成本/转化/供应链/节奏。",
  };
  const report = run?.report;
  const lines = [
    cognition.aiIdentity,
    modeLine[mode],
    "",
    `项目：${cognition.projectName}`,
    `当前阶段：${cognition.currentPhase}`,
    `当前战略状态：${cognition.strategyStatus.currentStatus}`,
    `当前核心问题：${cognition.strategyStatus.coreQuestion}`,
    `当前禁止事项：${cognition.strategyStatus.forbiddenActions.join("；") || "无"}`,
    `北极星指标：${cognition.projectMetrics.northStarMetric}`,
    `关键指标：${cognition.projectMetrics.keyMetrics.map((m) => `${m.name}（当前 ${m.current} → 目标 ${m.target}）`).join("；")}`,
    `当前目标：${cognition.currentGoal}`,
    `核心假设：${cognition.coreAssumption}`,
    `核心判断：${cognition.coreJudgment}`,
    `主要风险：${cognition.mainRisks.join("；") || "待评估"}`,
    `下一步动作：${cognition.nextAction}`,
    "",
    "项目关键事实：",
    ...cognition.keyFacts.map((f) => `- ${f}`),
    "",
    "项目长期记忆（商业数据库，FACT=真实数据 / INFERENCE=AI推断 / ASSUMPTION=假设）：",
    memory.facts.length ? memory.facts.slice(-10).map((f) => `- [${f.type}] ${f.content}${f.source ? `（来源：${f.source}）` : ""}${f.confidence != null ? `（可信度 ${f.confidence}%）` : ""}`) : "商业数据库：暂无",
    memory.userDecisions.length ? `用户决策：${memory.userDecisions.join("；")}` : "用户决策：暂无",
    memory.changes.length ? `项目变化：${memory.changes.join("；")}` : "项目变化：暂无",
    memory.aiJudgments.length ? `AI 判断历史：${memory.aiJudgments.join("；")}` : "AI 判断历史：暂无",
    memory.decisionLog.length ? `决策记录：${memory.decisionLog.slice(-5).map((d) => `${d.time.slice(0, 10)} ${d.decision}（${d.reason}）[${d.status}${d.result ? `｜结果：${d.result.actualData.slice(0, 40)}` : ""}]`).join("；")}` : "决策记录：暂无",
    memory.lessonsLearned.length ? `经验沉淀（AI 学习）：${memory.lessonsLearned.slice(-5).join("；")}` : "经验沉淀：暂无",
    memory.knowledgeBase.length ? `知识库：${memory.knowledgeBase.slice(-5).join("；")}` : "知识库：暂无",
    memory.reviews.length ? `复盘：${memory.reviews.slice(-2).join("；")}` : "复盘：暂无",
  ];
  if (report) {
    lines.push("", "研究报告要点：");
    if (report.executiveSummary) lines.push(`- 摘要：${report.executiveSummary.slice(0, 300)}`);
    if (report.judgment?.recommendation) lines.push(`- AI 建议：${report.judgment.recommendation} · ${report.judgment.suggestedAction ?? ""}`);
    if (report.operationPlan?.investmentJudgment) {
      const ij = report.operationPlan.investmentJudgment;
      lines.push(`- 投资判断：${ij.recommendation}（最大未知：${ij.biggestUnknown}）`);
    }
    if (report.insufficientEvidence?.length) lines.push(`- 待验证：${report.insufficientEvidence.slice(0, 3).join("；")}`);
  }
  lines.push("", "职责边界（重要）：", "- 你负责长期管理项目、推动执行、做判断与提醒，不是研究员。", "- 不要重新生成完整研究报告/市场规模分析/SWOT（机会研究中心已做）；不要重复制定整套执行方案（创业执行决策已做）。", "- 引用研究报告/执行方案/历史判断作为依据，说明来源；聚焦「当前该做什么、为什么、怎么做、卡在哪里」。", "- 所有建议必须围绕项目指标（北极星 + 关键指标当前 vs 目标）展开，并遵守当前禁止事项；禁止把 INFERENCE/ASSUMPTION 当 FACT 陈述。", "- 项目会议室模式：用户描述项目变化/问题（如成本上涨、数据异常）时，按「影响分析 → 方案A/B/C → 推荐 → 项目更新已记录」输出。", "- 每次回答后在本项目更新中沉淀：新事实（标明 FACT/INFERENCE/ASSUMPTION 与来源、可信度）/新风险/新判断/方案变化/决策（含原因与依据）；如战略状态或指标变化，用 strategyUpdate/metricsUpdate 更新。", "- 要求：必须结合上述项目资料回答，不要编造项目没有的数据；信息不足时说明并建议如何验证。");
  return lines.join("\n");
}
