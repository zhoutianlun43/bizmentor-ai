/**
 * 项目（Project）相关类型。
 * 项目 = 用户已经决定进入验证阶段的机会，与「商机」严格区分。
 */
export interface Project {
  id: string;
  /** 项目名称 */
  name: string;
  /** 当前阶段，例如：用户验证 / 市场研究 / 商业模式设计 */
  stage: string;
  /** 整体进度 0-100 */
  progress: number;
  /** 下一步行动 */
  nextAction: string;
  /** 最近更新时间（ISO 字符串） */
  updatedAt: string;
}