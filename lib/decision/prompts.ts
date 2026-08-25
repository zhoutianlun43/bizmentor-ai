/**
 * AI Examiner 提示词（V0.3-C）。
 * 评审对象：用户判断（不是替用户做决策）；输出结构化 JSON。
 * 原则：不得编造事实；不得生成验证结果。
 */
import type { UserDecision, UserJudgment } from "./types";
import { getDomainProfile } from "../domain/registry";
import type { BusinessDomain } from "../domain/types";

export interface PromptParts {
  system: string;
  user: string;
}

const REVIEW_RULES = `评审原则：
- 你评审的是「用户的商业判断」，不是替用户做最终决策。
- 区分事实错误 / 证据不足 / 逻辑跳跃 / 过度乐观 / 风险低估 / 用户需求误判 / 付费意愿误判 / 竞争误判 / 商业模式问题 / 验证方案问题。
- 不得编造事实；没有证据支撑的判断要标注「证据不足」。
- 不得生成或伪造验证结果。`;

const JSON_INSTRUCTION = `只输出 JSON，不要输出 Markdown 代码块，不要输出任何额外文字。`;

export function examinerPrompt(params: {
  opportunity: { name: string; description: string };
  aiScoreSnapshot?: { overall_score: number; confidence: number } | null;
  decision: UserDecision["decision"];
  judgment: UserJudgment;
  /** 领域信息（V0.4.1 Phase 6.1B：注入领域决策检查清单） */
  domain?: { id: string; label?: string };
}): PromptParts {
  const judgmentLines = [
    `为什么做/不做：${params.judgment.why}`,
    `核心判断：${params.judgment.coreJudgment}`,
    `关键证据：${params.judgment.keyEvidence}`,
    `最大风险：${params.judgment.biggestRisk}`,
    `最重要假设：${params.judgment.mostImportantAssumption}`,
    `预计结果：${params.judgment.expectedOutcome}`,
  ];
  if (params.judgment.differentJudgment) judgmentLines.push(`与 AI 不同的判断：${params.judgment.differentJudgment}`);
  const domainChecklist = params.domain
    ? getDomainProfile(params.domain.id as BusinessDomain).decisionChecklist
    : undefined;

  return {
    system: `你是 BizMentor 的「AI Examiner」（商业判断评审）。${REVIEW_RULES}\n${
      domainChecklist && domainChecklist.length > 0
        ? `领域检查清单（${params.domain?.label ?? ""}）：\n${domainChecklist.map((c) => `- ${c}`).join("\n")}\n`
        : ""
    }${JSON_INSTRUCTION}`,
    user: `请评审下面的用户商业判断。\n\n商机：${params.opportunity.name}\n描述：${params.opportunity.description}\n\nAI 研究报告当时的判断（供对比）：${
      params.aiScoreSnapshot
        ? `综合评分 ${params.aiScoreSnapshot.overall_score}/10，置信度 ${params.aiScoreSnapshot.confidence}`
        : "（无）"
    }\n用户决策：${params.decision}\n用户判断：\n${judgmentLines.join("\n")}\n\nJSON 格式：\n{"score":7.0,"strengths":["优点1"],"weaknesses":[{"category":"logic_gap|over_optimism|...","description":"问题描述","severity":0.5}],"reasoning_gaps":["逻辑缺口"],"missing_evidence":["缺少的证据"],"recommended_actions":["建议"],"ability_signals":[{"skill":"strategic_judgment|validation|...","signal":"positive|negative|neutral","severity":0.4,"evidence":"依据"}]}`,
  };
}

// ===================== V0.4.1 Phase 7A：Business Decision Engine =====================

/** Investment Thesis 提示词：把研究报告提炼为投资论点 */
export function investmentThesisPrompt(report: {
  opportunityName: string;
  executiveSummary: string;
  overallScore: number;
  confidence: number;
  nextActions: string[];
  domainLabel?: string;
}): PromptParts {
  return {
    system: `你是 BizMentor 的「投资论点架构师」。基于研究报告提炼投资论点（Investment Thesis）：核心假设、逻辑链、关键假设、证伪条件、上行空间、决策门。\n${JSON_INSTRUCTION}`,
    user: `请基于以下研究报告输出投资论点。\n\n商机：${report.opportunityName}${report.domainLabel ? `\n领域：${report.domainLabel}` : ""}\n综合评分：${report.overallScore}/10（置信度 ${report.confidence}）\n\n执行摘要：${report.executiveSummary}\n\n建议的下一步：\n${report.nextActions.map((a) => `- ${a}`).join("\n")}\n\nJSON 格式：\n{"coreHypothesis":"一句话核心假设","logicChain":["逻辑1","逻辑2"],"keyAssumptions":[{"claim":"关键假设","evidenceClass":"FACT|AI_INFERENCE|ASSUMPTION|NEEDS_VALIDATION","sourceId":"可选来源id"}],"invalidators":["什么会证伪"],"expectedUpside":"上行空间","decisionGate":"什么条件下 proceed","confidence":0.6}`,
  };
}

