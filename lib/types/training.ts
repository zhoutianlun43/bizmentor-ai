/**
 * 商业训练相关类型。
 * V0.1 只保存用户提交的答案，评分由未来的 AI Examiner Agent 完成。
 */

/** 训练分类 */
export type TrainingCategory =
  | "businessCase"
  | "judgment"
  | "businessModel"
  | "dataAnalysis"
  | "competitorAnalysis"
  | "operationsStrategy";

/** 训练题目 */
export interface TrainingQuestion {
  id: string;
  category: TrainingCategory;
  /** 题目标题 */
  title: string;
  /** 背景 / 说明 */
  description: string;
  /** 需要用户回答的问题 */
  prompt: string;
  /** 可选思考提示 */
  hints?: string[];
}

/** 答案提交状态：V0.1 统一为 pending（等待 AI 评分） */
export type SubmissionStatus = "pending" | "graded";

/** 用户提交的答案 */
export interface AnswerSubmission {
  id: string;
  questionId: string;
  answer: string;
  submittedAt: string;
  status: SubmissionStatus;
  /** 未来由 AI Examiner 写入 */
  score?: number;
  /** 未来由 AI Examiner 写入 */
  feedback?: string;
}