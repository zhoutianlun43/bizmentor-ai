/**
 * BizMentor 商业研究引擎（V0.3-A）领域类型。
 *
 * 目标链路：Opportunity → Research → Evidence → Scoring → Validation Plan
 *           → Decision（预留）→ Review / Learning（预留）
 *
 * Evidence First：
 * - FACT：必须有用户资料 / 用户输入 / 外部来源支撑（sourceRef），否则自动降级
 * - AI_INFERENCE：基于已有信息的推断
 * - ASSUMPTION：无证据但必须做出的假设
 * - NEEDS_VALIDATION：缺少外部证据、必须验证的结论
 */
import type { AiProviderName } from "../ai/types";

/** 证据分类 */
export type EvidenceClass = "FACT" | "AI_INFERENCE" | "ASSUMPTION" | "NEEDS_VALIDATION";

/** 研究阶段 */
export type ResearchStageName =
  | "analyzer"
  | "planner"
  | "external-research"
  | "evidence-extraction"
  | "evidence-validation"
  | "synthesis"
  | "scoring"
  | "validation-plan"
  | "summary";

/** 研究运行状态 */
export type ResearchRunStatus = "running" | "completed" | "degraded" | "failed";

/** 阶段运行状态 */
export type StageRunStatus = "completed" | "failed" | "skipped";

/** 研究领域（对应 15 项研究内容） */
export type ResearchArea =
  | "definition"
  | "problem"
  | "targetUser"
  | "painPoint"
  | "demandStrength"
  | "market"
  | "competition"
  | "willingnessToPay"
  | "businessModel"
  | "moat"
  | "risk"
  | "mvp"
  | "validation"
  | "score"
  | "nextAction";

/** 评分维度（AI 提案 + 确定性聚合） */
export type ScoreDimension =
  | "demand"
  | "market"
  | "competition"
  | "willingnessToPay"
  | "moat"
  | "customerAcquisition"
  | "risk";

/** 用户自己提供的资料（V0.3 主要 FACT 来源） */
export interface UserMaterial {
  id: string;
  title: string;
  content: string;
  source?: string;
}

/** 研究来源类型（可扩展：未来支持 Web/官方/平台/上传文档） */
export type ResearchSourceType =
  | "USER_PROVIDED"
  | "EXTERNAL_WEB"
  | "OFFICIAL_SOURCE"
  | "PLATFORM_DATA"
  | "UPLOADED_DOCUMENT";

/** 来源文档（用户资料 / 外部抓取 / 平台数据等） */
export interface SourceDocument {
  id: string;
  title: string;
  sourceType: ResearchSourceType;
  content: string;
  url?: string;
  /** 发布者（外部网页由系统写入；AI 无法伪造） */
  publisher?: string;
  /** 抓取时间（外部网页由系统写入） */
  retrievedAt?: string;
  createdAt: string;
  /** 来源可信度（由系统确定性计算） */
  credibility?: SourceCredibility;
}

/** 来源可信度（确定性计算；官方 > 平台 > 百科/一般网站 > 博客） */
export interface SourceCredibility {
  score: number;
  level: "official" | "high" | "medium" | "low" | "unknown";
  reason: string;
}

/** 证据的来源引用：FACT 必须携带可验证来源 */
export interface SourceReference {
  sourceType: ResearchSourceType;
  /** 指向 SourceDocument.id（USER_PROVIDED / OFFICIAL_SOURCE / PLATFORM_DATA / UPLOADED_DOCUMENT） */
  sourceId?: string;
  /** EXTERNAL_WEB 证据需要真实 url（由系统从文档写入，AI 无法伪造） */
  url?: string;
  title?: string;
  /** 发布者（由系统从文档写入） */
  publisher?: string;
  /** 抓取时间（由系统从文档写入） */
  retrievedAt?: string;
  /** 来源可信度（由系统计算） */
  credibility?: SourceCredibility;
}
/** 一条证据：必须可追溯到 SourceReference */
export interface EvidenceItem {
  claim: string;
  evidenceClass: EvidenceClass;
  /** 0-1 */
  confidence: number;
  /** FACT 必须有可验证来源；缺失时由 enforceEvidenceRules 自动降级 */
  sourceRef?: SourceReference;
  note?: string;
}

/** 研究任务（Research Planner 产出） */
export interface ResearchTask {
  id: string;
  area: ResearchArea;
  question: string;
  /** USER_PROVIDED：用用户资料回答；AI_RESEARCH：AI 推理；EXTERNAL_WEB：需要真实外部来源；EXTERNAL_NEEDED：外部数据暂不可得 */
  dataSource: "USER_PROVIDED" | "AI_RESEARCH" | "EXTERNAL_WEB" | "EXTERNAL_NEEDED";
  required: boolean;
}

/** 单个研究任务的产出（Finding → Evidence → Source 可追溯） */
export interface ResearchFinding {
  taskId: string;
  area: ResearchArea;
  summary: string;
  evidence: EvidenceItem[];
  confidence: number;
  unknowns: string[];
}

