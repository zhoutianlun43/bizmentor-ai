/**
 * Skill System 类型（V0.4.2 Phase 9B-3）。
 * Skill 不是新的业务逻辑：Skill 是 Agent 调用现有 Engine/Memory 的业务能力封装。
 */
import type { AgentContext } from "../agent/types";
import type { BusinessOSContext } from "../context/types";
import type { MemoryEngine } from "../memory/service";
import type { KnowledgeEngine } from "../knowledge/knowledge-engine";
import type { DecisionMemoryRecord, MemoryPattern } from "../memory/types";
import type { ResearchArea, SourceDocument } from "../research/types";

/** 技能用到的研究结果（轻量抽象，由 ResearchService.startResearch 适配而来） */
export interface SkillResearchResult {
  sections: Array<{ area: ResearchArea; content: string }>;
  sources: SourceDocument[];
  score?: { overall_score: number; confidence: number };
}

/** 技能依赖（引擎/记忆的薄封装；测试可注入 fake） */
export interface SkillDeps {
  /** 研究能力（可选：未注入则标记「需研究验证」） */
  runResearch?: (input: { name: string; description: string }) => Promise<SkillResearchResult>;
  /** 记忆引擎（可选） */
  memory?: MemoryEngine;
  /** 个人知识引擎（可选：Skill 读取已确认的用户长期知识） */
  knowledge?: KnowledgeEngine;
}

/** 技能输出（统一结构） */
export interface SkillOutput {
  summary: string;
  structured: unknown;
  actions: string[];
  evidence: Array<{ label: string; detail?: string }>;
  createdAt: string;
}

/** 可插拔商业技能 */
/** Skill 执行上下文：AgentContext + 统一经营上下文（只读；Skill 不得修改 Profile/Knowledge） */
export type SkillRunContext = AgentContext & { businessContext: BusinessOSContext };

export interface BizSkill {
  id: string;
  name: string;
  description: string;
  domain: string;
  /** 依赖的工具 id（信息性，供 Agent 路由） */
  requiredTools: string[];
  run(context: SkillRunContext, input: unknown): Promise<SkillOutput>;
}

/** 选品分析输入 */
export interface ProductSelectionInput {
  productIdea: string;
  category?: string;
  priceRange?: string;
  targetUser?: string;
}

/** 选品分析结果 */
export interface ProductSelectionResult {
  productIdea: string;
  category?: string;
  priceRange?: string;
  targetUser?: string;
  marketOpportunity: string;
  userNeed: string;
  competition: string;
  risks: string[];
  suggestedActions: string[];
  /** 历史类似案例（MemoryEngine.similar） */
  historicalCases: Array<{ decisionId: string; opportunityName: string; outcome: string; domain?: string; lesson: string }>;
  /** 用户已确认的长期知识（价格偏好/风险偏好/供应链等） */
  userKnowledge?: string[];
}

/** 竞品拆解输入 */
export interface CompetitorAnalysisInput {
  competitor: string;
  category?: string;
  platform?: string;
}

/** 竞品拆解结果 */
export interface CompetitorAnalysisResult {
  competitor: string;
  category?: string;
  platform?: string;
  positioning: string;
  pricing: string;
  contentStrategy: string;
  trafficStrategy: string;
  strengths: string[];
  weaknesses: string[];
  replicableStrategies: string[];
  /** 历史 Memory 模式（经验注入） */
  memoryPatterns: MemoryPattern[];
  /** 用户已确认的长期知识 */
  userKnowledge?: string[];
}

export type { AgentContext, DecisionMemoryRecord, MemoryPattern };