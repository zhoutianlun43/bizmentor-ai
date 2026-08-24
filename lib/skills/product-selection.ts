/**
 * Skill: product_selection（选品分析助手，V0.4.2 Phase 9B-3）。
 * 通用选品分析（行业无关）。调用 Research Engine + Domain（可选）+ Memory（历史类似案例）。
 * 只编排，不复制引擎逻辑；未注入 research 时诚实标记「需研究验证」。
 */
import { sectionOf } from "./research-adapter";
import { knowledgeInsights } from "../knowledge/knowledge-engine";
import type { BizSkill, ProductSelectionInput, ProductSelectionResult, SkillDeps, SkillOutput } from "./types";

export function createProductSelectionSkill(deps: SkillDeps): BizSkill {
  return {
    id: "product_selection",
    name: "选品分析助手",
    description: "选品分析：市场机会 / 用户需求 / 竞争 / 风险 / 建议动作 / 历史类似案例",
    domain: "ecommerce",
    requiredTools: ["research_tool", "memory_tool"],
    async run(_ctx, input): Promise<SkillOutput> {
      const i = (input ?? {}) as ProductSelectionInput;
      if (!i.productIdea) throw new Error("product_selection 需要 productIdea");
      const name = `${i.category ? i.category + "·" : ""}${i.productIdea}`;
      const description = `选品分析：${i.productIdea}${i.category ? "，类目 " + i.category : ""}${i.priceRange ? "，价格带 " + i.priceRange : ""}${i.targetUser ? "，目标用户 " + i.targetUser : ""}`;

      // 1) Memory：历史类似案例（过去成功/失败决策）
      const historical = deps.memory ? await deps.memory.similar({ domain: "ecommerce", name }) : [];
      const historicalCases = historical.map((r) => ({
        decisionId: r.decisionId,
        opportunityName: r.opportunityName,
        outcome: r.outcome,
        domain: r.domain,
        lesson: r.lesson,
      }));

      // 2) Research（可选）
      const research = deps.runResearch ? await deps.runResearch({ name, description }) : undefined;

      // 3) 用户长期知识（已确认）
      const userKnowledge = await knowledgeInsights(deps.knowledge, ["habit", "judgment_style", "industry_experience"]);

      // 4) 提取（确定性；缺失诚实标记）
      const fallback = "需研究验证（未注入 research 或证据不足）";
      const marketOpportunity = sectionOf(research, "market", fallback);
      const userNeed = sectionOf(research, "painPoint", fallback) || sectionOf(research, "targetUser", fallback);
      const competition = sectionOf(research, "competition", fallback);
      const riskText = sectionOf(research, "risk", fallback);
      const risks = riskText === fallback ? [fallback] : riskText.split(/[；;。]/).filter((s) => s.trim()).slice(0, 5);

      const suggestedActions = [
        ...(userKnowledge.length > 0 ? [`结合你的长期经验：${userKnowledge.join("；")}`] : []),
        `验证「${i.productIdea}」的需求强度（外部数据 + 小样本访谈）`,
        ...(historicalCases.length > 0 ? [`参考 ${historicalCases.length} 个历史相似决策的经验教训后决定测款`] : []),
        "若通过初筛，创建商机并启动 Research Pipeline",
      ];

      const structured: ProductSelectionResult = {
        productIdea: i.productIdea,
        category: i.category,
        priceRange: i.priceRange,
        targetUser: i.targetUser,
        marketOpportunity,
        userNeed,
        competition,
        risks,
        suggestedActions,
        historicalCases,
        userKnowledge,
      };

      const evidence: SkillOutput["evidence"] = [
        ...(research?.sources ?? []).map((s) => ({ label: `来源：${s.title}`, detail: s.url })),
        ...historicalCases.slice(0, 5).map((c) => ({ label: `历史案例：${c.opportunityName}（${c.outcome}）`, detail: c.lesson })),
      ];
      if (research?.score) evidence.push({ label: `研究评分 ${research.score.overall_score}/10（置信 ${research.score.confidence}）` });

      const summary = `${i.productIdea}${i.category ? "（" + i.category + "）" : ""} 选品初筛：${research ? `完成研究（评分 ${research.score?.overall_score ?? "?"}）` : "未执行研究"}，参考历史案例 ${historicalCases.length} 条，建议先验证需求再测款。`;

      return { summary, structured, actions: suggestedActions, evidence, createdAt: new Date().toISOString() };
    },
  };
}