/**
 * 商机（Opportunity）相关类型。
 * 商机 = 可能值得研究的想法，区别于已立项的「项目」（见 project.ts）。
 */

/** 商机来源：AI 发现 / 用户自己发现 */
export type OpportunitySource = "ai" | "user";

/** 商机来源类型（V1.2.1）：手动创建 / AI 雷达发现 */
export type OpportunitySourceType = "manual_create" | "ai_radar";

/** 商机状态：已发现 / 收集中 / 研究中 / 验证中 / 已验证 / 已放弃 */
export type OpportunityStatus =
  | "discovered"
  | "reviewing"
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
  /** AI 商业雷达发现（V0.8；source=ai 时携带） */
  radar?: RadarFinding;
  /** 来源类型（V1.2.1）：manual_create / ai_radar（由 radar 是否携带推导） */
  sourceType?: OpportunitySourceType;
  /** 所属雷达扫描（V1.2.1：scanId） */
  scanId?: string;
}

/** 新增商机表单输入（与存储结构分离，便于未来校验/扩展） */
export interface OpportunityInput {
  name: string;
  description: string;
  source: OpportunitySource;
  notes?: string;
  /** AI 雷达发现（V0.8） */
  radar?: RadarFinding;
  /** 状态（V1.2.1：缺省由来源决定——ai→discovered，user→researching） */
  status?: OpportunityStatus;
}

/** AI 商业雷达发现（V0.8）：AI 主动扫描全球市场生成的机会情报（行业无关） */
export interface RadarFinding {
  /** 机会名称（如「AI 个人知识管理服务增长机会」） */
  name: string;
  /** 为什么现在值得关注 */
  description: string;
  /** 数据来源 / 发现逻辑 */
  source: string;
  /** 领域标签（科技/消费/服务/制造/贸易/互联网/AI应用…，行业无关） */
  category: string;
  marketSize: string;
  growth: string;
  competition: string;
  entryBarrier: string;
  profitability: string;
  /** 综合评分 0-100 */
  score: number;
  suggestion: "值得研究" | "继续观察" | "不建议进入";
  scannedAt: string;
  /** 所属扫描（V1.2.1：持久化用） */
  scanId?: string;
}