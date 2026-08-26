/**
 * Intent Analyzer（V1.7）：在 AI 回答前判断用户想解决什么问题（确定性分类，不额外调用 LLM）。
 */
export type AiIntent = "business_judgment" | "competitor" | "product_selection" | "execution_plan" | "market" | "general";

const RULES: Array<{ intent: AiIntent; keywords: string[] }> = [
  { intent: "competitor", keywords: ["竞品", "竞争对手", "对比", "竞争分析", "对手"] },
  { intent: "product_selection", keywords: ["选品", "卖什么", "产品选择", "推荐产品", "选什么产品", "上什么品"] },
  { intent: "execution_plan", keywords: ["执行", "运营", "方案", "计划", "打法", "怎么做", "如何做", "投放", "营销"] },
  { intent: "business_judgment", keywords: ["值不值得", "值得做", "判断", "该不该", "要不要做", "分析这个项目", "可行性", "建议"] },
  { intent: "market", keywords: ["市场", "需求", "趋势", "规模", "数据", "行情"] },
];

export function analyzeIntent(text: string): AiIntent {
  const t = text.toLowerCase();
  // 优先级：竞品 > 选品 > 执行 > 判断 > 市场
  for (const rule of RULES) {
    if (rule.keywords.some((k) => t.includes(k))) return rule.intent;
  }
  return "general";
}

export const INTENT_LABELS: Record<AiIntent, string> = {
  business_judgment: "商业判断",
  competitor: "竞品分析",
  product_selection: "选品分析",
  execution_plan: "执行规划",
  market: "市场分析",
  general: "综合问答",
};
