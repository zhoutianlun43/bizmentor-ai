/**
 * 各研究阶段的提示词（Evidence First + 强制 JSON 输出）。
 * 所有数字类结论（市场规模/用户量/增长率/价格）无真实来源时必须标
 * NEEDS_VALIDATION 或 AI_INFERENCE，禁止编造成 FACT。
 */
import type { ResearchInput, ResearchTask, SourceDocument, UserMaterial } from "./types";
import type { AnalyzerOutput, ResearchFindingOutput, ScoreProposalOutput, SynthesisOutput, ValidationPlanOutput } from "./schema";

export interface PromptParts {
  system: string;
  user: string;
}

const EVIDENCE_RULES = `证据规则（严格遵守）：
- FACT：只有【用户提供的资料/输入】中明确出现的信息才能标 FACT，且必须带 sourceRef（sourceType 固定为 USER_PROVIDED，sourceId 指向资料 id）。
- AI_INFERENCE：基于已有信息做出的推断。
- ASSUMPTION：没有证据但为了推进必须做出的假设。
- NEEDS_VALIDATION：缺少外部证据、必须通过访谈/数据/实验验证的结论。
- 市场规模、用户数量、增长率、价格等数字，如果没有真实来源，一律标 NEEDS_VALIDATION 或 AI_INFERENCE，禁止编造成 FACT。
- sourceRef 为 null 表示无来源。
- 禁止为了报告完整而编造事实。`;

const JSON_INSTRUCTION = `只输出 JSON，不要输出 Markdown 代码块，不要输出任何额外文字。`;

function materialsText(materials: UserMaterial[] | undefined): string {
  if (!materials || materials.length === 0) return "（无）";
  return materials
    .map((m) => `- [资料 ${m.id}] ${m.title}\n${m.content}`)
    .join("\n\n");
}

function sourcesText(docs: SourceDocument[]): string {
  if (!docs || docs.length === 0) return "（无）";
  return docs.map((d) => `- [${d.sourceType} ${d.id}] ${d.title}\n${d.content}`).join("\n\n");
}

export function analyzerPrompt(input: ResearchInput): PromptParts {
  return {
    system: `你是 BizMentor 的「商机分析器」。${EVIDENCE_RULES}\n${JSON_INSTRUCTION}`,
    user: `请分析下面的商机，输出商机定义与问题定义。\n\n商机名称：${input.opportunity.name}\n商机描述：${input.opportunity.description}\n备注：${input.opportunity.notes ?? "（无）"}\n用户提供的资料：\n${materialsText(input.materials)}\n\nJSON 格式：\n{"definition":"商机定义","problem":"问题定义","targetUserHint":"初始目标用户假设","initialAssumptions":[{"claim":"...","evidenceClass":"AI_INFERENCE|ASSUMPTION|NEEDS_VALIDATION|FACT","confidence":0.5,"sourceRef":null}],"unknowns":["未知项"]}`,
  };
}

export function plannerPrompt(input: ResearchInput, analyzer: AnalyzerOutput): PromptParts {
  return {
    system: `你是 BizMentor 的「研究规划器」。${EVIDENCE_RULES}\n${JSON_INSTRUCTION}`,
    user: `根据商机与定义，规划研究任务列表（覆盖：目标用户、用户痛点、需求强度、市场环境、竞品与替代方案、付费意愿、商业模式、壁垒、风险）。\n\n商机：${input.opportunity.name}\n定义：${analyzer.definition}\n问题：${analyzer.problem}\n未知项：${analyzer.unknowns.join("；") || "（无）"}\n\n每个任务的 dataSource：能用用户资料回答的用 USER_PROVIDED；需要推理的用 AI_RESEARCH；需要外部数据（当前不可得）的用 EXTERNAL_NEEDED。\n\nJSON 格式：\n{"tasks":[{"id":"t1","area":"targetUser|painPoint|demandStrength|market|competition|willingnessToPay|businessModel|moat|risk","question":"研究问题","dataSource":"USER_PROVIDED|AI_RESEARCH|EXTERNAL_NEEDED","required":true}]}`,
  };
}

export function taskPrompt(task: ResearchTask, input: ResearchInput, docs: SourceDocument[]): PromptParts {
  return {
    system: `你是 BizMentor 的「研究执行器」。${EVIDENCE_RULES}\n${JSON_INSTRUCTION}`,
    user: `研究任务：${task.question}\n研究领域：${task.area}\n数据来源要求：${task.dataSource}\n\n商机：${input.opportunity.name}\n描述：${input.opportunity.description}\n用户提供的资料：\n${sourcesText(docs)}\n\n${task.dataSource === "EXTERNAL_NEEDED" ? "注意：当前没有外部数据能力，本任务结论只能基于推理或用户资料，缺少外部证据的部分必须标 NEEDS_VALIDATION，并明确写入 unknowns。\n" : ""}JSON 格式：\n{"taskId":"${task.id}","area":"${task.area}","summary":"研究结论摘要","evidence":[{"claim":"结论","evidenceClass":"FACT|AI_INFERENCE|ASSUMPTION|NEEDS_VALIDATION","confidence":0.5,"sourceRef":null}],"confidence":0.5,"unknowns":["待验证项"]}`,
  };
}

