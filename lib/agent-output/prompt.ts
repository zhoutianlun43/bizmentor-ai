/**
 * 结构化输出系统提示（V1.6）：格式路由规则 + JSON schema + 禁止连续长文。
 * 用户意图 → 最佳输出形式：竞品→表格+SWOT；运营方案→时间线+内容表+投放；值不值得做→判断卡+风险矩阵；选品→产品表。
 */
import { buildAgentSystemPrompt } from "../project-agent/cognition";
import type { AgentMode, ProjectCognitionProfile, ProjectMemory } from "../project-agent/types";
import type { ResearchRun } from "../research/types";

const FORMAT_RULES = `输出格式路由（根据用户需求自动选择，用结构化 blocks 呈现，不要输出连续长文）：
- 竞品/价格/产品/数据对比 → table（表格）+ 可加 swot
- 90天/执行/运营方案 → timeline（时间线）+ content（内容表）
- 值不值得做/判断/建议 → summary（判断卡）+ risk（风险矩阵）
- 选品 → products（产品候选表）
- 商业模式/成本利润 → financial（财务表）
- 一般问答/解释 → text（分段，每段≤300字）
规则：
1. 只输出 JSON，不要 Markdown 代码块，不要任何额外文字。
2. 不要连续大段文字；优先用卡片/表格/列表/时间线。
3. 每条文本不超过 300 字；超过则拆分。
4. 所有内容必须结合项目资料，禁止编造项目没有的数据。
5. 项目会议室模式：用户描述项目变化/问题（成本上涨/数据异常等）时，输出「影响分析 → 方案A/B/C → 推荐 → 项目更新已记录」。
6. 每次回答在 projectUpdate 中给出本次沉淀：newFacts（可用字符串，或结构化 {content,type:FACT|INFERENCE|ASSUMPTION,source,confidence,impact}；真实数据标 FACT 并给来源与可信度，AI 推断标 INFERENCE，假设标 ASSUMPTION）/newRisks/newJudgments（before→after+原因）/planChanges/decision（含原因与依据）；战略状态或核心问题变化用 strategyUpdate，指标变化用 metricsUpdate；没有变化就不填。`;

const BLOCK_SCHEMA = `JSON 格式：{"format":"answer|report|table|plan|timeline|dashboard|swot|products|content|financial|risk","title":"标题","blocks":[{"type":"summary","title":"核心判断","conclusion":"结论","confidence":0.6,"basis":["依据1","依据2"]},{"type":"table","title":"竞品分析","headers":["产品","价格","销量","优势","风险"],"rows":[["A","$20","1k","x","y"]]},{"type":"timeline","title":"90天计划","phases":[{"phase":"第1-14天","goal":"目标","actions":["动作1"],"owner":"负责人","metric":"成功指标"}]},{"type":"swot","title":"SWOT","strengths":["优势"],"weaknesses":["劣势"],"opportunities":["机会"],"threats":["威胁"]},{"type":"products","title":"产品候选","items":[{"name":"产品","supply":"供应","cost":"成本","price":"售价","profit":"利润","competition":"竞争","score":72}]},{"type":"content","title":"内容计划","items":[{"date":"Day1","platform":"TikTok","topic":"主题","title":"标题","format":"素材形式","goal":"目标"}]},{"type":"financial","title":"利润模型","rows":[{"item":"成本","value":"$10","note":"备注"}]},{"type":"risk","title":"风险矩阵","items":[{"risk":"风险","impact":"影响","probability":"概率","mitigation":"应对"}]},{"type":"text","paragraphs":["段落1"]}],"projectUpdate":{"newFacts":[{"content":"新增事实","type":"FACT","source":"来源","confidence":90,"impact":"影响范围"}],"newRisks":["新风险"],"newJudgments":[{"before":"原判断","after":"新判断","reason":"原因"}],"planChanges":["方案变化"],"decision":{"decision":"决策内容","reason":"原因","basis":"依据"},"strategyUpdate":{"currentStatus":"当前战略状态","coreQuestion":"当前核心问题","forbiddenActions":["暂不扩大库存"]},"metricsUpdate":{"northStarMetric":"北极星指标","keyMetrics":[{"name":"转化率","current":"2%","target":"5%"}]}}}`;

/** 构建结构化输出系统提示（在项目认知基础上追加格式路由 + JSON schema） */
export function buildStructuredSystemPrompt(
  cognition: ProjectCognitionProfile,
  memory: ProjectMemory,
  run: ResearchRun | undefined,
  mode: AgentMode,
): string {
  return buildAgentSystemPrompt(cognition, memory, run, mode) + "\n\n" + FORMAT_RULES + "\n" + BLOCK_SCHEMA;
}
