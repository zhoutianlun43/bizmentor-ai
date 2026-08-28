/**
 * 个人成长中心（Personal AI Life OS V1.0）：个人 AI 人生 CEO 数据模型。
 * 与项目主理人系统（Project Brain）独立；可共享用户画像概念，但数据逻辑完全分开。
 */

/** 专家委员会角色 */
export type GrowthExpertRole = "psychology" | "strategy" | "wealth" | "learning" | "execution" | "health" | "relationship" | "ceo";

export const GROWTH_EXPERT_LABELS: Record<GrowthExpertRole, string> = {
  psychology: "心理成长专家",
  strategy: "人生战略顾问",
  wealth: "商业财富顾问",
  learning: "学习科学专家",
  execution: "执行力教练",
  health: "健康精力顾问",
  relationship: "沟通关系专家",
  ceo: "人生CEO",
};

/** 人格档案（01 人格档案） */
export interface PersonalityProfile {
  traits: string[];        // 性格特点
  strengths: string[];     // 优势
  weaknesses: string[];    // 弱点
  stressPatterns: string[]; // 压力模式
  decisionStyle: string;   // 决策方式
  summary: string;         // 一句话人格总结
}

/** 人生战略（02 人生战略） */
export interface LifeStrategy {
  values: string[];          // 我的价值观
  longTermGoal: string;      // 长期目标
  fiveYearGoal: string;      // 五年目标
  tenYearDirection: string;  // 十年方向
}

/** 能力模型（03 能力成长） */
export interface AbilityScore {
  name: string;
  current: number;   // 0-100
  target: number;    // 0-100
  note?: string;
}

export interface AbilityMap {
  current: AbilityScore[];   // 商业/学习/执行/沟通/领导 等
  toImprove: string[];       // 待提升能力
}

/** 动力模型（什么让我成长/消耗/坚持） */
export interface MotivationModel {
  energizes: string[];   // 什么让我成长
  drains: string[];      // 什么让我消耗
  sustains: string[];    // 什么让我长期坚持
}

/** 人生洞察（07 人生洞察） */
export interface GrowthInsight {
  time: string;
  content: string;
  category: "problem" | "opportunity" | "risk" | "habit" | "strength";
  source?: string;
  /** 建议（AI 主动扫描附带） */
  suggestion?: string;
}

/** 成长评分（100 分制，6 维度） */
export interface GrowthScore {
  overall: number; // 0-100
  dimensions: Array<{ name: string; score: number; note?: string }>;
  strengths: string[];
  weaknesses: string[];
  improvement: string[];
}

/** 每日成长记录（05 每日复盘） */
export interface DailyReview {
  id: string;
  date: string;          // YYYY-MM-DD
  plan: string;          // 今日计划
  execution: string;     // 今日执行
  reflection: string;    // 今日复盘
  mood: string;          // 情绪状态
  problems: string;      // 遇到的问题
  deepAnalysis?: string; // 今日深度分析
  expertBoard?: Array<{ expert: GrowthExpertRole; role: string; insight: string }>;
  tomorrowPlan?: string[]; // 明日最重要 3 件事
  score?: GrowthScore;
  createdAt: string;
}

/** 周期成长报告（04 成长报告） */
export interface GrowthReport {
  id: string;
  type: "weekly" | "monthly";
  period: string;    // 2026-W35 / 2026-08
  title: string;
  summary: string;
  sections: Array<{ title: string; content: string }>;
  createdAt: string;
}

/** 知识沉淀（01-07 分类） */
export const KNOWLEDGE_CATEGORIES = [
  "01 人格档案",
  "02 人生战略",
  "03 能力成长",
  "04 学习记录",
  "05 每日复盘",
  "06 决策记录",
  "07 人生洞察",
] as const;
export type KnowledgeCategory = (typeof KNOWLEDGE_CATEGORIES)[number];

export interface KnowledgeEntry {
  id: string;
  category: KnowledgeCategory;
  title: string;
  content: string;
  createdAt: string;
}

/** 首次建模状态（六阶段深度访谈） */
export interface ModelingState {
  started: boolean;
  completed: boolean;
  currentStage: number; // 0-5（对应 MODELING_STAGES 下标）
  answers: string[];    // 每阶段综合回答（文本）
  blueprint?: string;   // 《个人成长战略蓝图 V1.0》（结构化 JSON 文本）
  blueprintGeneratedAt?: string;
}

/** 个人成长大脑（持久化到 .data/personal-growth.json，跨重启/刷新存活） */
export interface PersonalGrowthBrain {
  userId: string;
  modeling: ModelingState;
  personality: PersonalityProfile | null;
  strategy: LifeStrategy | null;
  abilities: AbilityMap | null;
  motivation: MotivationModel | null;
  insights: GrowthInsight[];
  dailyReviews: DailyReview[];
  reports: GrowthReport[];
  knowledge: KnowledgeEntry[];
  updatedAt: string;
}

export function emptyBrain(userId: string): PersonalGrowthBrain {
  return {
    userId,
    modeling: { started: false, completed: false, currentStage: 0, answers: [] },
    personality: null,
    strategy: null,
    abilities: null,
    motivation: null,
    insights: [],
    dailyReviews: [],
    reports: [],
    knowledge: [],
    updatedAt: new Date().toISOString(),
  };
}

/** 人生蓝图（建模完成后生成） */
export interface GrowthBlueprint {
  sections: {
    个人画像: string;
    核心优势: string[];
    限制因素: string[];
    当前人生阶段判断: string;
    核心成长方向: string;
    "12个月升级路线": Array<{ phase: string; goal: string; actions: string[] }>;
  };
  personality?: PersonalityProfile;
  strategy?: LifeStrategy;
  abilities?: AbilityMap;
  motivation?: MotivationModel;
}
