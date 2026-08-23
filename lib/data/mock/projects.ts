import type { Project } from "@/lib/types";

/**
 * V0.1 mock 项目数据（项目 = 已决定验证的商机）。
 */
export const mockProjects: Project[] = [
  {
    id: "proj-ai-ecommerce",
    name: "AI电商运营",
    stage: "用户验证",
    progress: 60,
    nextAction: "访谈10位目标用户",
    updatedAt: "2026-08-22T18:00:00+08:00",
  },
  {
    id: "proj-dtc-skincare",
    name: "独立站DTC护肤订阅",
    stage: "市场研究",
    progress: 35,
    nextAction: "完成竞品定价分析",
    updatedAt: "2026-08-21T10:00:00+08:00",
  },
];