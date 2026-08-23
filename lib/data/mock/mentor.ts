import type { MentorProfile } from "@/lib/types";

/**
 * V0.1 mock 用户商业能力画像。
 * 未来由 AI 根据用户真实行为（训练成绩、商机判断、项目验证记录）自动计算。
 */
export const mockMentorProfile: MentorProfile = {
  level: 1,
  title: "商业观察者",
  xp: 120,
  xpToNext: 300,
  abilities: {
    opportunityDiscovery: 42,
    userResearch: 35,
    competitorAnalysis: 38,
    businessModel: 30,
    financialAnalysis: 26,
    validation: 24,
    strategyJudgment: 33,
    review: 20,
  },
};