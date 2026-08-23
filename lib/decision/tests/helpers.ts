/**
 * 决策闭环测试工具：fake runAi（Examiner）+ 内存仓库工厂。
 */
import type { AiResult, AiTask } from "../../ai/types";
import type { RunAiFn } from "../../research/ai-call";
import { DecisionService } from "../service";
import { createMemoryDecisionStorage, LocalDecisionRepository } from "../repository";
import { createMemoryResearchStorage, LocalResearchRepository } from "../../research/repository";

export const REVIEW_JSON = () =>
  JSON.stringify({
    score: 7.5,
    strengths: ["用户对痛点的判断具体", "风险意识较强"],
    weaknesses: [
      { category: "over_optimism", description: "对获客难度估计偏乐观", severity: 0.5 },
      { category: "insufficient_evidence", description: "付费意愿缺少数据支撑", severity: 0.6 },
    ],
    reasoning_gaps: ["未说明市场规模假设来源"],
    missing_evidence: ["竞品定价数据"],
    recommended_actions: ["先做 10 人访谈验证付费意愿"],
    ability_signals: [
      { skill: "strategic_judgment", signal: "positive", severity: 0.4, evidence: "判断结构清晰" },
      { skill: "risk_analysis", signal: "negative", severity: 0.5, evidence: "对获客风险估计不足" },
    ],
  });

/** fake runAi：默认返回合法评审 JSON；可覆写 */
export function createReviewRunAi(opts: { contentFor?: (task: AiTask, index: number) => string | undefined } = {}): RunAiFn & { calls: AiTask[] } {
  const calls: AiTask[] = [];
  let index = 0;
  const fn = async (task: AiTask): Promise<AiResult> => {
    calls.push(task);
    const i = index++;
    const content = opts.contentFor ? opts.contentFor(task, i) : REVIEW_JSON();
    if (content === undefined) throw new Error("FAKE_AI_ERROR");
    return {
      content,
      provider: "deepseek",
      model: "deepseek-chat",
      provider_degraded: false,
      usage: {
        provider: "deepseek",
        model: "deepseek-chat",
        task: "test",
        agent: "test",
        inputTokens: 10,
        outputTokens: 5,
        estimatedCost: 0.001,
        durationMs: 5,
        success: true,
        createdAt: new Date().toISOString(),
      },
    };
  };
  return Object.assign(fn, { calls });
}

export interface TestHarness {
  service: DecisionService;
  researchRepo: LocalResearchRepository;
}

/** 创建带内存仓库的 DecisionService（可注入 researchRepo） */
export function createDecisionService(opts: { runAi?: RunAiFn; researchRepo?: LocalResearchRepository } = {}): TestHarness {
  const researchRepo = opts.researchRepo ?? new LocalResearchRepository(createMemoryResearchStorage());
  const service = new DecisionService({
    decisionRepository: new LocalDecisionRepository(createMemoryDecisionStorage()),
    researchRepository: researchRepo,
    runAi: opts.runAi ?? createReviewRunAi(),
    userId: "test-user",
  });
  return { service, researchRepo };
}

/** 构造一份带 Score v1 的研究运行 */
export async function makeResearchRun(researchRepo: LocalResearchRepository, opportunityId: string) {
  const { runResearchPipeline } = await import("../../research/pipeline");
  const { createFakeRunAi, happyContentFor, sampleInput, createFakeExternalResearch } = await import("../../research/tests/helpers");
  const run = await runResearchPipeline(
    { ...sampleInput, opportunity: { ...sampleInput.opportunity, id: opportunityId } },
    {
      runAi: createFakeRunAi({ contentFor: (t) => happyContentFor(t) }),
      externalResearch: createFakeExternalResearch(),
    },
  );
  await researchRepo.saveRun(run);
  return run;
}