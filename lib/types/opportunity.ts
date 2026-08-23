/**
 * 商机（Opportunity）相关类型。
 * 商机 = 可能值得研究的想法，区别于已立项的「项目」（见 project.ts）。
 */

/** 商机来源：AI 发现 / 用户自己发现 */
export type OpportunitySource = "ai" | "user";

/** 商机状态：研究中 / 验证中 / 已验证 / 已放弃 */
export type OpportunityStatus =
  | "researching"
  | "validating"
  | "validated"
  | "abandoned";

/**
 * 机会评分维度（均为 0-10 分）。
 * risk 越高表示风险越高；overall 为综合评分。
 */
export interface OpportunityScore {
  /** 市场需求 */
  demand: number;
  /** 竞争强度（越高 = 竞争越激烈） */
  competition: number;
  /** 付费意愿 */
  willingnessToPay: number;
  /** 进入壁垒 / 护城河 */
  moat: number;
  /** 风险（越高 = 风险越大） */
  risk: number;
  /** 综合机会评分 0-10 */
  overall: number;
}

/** 商机 */
export interface Opportunity {
  id: string;
  /** 商机名称 */
  name: string;
  /** 一句话描述 */
  description: string;
  source: OpportunitySource;
  status: OpportunityStatus;
  /** AI 发现的商机带评分；用户新增的商机暂未评分（待未来 AI 评估） */
  score?: OpportunityScore;
  /** 创建时间（ISO 字符串） */
  createdAt: string;
  /** 用户备注（可选） */
  notes?: string;
}

/** 新增商机表单输入（与存储结构分离，便于未来校验/扩展） */
export interface OpportunityInput {
  name: string;
  description: string;
  source: OpportunitySource;
  notes?: string;
}