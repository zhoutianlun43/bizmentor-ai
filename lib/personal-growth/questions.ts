/**
 * 首次启动：个人深度建模阶段（六阶段 AI 访谈）。
 * 每阶段给出引导问题，用户回答后推进；全部完成 → 生成《个人成长战略蓝图 V1.0》。
 */
export interface ModelingStage {
  key: string;
  title: string;
  description: string;
  questions: string[];
}

export const MODELING_STAGES: ModelingStage[] = [
  {
    key: "life",
    title: "第一阶段：人生经历",
    description: "先让我了解你的来路：哪些经历塑造了现在的你。",
    questions: [
      "你的成长经历中，哪些关键经历塑造了现在的你？",
      "过去 3 年你最重要的 3 个决定是什么？为什么？",
      "目前最让你有成就感的一件事是什么？",
    ],
  },
  {
    key: "mind",
    title: "第二阶段：性格与思维模式",
    description: "了解你的性格、压力反应与决策方式。",
    questions: [
      "你如何描述自己的性格特点？",
      "遇到压力时，你的第一反应是什么？",
      "你做重要决定时的思考方式是什么？",
    ],
  },
  {
    key: "career",
    title: "第三阶段：事业财富目标",
    description: "梳理你的事业方向与财富认知。",
    questions: [
      "你理想的事业状态是什么？",
      "你对财富的定义和目标是什么？",
      "你愿意为之长期投入的方向是什么？",
    ],
  },
  {
    key: "ability",
    title: "第四阶段：能力结构",
    description: "盘点当前能力与瓶颈。",
    questions: [
      "你最强的 3 项能力是什么？",
      "你最想提升的能力是什么？",
      "你目前最大的能力瓶颈是什么？",
    ],
  },
  {
    key: "lifestyle",
    title: "第五阶段：生活方式",
    description: "关注精力、作息与能量来源。",
    questions: [
      "你现在的生活作息、运动、精力状态如何？",
      "什么让你感到消耗？什么让你充满能量？",
      "你理想中的一天是什么样的？",
    ],
  },
  {
    key: "vision",
    title: "第六阶段：价值观和人生愿景",
    description: "最后，明确你的价值观与长期愿景。",
    questions: [
      "你最看重的价值观是什么？",
      "10 年后你希望自己处于什么状态？",
      "如果没有任何限制，你最想成为什么样的人？",
    ],
  },
];

/** 汇总某阶段的回答文本 */
export function stageAnswerText(answers: string[] | undefined, stageIndex: number): string {
  return (answers && answers[stageIndex]) || "";
}
