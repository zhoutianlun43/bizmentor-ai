/**
 * 商业操盘手报告 Prompts（V1.2）。
 * 原则：真实数据优先；sourceRequired=true 表示该条目需要真实来源；无真实来源必须写「暂无真实来源，需要验证」；禁止编造价格/销量/成本。
 */
import type { OperationSource } from "./types";

export interface PromptParts {
  system: string;
  user: string;
}

const JSON_INSTRUCTION = "只输出 JSON，不要输出 Markdown 代码块，不要输出任何额外文字。";

const REALITY_RULES = `真实数据优先原则：
- 只能引用上面提供的真实来源（标题/URL/平台）中的数据；没有真实数据支撑的字段写「暂无真实来源，需要验证」，禁止编造价格/销量/成本/趋势。
- sourceRequired=true 表示该条目必须有真实来源支撑；若无法获取真实数据，sourceRequired 仍为 true 且 source 字段写「暂无真实来源，需要验证」。
- 你的角色是 AI 商业操盘手（AI Business Operator），不是写商业计划书：结论必须可执行、可核算、可验证。`;

function sourcesText(sources: OperationSource[]): string {
  if (!sources || sources.length === 0) return "\n\n（本次未采集到真实外部来源，所有数据字段必须写「暂无真实来源，需要验证」）";
  return (
    "\n\n本次采集到的真实来源（只能引用这些）：\n" +
    sources
      .map((s, i) => `${i + 1}. ${s.title ?? s.url ?? "未命名"}${s.publisher ? "（" + s.publisher + "）" : ""}${s.url ? " " + s.url : ""}`)
      .join("\n")
  );
}

function base(role: string, extra: string): string {
  return `你是 BizMentor 的「${role}」。${REALITY_RULES}\n${extra}\n${JSON_INSTRUCTION}`;
}

/** 组 A：市场真实需求验证 + 产品筛选矩阵 + 供应链 */
export function operationPlanAPrompt(input: {
  opportunityName: string;
  description: string;
  executiveSummary: string;
  sources: OperationSource[];
}): PromptParts {
  return {
    system: base(
      "AI 商业操盘手（市场与选品）",
      "第一部分：市场真实需求验证——对 8-12 个关键词按 平台（Google Trends/TikTok/Amazon/Reddit/YouTube/社媒）输出趋势与数据来源。第二部分：产品筛选矩阵——从 10-20 个候选产品中筛选（不是拍脑袋），每个候选含 供应来源/参考链接/目标市场/需求/竞争数量/售价/采购成本/毛利/物流/预计利润/竞争难度1-10/评分0-100/推荐等级(推荐/考虑/淘汰)/为什么选择/为什么淘汰。第三部分：供应链——货哪里来，渠道/价格区间/MOQ/生产周期/物流/预计成本；无法获取真实供应链时 verified=false 且 note 写「需要进一步验证」。",
    ),
    user: `请为以下商机生成商业操盘手报告的前三部分。\n\n商机：${input.opportunityName}\n描述：${input.description}\n研究执行摘要：${input.executiveSummary}${sourcesText(input.sources)}\n\nJSON 格式：\n{"marketValidation":{"summary":"总结","rows":[{"keyword":"关键词","platform":"平台","trend":"趋势","source":"数据来源或「暂无真实来源，需要验证」","businessMeaning":"商业意义","sourceRequired":true,"sourceRef":{"title":"来源标题","url":"来源URL"}}]},"productMatrix":{"summary":"筛选总结","candidates":[{"name":"产品名","supplySource":"供应来源","referenceLink":"参考链接","targetMarket":"目标市场","demand":"需求","competitionCount":"竞争数量","price":"售价","purchaseCost":"采购成本","grossMargin":"毛利","logisticsCost":"物流成本","estimatedProfit":"预计利润","competitionDifficulty":5,"score":72,"recommendation":"recommend|consider|reject","why":"为什么选择","whyNot":"为什么淘汰","sourceRequired":true,"sourceRef":{}}]},"supplyChain":{"channels":["渠道1"],"priceRange":"价格区间","moq":"MOQ","productionCycle":"生产周期","logistics":"物流方式","estimatedCost":"预计成本","verified":false,"note":"需要进一步验证"}}`,
  };
}

