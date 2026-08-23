/**
 * 测试工具：fake RunAiFn + 各阶段合法 JSON fixtures。
 * 所有测试不依赖真实网络 / API Key。
 */
import type { AiResult, AiTask } from "../../ai/types";
import type { RunAiFn } from "../ai-call";
import type { ResearchInput } from "../types";

export function makeAiResult(
  content: string,
  opts: { provider?: "openai" | "deepseek"; model?: string; degraded?: boolean; inputTokens?: number; outputTokens?: number } = {},
): AiResult {
  const provider = opts.provider ?? "deepseek";
  const model = opts.model ?? (provider === "openai" ? "gpt-5.6-terra" : "deepseek-chat");
  const inputTokens = opts.inputTokens ?? 10;
  const outputTokens = opts.outputTokens ?? 5;
  return {
    content,
    provider,
    model,
    provider_degraded: opts.degraded ?? false,
    usage: {
      provider,
      model,
      task: "test",
      agent: "test",
      inputTokens,
      outputTokens,
      estimatedCost: 0.001,
      durationMs: 5,
      success: true,
      createdAt: new Date().toISOString(),
    },
  };
}

export interface FakeRunAi extends RunAiFn {
  calls: AiTask[];
}

export interface FakeRunAiConfig {
  /** 按 task.type 返回 content；返回 undefined 表示该次调用抛错（模拟 Provider 失败） */
  contentFor: (task: AiTask, callIndex: number) => string | undefined;
  providerFor?: (task: AiTask, callIndex: number) => "openai" | "deepseek";
  degradedFor?: (task: AiTask, callIndex: number) => boolean;
}

export function createFakeRunAi(config: FakeRunAiConfig): FakeRunAi {
  const calls: AiTask[] = [];
  let callIndex = 0;
  const fn = async (task: AiTask): Promise<AiResult> => {
    calls.push(task);
    const idx = callIndex++;
    const content = config.contentFor(task, idx);
    if (content === undefined) throw new Error("FAKE_AI_PROVIDER_ERROR");
    return makeAiResult(content, {
      provider: config.providerFor?.(task, idx),
      degraded: config.degradedFor?.(task, idx),
    });
  };
  return Object.assign(fn, { calls });
}

/** 覆盖 9 个研究领域的任务/章节 */
export const RESEARCH_AREAS = [
  "targetUser",
  "painPoint",
  "demandStrength",
  "market",
  "competition",
  "willingnessToPay",
  "businessModel",
  "moat",
  "risk",
] as const;

export const sampleInput: ResearchInput = {
  opportunity: {
    id: "opp-e2e",
    name: "本地宠物洗护到家服务",
    description: "面向社区养宠家庭的上门洗护预约与会员服务。",
    notes: "",
  },
  materials: [],
};

export const analyzerJson = () =>
  JSON.stringify({
    definition: "面向社区养宠家庭的本地宠物洗护到家服务",
    problem: "养宠家庭上门洗护预约难、价格不透明、服务标准缺失",
    targetUserHint: "一二线城市有宠物的双职工家庭",
    initialAssumptions: [
      { claim: "用户愿意为上门洗护支付溢价", evidenceClass: "ASSUMPTION", confidence: 0.4, sourceRef: null },
      { claim: "社区宠物密度足以支撑上门服务", evidenceClass: "NEEDS_VALIDATION", confidence: 0.3, sourceRef: null },
    ],
    unknowns: ["上门客单价区间", "月复购率"],
  });

export const plannerJson = () =>
  JSON.stringify({
    tasks: RESEARCH_AREAS.map((area, i) => ({
      id: `t${i + 1}`,
      area,
      question: `研究：${area}`,
      dataSource: "AI_RESEARCH" as const,
      required: true,
    })),
  });

export const findingJson = (area: string) =>
  JSON.stringify({
    taskId: "t1",
    area,
    summary: `关于 ${area} 的研究结论`,
    evidence: [
      { claim: `${area} 的推断结论`, evidenceClass: "AI_INFERENCE", confidence: 0.5, sourceRef: null },
    ],
    confidence: 0.5,
    unknowns: [],
  });

export const synthesisJson = () =>
  JSON.stringify({
    sections: RESEARCH_AREAS.map((area) => ({
      area,
      title: area,
      content: `综合结论：${area}`,
      confidence: 0.5,
      evidence: [
        { claim: `${area} 综合结论`, evidenceClass: "AI_INFERENCE", confidence: 0.5, sourceRef: null },
      ],
    })),
  });

export const SCORE_DIMS = [
  { dimension: "demand", score: 8, confidence: 0.6 },
  { dimension: "market", score: 7, confidence: 0.5 },
  { dimension: "competition", score: 4, confidence: 0.5 },
  { dimension: "willingnessToPay", score: 8, confidence: 0.6 },
  { dimension: "moat", score: 6, confidence: 0.5 },
  { dimension: "customerAcquisition", score: 3, confidence: 0.5 },
  { dimension: "risk", score: 2, confidence: 0.5 },
] as const;

export const scoringJson = () =>
  JSON.stringify({
    dimensions: SCORE_DIMS.map((d) => ({
      ...d,
      rationale: `理由：${d.dimension}`,
      evidence: [
        { claim: `${d.dimension} 评分依据`, evidenceClass: "AI_INFERENCE", confidence: 0.5, sourceRef: null },
      ],
    })),
  });

export const validationPlanJson = () =>
  JSON.stringify({
    items: [
      { assumption: "用户愿意为上门洗护付费", method: "访谈 10 位目标用户", successCriteria: "≥7 人愿意付费", effort: "medium" },
      { assumption: "社区密度支撑上门服务", method: "选取 3 个小区做预约测试", successCriteria: "周预约 ≥ 20 单", effort: "low" },
    ],
  });

export const summaryJson = () =>
  JSON.stringify({
    executiveSummary: "这是一个值得进入验证阶段的本地服务商机",
    mvpRecommendation: "先做单小区上门洗护小程序，跑通预约与复购",
    nextActions: ["访谈 10 位目标用户", "验证上门客单价", "测试 3 个小区需求"],
  });

/** 各阶段合法 JSON 内容（可复用） */
export function happyContentFor(task: AiTask): string | undefined {
  switch (task.type) {
    case "opportunity_analyzer":
      return analyzerJson();
    case "research_planner":
      return plannerJson();
    case "research_task":
      return findingJson("targetUser");
    case "research_synthesis":
      return synthesisJson();
    case "opportunity_scoring":
      return scoringJson();
    case "validation_plan":
      return validationPlanJson();
    case "final_summary":
      return summaryJson();
    default:
      return undefined;
  }
}

/** 标准 fake：所有阶段返回合法 JSON，无降级 */
export function createHappyRunAi(): FakeRunAi {
  return createFakeRunAi({ contentFor: happyContentFor });
}