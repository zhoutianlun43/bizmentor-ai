/**
 * 项目认知档案 + 系统提示（V1.5）。
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

  return {
    projectId: opportunity.id,
    projectName: opportunity.name,
    aiIdentity: "你是该项目的 AI 主理人（项目长期负责人，类似创业公司 CEO 助手）：你负责长期管理项目、推动执行，而不是做研究员。",
    currentGoal: op?.investmentJudgment?.nextExperiment?.experiment ?? judgment?.suggestedAction ?? thesis?.decisionGate ?? "验证商机核心假设",
    currentPhase,
    coreJudgment: judgment?.oneLineJudgment ?? thesis?.coreHypothesis ?? op?.investmentJudgment?.reasons?.market ?? "基于研究报告判断",
    coreAssumption,
    mainRisks: risks.slice(0, 4),
    nextAction,
    keyFacts: facts,
    updatedAt: new Date().toISOString(),
  };
}

/** 构建项目 AI 对话系统提示（结合认知 + 长期记忆 + 研究报告 + 模式） */
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
    `当前目标：${cognition.currentGoal}`,
    `核心假设：${cognition.coreAssumption}`,
    `核心判断：${cognition.coreJudgment}`,
    `主要风险：${cognition.mainRisks.join("；") || "待评估"}`,
    `下一步动作：${cognition.nextAction}`,
    "",
    "项目关键事实：",
    ...cognition.keyFacts.map((f) => `- ${f}`),
    "",
    "项目长期记忆：",
    memory.facts.length ? `项目事实：${memory.facts.join("；")}` : "项目事实：暂无",
    memory.userDecisions.length ? `用户决策：${memory.userDecisions.join("；")}` : "用户决策：暂无",
    memory.changes.length ? `项目变化：${memory.changes.join("；")}` : "项目变化：暂无",
    memory.aiJudgments.length ? `AI 判断历史：${memory.aiJudgments.join("；")}` : "AI 判断历史：暂无",
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
  lines.push("", "职责边界（重要）：", "- 你负责长期管理项目、推动执行、做判断与提醒，不是研究员。", "- 不要重新生成完整研究报告/市场规模分析/SWOT（机会研究中心已做）；不要重复制定整套执行方案（创业执行决策已做）。", "- 引用研究报告/执行方案/历史判断作为依据，说明来源；聚焦「当前该做什么、为什么、怎么做、卡在哪里」。", "- 项目会议室模式：用户描述项目变化/问题（如成本上涨、数据异常）时，按「影响分析 → 方案A/B/C → 推荐 → 项目更新已记录」输出。", "- 每次回答后在本项目更新中沉淀：新事实/新风险/新判断/方案变化/决策（含原因与依据）。", "- 要求：必须结合上述项目资料回答，不要编造项目没有的数据；信息不足时说明并建议如何验证。");
  return lines.join("\n");
}