/** 组 B：竞品深度拆解 + 定价模型 */
export function operationPlanBPrompt(input: {
  opportunityName: string;
  description: string;
  executiveSummary: string;
  sources: OperationSource[];
}): PromptParts {
  return {
    system: base(
      "AI 商业操盘手（竞品与定价）",
      "第一部分：竞品深度拆解——分析 5-8 个真实竞品，每个含 品牌/网站/平台/产品/价格/销量/评价/广告素材/流量来源/核心卖点/用户评价/差评/机会点；sourceRequired=true 的字段必须有真实来源或写「暂无真实来源，需要验证」。第二部分：定价模型——真实成本 = 采购成本 - 物流 - 平台佣金 - 广告成本 - 人工成本；输出 售价/毛利/净利润/盈亏平衡广告成本/目标ROI；禁止只写「售价15-30美元」。",
    ),
    user: `请为以下商机生成竞品与定价。\n\n商机：${input.opportunityName}\n描述：${input.description}\n研究执行摘要：${input.executiveSummary}${sourcesText(input.sources)}\n\nJSON 格式：\n{"competitorAnalysis":{"summary":"竞品打法总结","competitors":[{"brand":"品牌","website":"网站","platform":"平台","product":"产品","price":"价格","sales":"销量","reviews":"评价","adMaterials":"广告素材","trafficSource":"流量来源","coreSellingPoint":"核心卖点","userReviews":"用户评价","negativeReviews":"差评","opportunity":"机会点","sourceRequired":true,"sourceRef":{}}]},"pricing":{"purchaseCost":"采购成本","logistics":"物流","platformFee":"平台佣金","adCost":"广告成本","labor":"人工成本","totalCost":"真实成本","sellingPrice":"售价","grossMargin":"毛利","netProfit":"净利润","breakevenAdCost":"盈亏平衡广告成本","targetROI":"目标ROI","sourceRequired":true,"sourceRef":{}}}`,
  };
}

/** 组 C：页面优化 + 内容30 + 广告 + AI操盘90天 + 投资判断 */
export function operationPlanCPrompt(input: {
  opportunityName: string;
  description: string;
  executiveSummary: string;
  sources: OperationSource[];
}): PromptParts {
  return {
    system: base(
      "AI 商业操盘手（获客与决策）",
      "第一部分：页面与销售优化——至少10个标题版本/3-5张主图方案（目的/视觉表达/文字）/商品描述（痛点-解决方案-信任-CTA）/SEO关键词（搜索量/竞争）。第二部分：内容增长系统——30条内容计划，每条含 标题/视频结构/前三秒Hook/拍摄方式/产品展示/CTA/目标指标。第三部分：广告投放——分阶段（测试预算/素材数量/目标/指标/淘汰规则/放量规则）。第四部分：AI操盘90天计划——分阶段，含 目标/AI负责/用户负责/工具/输出结果/成功标准（AI负责所有研究类任务，用户只负责预算/供应链权限/审批/决策）。第五部分：投资判断——是否进入 YES/NO/验证后进入，理由分 市场/竞争/供应链/利润/增长/风险；最大未知因素；下一步关键实验（实验/预算/周期/成功标准/失败标准）。",
    ),
    user: `请为以下商机生成获客与决策部分。\n\n商机：${input.opportunityName}\n描述：${input.description}\n研究执行摘要：${input.executiveSummary}${sourcesText(input.sources)}\n\nJSON 格式：\n{"pageOptimization":{"titles":["标题1"],"mainImages":[{"slot":"第一张","purpose":"目的","visual":"视觉表达","text":"文字"}],"description":{"painPoints":"痛点","solution":"解决方案","trust":"信任","cta":"CTA"},"seoKeywords":[{"keyword":"关键词","searchVolume":"搜索量","competition":"竞争"}]},"contentPlan":[{"day":"Day1","title":"标题","structure":"视频结构","hook":"前三秒Hook","filming":"拍摄方式","productDisplay":"产品展示","cta":"CTA","targetMetric":"目标指标"}],"adPlan":{"stages":[{"stage":"第一阶段","budget":"预算","materials":"素材数量","goal":"目标","metrics":"指标","eliminateRule":"淘汰规则","scaleRule":"放量规则"}]},"ninetyDayPlan":{"phases":[{"phase":"第1-14天","goal":"目标","aiResponsible":"AI负责","userResponsible":"用户负责","tools":"工具","output":"输出结果","successCriteria":"成功标准"}]},"investmentJudgment":{"recommendation":"yes|no|validate","reasons":{"market":"市场","competition":"竞争","supplyChain":"供应链","profit":"利润","growth":"增长","risk":"风险"},"biggestUnknown":"最大未知因素","nextExperiment":{"experiment":"具体实验","budget":"预算","cycle":"周期","successCriteria":"成功标准","failureCriteria":"失败标准"}}}`,
  };
}