export function synthesisPrompt(input: ResearchInput, analyzer: AnalyzerOutput, findings: ResearchFindingOutput[]): PromptParts {
  return {
    system: `你是 BizMentor 的「研究综合器」。${EVIDENCE_RULES}\n${JSON_INSTRUCTION}`,
    user: `把以下研究产出综合为结构化章节。\n\n商机：${input.opportunity.name}\n定义：${analyzer.definition}\n\n各任务产出：\n${findings.map((f) => `【${f.area}】${f.summary}\n证据：${JSON.stringify(f.evidence)}\n未知：${f.unknowns.join("；") || "（无）"}`).join("\n\n")}\n\nJSON 格式：\n{"sections":[{"area":"targetUser|painPoint|demandStrength|market|competition|willingnessToPay|businessModel|moat|risk","title":"章节标题","content":"综合结论","confidence":0.5,"evidence":[{"claim":"...","evidenceClass":"FACT|AI_INFERENCE|ASSUMPTION|NEEDS_VALIDATION","confidence":0.5,"sourceRef":null}]}]}`,
  };
}

export function scoringPrompt(input: ResearchInput, sections: SynthesisOutput["sections"]): PromptParts {
  return {
    system: `你是 BizMentor 的「评分器」。你只提供评分提案（score proposal + confidence + rationale + evidence），最终总分由系统确定性计算，你不需要自己算总分。${EVIDENCE_RULES}\n${JSON_INSTRUCTION}`,
    user: `根据研究章节，对 7 个维度打分（0-10）：需求 demand、市场 market、竞争 competition、付费 willingnessToPay、壁垒 moat、获客 customerAcquisition、风险 risk。竞争/获客/风险越高分越不利（系统会按 (10-score) 处理）。\n\n商机：${input.opportunity.name}\n\n研究章节：\n${sections.map((s) => `【${s.area}】${s.content}`).join("\n")}\n\nJSON 格式：\n{"dimensions":[{"dimension":"demand|market|competition|willingnessToPay|moat|customerAcquisition|risk","score":7.5,"confidence":0.6,"rationale":"理由","evidence":[{"claim":"...","evidenceClass":"FACT|AI_INFERENCE|ASSUMPTION|NEEDS_VALIDATION","confidence":0.5,"sourceRef":null}]}]}`,
  };
}

export function validationPlanPrompt(input: ResearchInput, score: ScoreProposalOutput): PromptParts {
  return {
    system: `你是 BizMentor 的「验证方案设计器」。${EVIDENCE_RULES}\n${JSON_INSTRUCTION}`,
    user: `根据评分提案中的证据，把必须验证的假设/未知转化为可执行验证方案。\n\n商机：${input.opportunity.name}\n\n评分证据：\n${score.dimensions.flatMap((d) => d.evidence).map((e) => `- [${e.evidenceClass}] ${e.claim}`).join("\n")}\n\nJSON 格式：\n{"items":[{"assumption":"要验证的假设","method":"验证方法（访谈/数据/小规模测试…）","successCriteria":"成功标准","effort":"low|medium|high"}]}`,
  };
}

export function summaryPrompt(params: {
  input: ResearchInput;
  analyzer: AnalyzerOutput;
  sections: SynthesisOutput["sections"];
  validationPlan: ValidationPlanOutput;
}): PromptParts {
  return {
    system: `你是 BizMentor 的「最终报告器」。${EVIDENCE_RULES}\n${JSON_INSTRUCTION}`,
    user: `基于以下研究内容，输出最终执行摘要、MVP 建议与下一步行动。\n\n商机：${params.input.opportunity.name}\n定义：${params.analyzer.definition}\n\n研究章节：\n${params.sections.map((s) => `【${s.area}】${s.content}`).join("\n")}\n\n验证方案：\n${params.validationPlan.items.map((i) => `- ${i.assumption} → ${i.method}（${i.successCriteria}）`).join("\n")}\n\nJSON 格式：\n{"executiveSummary":"最终执行摘要","mvpRecommendation":"MVP 建议","nextActions":["下一步行动1","下一步行动2"]}`,
  };
}

/** 重试提示词：告诉模型上次输出无效并附校验错误（前 300 字符，安全） */
export function retryPrompt(prev: PromptParts, errors: string[]): PromptParts {
  return {
    system: prev.system,
    user: `${prev.user}\n\n【系统提示】你上一次的输出不符合 JSON 格式要求，请重新输出。错误：${errors.slice(0, 3).join("；").slice(0, 300)}。严格按上述 JSON 格式输出，不要输出任何其他内容。`,
  };
}