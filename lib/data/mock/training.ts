import type { TrainingQuestion } from "@/lib/types";

/**
 * V0.1 mock 商业训练题目。
 * 覆盖 6 个分类；提交答案后不调用 AI，统一进入「等待 AI 评分」状态。
 */
export const mockTrainingQuestions: TrainingQuestion[] = [
  {
    id: "t-case-membership",
    category: "businessCase",
    title: "会员制商业模式拆解",
    description: "Costco 与山姆会员店靠会费就能盈利，商品只是引流工具。",
    prompt: "为什么某会员制商业模式可以成立？请从用户、成本结构、复购与护城河四个角度说明。",
    hints: ["会员费在利润表中如何体现？", "为什么低价商品不会摧毁毛利率？"],
  },
  {
    id: "t-case-dtc",
    category: "businessCase",
    title: "DTC 品牌案例：从 0 到 1",
    description: "分析一个你熟悉的 DTC 品牌从流量获取到复购闭环的关键动作。",
    prompt: "选择一家 DTC 品牌，说明它获取第一批用户的 3 个关键动作，以及为什么有效。",
  },
  {
    id: "t-judgment-pricing",
    category: "judgment",
    title: "定价判断：9.9 与 99",
    description: "一个工具类产品，定价 9.9 元/月与 99 元/月分别会带来什么后果？",
    prompt: "给出你的定价判断，并说明判断依据（用户、竞争、成本、感知价值）。",
    hints: ["价格锚点如何影响用户感知？", "低价是否等于低获客成本？"],
  },
  {
    id: "t-judgment-pivot",
    category: "judgment",
    title: "转折点判断",
    description: "项目验证 3 个月，付费转化率只有 1%，是否应该放弃？",
    prompt: "你会如何决策？请列出你需要的额外信息，再给出判断。",
  },
  {
    id: "t-model-subscription",
    category: "businessModel",
    title: "设计订阅制商业模式",
    description: "把一款一次性付费工具改成订阅制。",
    prompt: "设计它的订阅制方案：周期、定价、权益、取消策略，并说明单位经济模型。",
  },
  {
    id: "t-model-marketplace",
    category: "businessModel",
    title: "双边市场冷启动",
    description: "一个二手交易平台的供需两侧都很少。",
    prompt: "设计冷启动策略，并解释你优先补贴哪一侧以及原因。",
  },
  {
    id: "t-data-unit-economics",
    category: "dataAnalysis",
    title: "单位经济模型计算",
    description: "客单价 120 元，毛利率 40%，获客成本 30 元，月复购率 20%。",
    prompt: "计算单用户 3 个月的 LTV 与 LTV/CAC，并判断这个生意能否成立。",
    hints: ["复购率如何折算到月留存？", "LTV 至少应为 CAC 的几倍？"],
  },
  {
    id: "t-data-cohort",
    category: "dataAnalysis",
    title: "读懂留存曲线",
    description: "某 App 次日留存 40%，30 日留存 8%。",
    prompt: "这条留存曲线说明什么问题？你会优先优化哪个环节？",
  },
  {
    id: "t-competitor-analysis",
    category: "competitorAnalysis",
    title: "竞品差异化分析",
    description: "你进入的市场已有 3 个头部玩家。",
    prompt: "选择其中一个竞品，列出它的 3 个弱点，并说明你的产品如何差异化。",
  },
  {
    id: "t-ops-channel",
    category: "operationsStrategy",
    title: "冷启动渠道选择",
    description: "预算 5 万元，冷启动一个面向 B 端的小工具。",
    prompt: "你会把钱花在哪 1-2 个渠道？请给出理由与预期指标。",
  },
];