/** 研究报告的一个章节（15 项研究内容之一） */
export interface ResearchSection {
  area: ResearchArea;
  title: string;
  content: string;
  evidence: EvidenceItem[];
  confidence: number;
}

/** AI 提交的评分提案（最终 overall 由确定性函数计算，AI 不算分） */
export interface ScoreProposal {
  dimensions: DimensionScore[];
}

/** 单个维度的评分提案 */
export interface DimensionScore {
  dimension: ScoreDimension;
  /** 0-10（AI 提案，会被 clamp） */
  score: number;
  /** 0-1 */
  confidence: number;
  rationale: string;
  evidence: EvidenceItem[];
}

/** 评分版本（Score v1 / v2 / v3 …，未来随验证结果更新） */
export interface ScoreVersion {
  version: number;
  overall_score: number;
  score_breakdown: DimensionScore[];
  confidence: number;
  assumptions: EvidenceItem[];
  unknowns: string[];
  validation_required: string[];
  createdAt: string;
  /** 未来：更新原因（如用户验证结果） */
  reason?: string;
}

/** 当前评分结果 = 最新版本 + 全部证据 */
export interface ScoreResult extends ScoreVersion {
  evidence: EvidenceItem[];
}

/** 竞品发现（外部来源） */
export interface CompetitorFinding {
  name: string;
  url?: string;
  description: string;
  evidence: EvidenceItem[];
}

/** 竞品矩阵单元格 */
export interface CompetitorMatrixCell {
  dimension: string;
  value: string;
  sourceRef?: SourceReference;
}

/** 竞品矩阵 */
export interface CompetitorMatrix {
  competitors: string[];
  dimensions: string[];
  rows: Array<{ competitor: string; cells: CompetitorMatrixCell[] }>;
}

/** 多来源证据冲突 */
export interface EvidenceConflict {
  area: ResearchArea;
  type: "numeric" | "factual";
  description: string;
  claims: string[];
  sources: string[];
}

/** 多来源交叉验证结果 */
export interface CrossValidationResult {
  conflicts: EvidenceConflict[];
  crossValidatedAreas: ResearchArea[];
  insufficientEvidence: string[];
}
/** 验证方案条目 */
export interface ValidationPlanItem {
  assumption: string;
  method: string;
  successCriteria: string;
  effort: "low" | "medium" | "high";
  /** V0.4.1 Phase 7A：可执行验证方案字段（AI 可补充，缺省由确定性填充） */
  hypothesis?: string;
  sampleSize?: string;
  failureCriteria?: string;
  deadline?: string;
  costEstimate?: string;
  owner?: string;
  relatedDimension?: ScoreDimension;
  /** 优先级（V0.4.1 Phase 7B-2，缺省 medium） */
  priority?: "high" | "medium" | "low";
}

/** 报告元信息：降级状态 / 外部证据情况 */
export interface ReportMeta {
  /** 任意阶段发生 provider 降级 */
  degraded: boolean;
  /** 是否包含真实外部证据（V0.3 无 Web Search，通常为 false） */
  externalEvidenceAvailable: boolean;
  /** 给用户的提示 */
  notice: string;
  generatedAt: string;
  providers: Partial<Record<ResearchStageName, { provider: AiProviderName; provider_degraded: boolean }>>;
  /** 领域信息（V0.4.1 Phase 6.1B：检测结果，用于上下文注入与可追溯） */
  domain?: { id: string; label: string; confidence: number };
}

/** 投资论点（Investment Thesis，V0.4.1 Phase 7A）：为什么值得投入/不投入的逻辑框架 */
export interface InvestmentThesis {
  id: string;
  opportunityId: string;
  runId: string;
  /** 领域（来自 report.meta.domain） */
  domain?: string;
  /** 核心假设（一句话） */
  coreHypothesis: string;
  /** 逻辑链（为什么成立） */
  logicChain: string[];
  /** 关键假设（尽量绑定证据/来源） */
  keyAssumptions: Array<{ claim: string; evidenceClass: "FACT" | "AI_INFERENCE" | "ASSUMPTION" | "NEEDS_VALIDATION"; sourceId?: string }>;
  /** 什么会证伪（反方逻辑） */
  invalidators: string[];
  /** 上行空间 */
  expectedUpside: string;
  /** 决策门（什么条件下 proceed） */
  decisionGate: string;
  /** 0-1 */
  confidence: number;
  createdAt: string;
}

/** 单位经济模型（Business Model Analyzer，V0.4.1 Phase 7A）：AI 提案输入 + 确定性计算 */
export interface UnitEconomicsModel {
  domain: string;
  currency: string;
  /** 原始输入（按领域不同：电商 aov/cogsRate/...；SaaS acvPerMonth/churnRate/...） */
  inputs: Record<string, number>;
  /** 确定性推导 */
  derived: {
    grossMarginRate: number;
    /** 单笔订单/单月贡献毛利（扣运费/平台费/变动成本后） */
    contributionPerUnit: number;
    contributionRate: number;
    /** 获客成本（用户输入） */
    cac: number;
    /** 回本周期（订单数或月数） */
    paybackUnits: number;
    /** 生命周期价值 */
    ltv: number;
    /** LTV / CAC */
    ltvCac: number;
  };
  /** 关键假设（含证据类） */
  assumptions: string[];
  /** 0-1 */
  confidence: number;
  createdAt: string;
}

