/**
 * Personal Knowledge System 类型（V0.4.2 Phase 9B-4）。
 * Knowledge 与 Memory 分离：
 * - Memory 记录「发生过什么」（决策/事件）
 * - Knowledge 总结「这个用户是什么样的人」（习惯/判断方式/偏好/经验）
 * 原则：AI 只能生成候选（confirmed=false），必须用户确认后才进入长期 Knowledge。
 */
export type KnowledgeType =
  | "habit" // 经营习惯
  | "judgment_style" // 判断方式
  | "industry_experience" // 行业经验
  | "success_case" // 成功经验
  | "failure_case"; // 失败经验

export type KnowledgeSource = "user_input" | "ai_suggestion" | "review" | "decision";

export interface KnowledgeRecord {
  id: string;
  userId: string;
  type: KnowledgeType;
  content: string;
  tags: string[];
  source: KnowledgeSource;
  /** 0-1 */
  confidence: number;
  /** 用户确认后才为 true；未确认只能作为临时建议，不影响核心决策 */
  confirmed: boolean;
  createdAt: string;
}

/** 用户输入捕获入参 */
export interface UserKnowledgeInput {
  content: string;
  type?: KnowledgeType;
  tags?: string[];
  userId?: string;
}