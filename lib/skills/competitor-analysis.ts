/**
 * Skill: competitor_analysis（竞品拆解助手，V0.4.2 Phase 9B-3）。
 * 调用 Research Engine（研究）+ External Intelligence（外部证据）+ Memory（历史模式）。
 * 输出定位/定价/内容/流量/优势/弱点/可复制策略。
 */
import { sectionOf } from "./research-adapter";
import type { BizSkill, CompetitorAnalysisInput, CompetitorAnalysisResult, SkillDeps, SkillOutput } from "./types";

export function createCompetitorAnalysisSkill(deps: SkillDeps): BizSkill {
  return {
    id: "competitor_analysis",
    name: "竞品拆解助手",
    description: "拆解竞品：产品定位 / 定价策略 / 内容打法 / 流量策略 / 优势 / 弱点 / 可复制策略",
    domain: "ecommerce",
    requiredTools: ["research_tool", "memory_tool"],
    async run(_ctx, input): Promise<SkillOutput> {
      const i = (input ?? {}) as CompetitorAnalysisInput;
      if (!i.competitor) throw new Error("competitor_analysis 需要 competitor");
      const name = i.competitor;
      const description = `竞品拆解：${i.competitor}${i.category ? "，类目 " + i.category : ""}${i.platform ? "，平台 " + i.platform : ""}`;

      // 1) Memory：历史模式（经验注入）
      const memoryPatterns = deps.memory ? await deps.memory.retrieve({ domain: "ecommerce" }) : [];

      // 2) Research（可选）
      const research = deps.runResearch ? await deps.runResearch({ name, description }) : undefined;

      // 3) 提取
      const fallback = "需研究验证（未注入 research 或证据不足）";
      const positioning = sectionOf(research, "competition", fallback);
      const pricing = sectionOf(research, "willingnessToPay", fallback);
      const businessModel = sectionOf(research, "businessModel", fallback);
      const moat = sectionOf(research, "moat", fallback);
      const riskText = sectionOf(research, "risk", fallback);
      const strengths = [moat, businessModel].filter((s) => s !== fallback);
      const weaknesses = riskText === fallback ? [fallback] : riskText.split(/[；;。]/).filter((s) => s.trim()).slice(0, 5);

      const contentStrategy = `结合 ${i.platform ?? "目标平台"} 的内容生态与 ${positioning === fallback ? "竞品定位" : "竞品定位"} 制定短视频/图文素材方向（需研究验证）`;
      const trafficStrategy = `分析 ${i.platform ?? "目标平台"} 的流量结构与竞品投放（需研究验证）`;
      const replicableStrategies = [
        ...(strengths.length > 0 ? [`可复制优势策略：${strengths.slice(0, 2).join("；")}`] : []),
        ...(memoryPatterns.length > 0 ? [`参考历史模式：${memoryPatterns[0].commonLessons[0] ?? "验证率高"}`] : []),
      ];

      const structured: CompetitorAnalysisResult = {
        competitor: i.competitor,
        category: i.category,
        platform: i.platform,
        positioning,
        pricing,
        contentStrategy,
        trafficStrategy,
        strengths,
        weaknesses,
        replicableStrategies,
        memoryPatterns: memoryPatterns.slice(0, 5),
      };

      const evidence: SkillOutput["evidence"] = [
        ...(research?.sources ?? []).map((s) => ({ label: `来源：${s.title}`, detail: s.url })),
        ...memoryPatterns.slice(0, 5).map((p) => ({ label: `历史模式：${p.domain ?? "全部"} ${p.decision ?? ""}（${p.count} 条）`, detail: p.commonLessons[0] })),
      ];

      const summary = `${i.competitor} 竞品拆解：${research ? `完成研究（评分 ${research.score?.overall_score ?? "?"}）` : "未执行研究"}，结合历史模式 ${memoryPatterns.length} 条，输出定位/定价/内容/流量要点。`;

      return { summary, structured, actions: replicableStrategies, evidence, createdAt: new Date().toISOString() };
    },
  };
}