/** 最终研究报告（结构化，非一段文本） */
export interface ResearchReport {
  opportunityId: string;
  opportunityName: string;
  executiveSummary: string;
  sections: ResearchSection[];
  score: ScoreResult;
  validationPlan: ValidationPlanItem[];
  nextActions: string[];
  /** 真实来源列表（含元数据与可信度） */
  sources: SourceDocument[];
  /** 多来源冲突 */
  conflicts: EvidenceConflict[];
  /** 交叉验证覆盖的领域 */
  crossValidatedAreas: ResearchArea[];
  /** 证据不足提示 */
  insufficientEvidence: string[];
  /** 竞品发现（自动发现） */
  competitors: CompetitorFinding[];
  /** 竞品矩阵 */
  competitorMatrix?: CompetitorMatrix;
  /** 投资论点（Business Decision Engine 生成，V0.4.1 Phase 7A） */
  thesis?: InvestmentThesis;
  /** 单位经济模型（Business Model Analyzer 生成，V0.4.1 Phase 7A） */
  unitEconomics?: UnitEconomicsModel;
  meta: ReportMeta;
}

/** 单个阶段的运行记录（成本/降级/状态可追踪） */
export interface StageRun {
  stage: ResearchStageName;
  status: StageRunStatus;
  /** openai / deepseek / external（外部研究阶段无 AI Provider） */
  provider: AiProviderName | "external";
  provider_degraded: boolean;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  durationMs: number;
  /** 安全摘要（不包含 Key / 响应原文） */
  error?: string;
}

/** 一次商机研究的完整运行（可持久化） */
export interface ResearchRun {
  runId: string;
  opportunityId: string;
  status: ResearchRunStatus;
  createdAt: string;
  updatedAt: string;
  stages: StageRun[];
  /** 各研究任务产出（Finding → Evidence → Source 追溯） */
  findings: ResearchFinding[];
  /** 评分版本历史（Score v1/v2/v3…） */
  scoreHistory: ScoreVersion[];
  /** 本次研究的来源文档（用户资料 + 外部网页） */
  sourceDocuments: SourceDocument[];
  /** 多来源交叉验证结果 */
  evidenceValidation?: CrossValidationResult;
  report?: ResearchReport;
  error?: { stage: string; type: string; message: string };
}

/** 研究输入 */
export interface ResearchInput {
  opportunity: {
    id: string;
    name: string;
    description: string;
    notes?: string;
  };
  /** 用户自己提供的资料（可空） */
  materials?: UserMaterial[];
}

// =====================================================================
// 未来预留：项目生命周期 / 决策 / 验证 / 复盘 / 学习（V0.3 仅保留结构，不实现）
// =====================================================================

/** 商机生命周期（预留：未来 Opportunity 状态迁移） */
export type OpportunityLifecycle =
  | "discovered"
  | "researching"
  | "validation"
  | "validated"
  | "launched"
  | "failed"
  | "paused"
  | "abandoned";

/** 生命周期状态与历史（预留） */
export interface OpportunityLifecycleState {
  opportunityId: string;
  lifecycle: OpportunityLifecycle;
  history: Array<{ lifecycle: OpportunityLifecycle; at: string }>;
}

/** 用户决策（预留：基于研究报告做决定） */
export interface UserDecision {
  id: string;
  opportunityId: string;
  runId?: string;
  decision: "proceed" | "pause" | "abandon" | "revise";
  rationale: string;
  linkedEvidence: EvidenceItem[];
  createdAt: string;
}

/** 用户训练答案（预留：能力画像数据源） */
export interface UserAnswer {
  id: string;
  questionId: string;
  answer: string;
  submittedAt: string;
}

/** AI 复盘 / 评审（预留：Examiner 或 Mentor） */
export interface AIReview {
  id: string;
  targetType: "answer" | "decision" | "validation";
  targetId: string;
  score?: number;
  feedback: string;
  createdAt: string;
}

/** 验证结果（预留：ValidationResult 关联 Validation Plan） */
export interface ValidationResult {
  id: string;
  opportunityId: string;
  planItemIndex: number;
  outcome: "confirmed" | "rejected" | "uncertain";
  note: string;
  createdAt: string;
}

/** 学习事件（预留：驱动 8 项商业能力画像） */
export interface LearningEvent {
  id: string;
  type: "opportunity_discovery" | "user_research" | "competitor_analysis" | "business_model" | "financial_analysis" | "validation" | "strategy_judgment" | "review";
  payload: Record<string, unknown>;
  createdAt: string;
}