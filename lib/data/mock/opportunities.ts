import type { Opportunity, OpportunityScore } from "@/lib/types";

/**
 * V0.1 mock 商机数据。
 * 首次访问时写入 localStorage；未来替换为 Supabase 数据。
 */

/** 构造一个带评分的 mock 商机（overall 自动计算，保证数据一致） */
function mockScore(
  demand: number,
  competition: number,
  willingnessToPay: number,
  moat: number,
  risk: number,
  overall: number,
): OpportunityScore {
  return { demand, competition, willingnessToPay, moat, risk, overall };
}

export const mockOpportunities: Opportunity[] = [
  {
    id: "opp-ai-ecommerce",
    name: "AI × 电商运营自动化",
    description: "面向中小电商卖家的 AI 运营助手：自动生成素材、客服话术与投放建议。",
    source: "ai",
    status: "researching",
    score: mockScore(8.8, 7.5, 8.2, 7.0, 5.5, 8.4),
    createdAt: "2026-08-23T08:00:00+08:00",
  },
  {
    id: "opp-dtc-skincare",
    name: "独立站 DTC 护肤订阅制",
    description: "面向年轻女性的功效护肤订阅盒子，按月订阅 + 皮肤检测报告。",
    source: "ai",
    status: "researching",
    score: mockScore(7.8, 6.5, 8.5, 6.8, 6.0, 7.8),
    createdAt: "2026-08-21T10:30:00+08:00",
  },
  {
    id: "opp-local-saas",
    name: "本地生活商家 SaaS 工具",
    description: "为社区餐饮/美容门店提供预约、会员与私域运营一体化工具。",
    source: "user",
    status: "validating",
    score: mockScore(7.5, 6.0, 7.2, 6.5, 5.0, 7.2),
    createdAt: "2026-08-18T14:00:00+08:00",
  },
  {
    id: "opp-resume-ai",
    name: "AI 简历优化工具",
    description: "基于岗位描述自动改写简历，并给出面试预测问题。",
    source: "user",
    status: "abandoned",
    score: mockScore(6.8, 8.5, 5.5, 4.5, 6.5, 5.6),
    createdAt: "2026-08-10T09:00:00+08:00",
  },
  {
    id: "opp-luxury-auth",
    name: "二手奢侈品鉴定",
    description: "结合图像识别与专家复核的二手奢侈品鉴定服务。",
    source: "ai",
    status: "validated",
    score: mockScore(7.6, 5.8, 8.0, 8.2, 5.2, 8.1),
    createdAt: "2026-07-30T16:20:00+08:00",
  },
];