/** 单位经济模型提示词：按领域让 AI 提案输入，系统确定性计算推导指标 */
export function unitEconomicsPrompt(report: { opportunityName: string; executiveSummary: string; domain: string }): PromptParts {
  const domainHint =
    report.domain === "ecommerce"
      ? "电商：输入 aov（客单价）、cogsRate（商品成本率 0-1）、shippingPerOrder（单均履约成本）、platformFeeRate（平台费率 0-1）、cac（获客成本）、avgOrdersPerCustomer（每客户购买次数）"
      : report.domain === "saas"
        ? "SaaS：输入 acvPerMonth（单客户月均收入）、grossMarginRate（毛利率 0-1）、churnRate（月流失率 0-1）、cac（获客成本）"
        : "通用：输入 revenuePerUnit（单次成交收入）、costPerUnit（单次成交变动成本）、cac（获客成本）、avgTransactionsPerCustomer（每客户成交次数）";
  return {
    system: `你是 BizMentor 的「商业模式分析器」。${REVIEW_RULES}\n${JSON_INSTRUCTION}\n你只提供输入提案，推导指标（毛利率/贡献/回本/LTV/LTV-CAC）由系统确定性计算。`,
    user: `请基于研究结论，为以下商机提案单位经济输入。\n\n商机：${report.opportunityName}\n领域：${report.domain}\n\n${domainHint}\n\n研究摘要：${report.executiveSummary}\n\nJSON 格式：\n{"inputs":{"<字段名>":数值},"assumptions":["关键假设1"],"confidence":0.6}`,
  };
}
// ===================== V0.9：AI 商业判断（决策型报告） =====================

/** AI 商业判断提示词：从「研究型」升级为「决策型」 */
export function businessJudgmentPrompt(report: {
  opportunityName: string;
  executiveSummary: string;
  overallScore: number;
  confidence: number;
  nextActions: string[];
  domainLabel?: string;
  thesis?: { coreHypothesis: string; logicChain: string[]; invalidators: string[]; decisionGate: string };
  validationPlan: Array<{ assumption: string; method: string; successCriteria: string }>;
}): PromptParts {
  const thesisLines = report.thesis
    ? [
        `\n投资论点：`,
        `- 核心假设：${report.thesis.coreHypothesis}`,
        `- 逻辑链：${report.thesis.logicChain.join(" → ")}`,
        `- 证伪条件：${report.thesis.invalidators.join("；")}`,
        `- 决策门：${report.thesis.decisionGate}`,
      ].join("\n")
    : "";
  return {
    system: `你是 BizMentor 的「商业决策官」（Business Judgment Officer）。基于研究报告给出决策型判断，而不是研究总结。
你要回答：是否建议进入、推荐切入方向、不建议做什么、90 天验证计划、第一批客户获取方案。
判断要克制、诚实：证据不足时就降低置信度并体现在「继续观察/条件进入」里；不要为了给出建议而编造事实。\n${JSON_INSTRUCTION}`,
    user: `请基于以下研究报告输出 AI 商业判断。\n\n商机：${report.opportunityName}${report.domainLabel ? `\n领域：${report.domainLabel}` : ""}\n综合评分：${report.overallScore}/10（置信度 ${report.confidence}）\n\n执行摘要：${report.executiveSummary}${thesisLines}\n\n验证方案：\n${report.validationPlan.map((v) => `- ${v.assumption}（方法：${v.method}；成功标准：${v.successCriteria}）`).join("\n")}\n\n建议的下一步：\n${report.nextActions.map((a) => `- ${a}`).join("\n")}\n\nJSON 格式：\n{"recommendation":"recommend_enter|conditional_enter|continue_observe|not_recommend","oneLineJudgment":"一句话判断","biggestOpportunity":"最大机会","biggestRisk":"最大风险","suggestedAction":"建议动作","entryDirection":"推荐切入方向","notDoList":["不建议做什么1","不建议做什么2"],"day90Plan":[{"phase":"第1-2周","title":"阶段标题","actions":["动作1","动作2"],"successMetric":"成功度量"}],"firstCustomers":{"targetSegment":"目标客户","channels":["渠道1","渠道2"],"offer":"切入卖点/免费试用","firstBatchGoal":"首批客户目标","steps":["步骤1","步骤2"]},"confidence":0.6}`,
  };
}
