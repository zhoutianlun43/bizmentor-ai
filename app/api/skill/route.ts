/**
 * /api/skill —— 技能调用入口（V0.6.0 MVP）。
 * 浏览器 → { skill, input, context } → SkillRegistry.invokeSkill → SkillOutput。
 * 本阶段：memory + 确定性分析（深度 research 下一批接入）。
 */
import { NextResponse } from "next/server";
import { SkillRegistry, createProductSelectionSkill, createCompetitorAnalysisSkill } from "@/lib/skills";
import { getCurrentUserId } from "@/lib/identity";
import { getDecisionRepository, getOpportunityRepository } from "@/lib/repository/provider";
import { MemoryEngine } from "@/lib/memory";
import { LocalMemoryRepository } from "@/lib/memory/repository";
import { KnowledgeEngine } from "@/lib/knowledge";
import { LocalKnowledgeRepository } from "@/lib/knowledge/repository";
import type { AgentContext } from "@/lib/agent/types";
import type { BusinessOSContext } from "@/lib/context/types";

const SKILLS = ["product_selection", "competitor_analysis"] as const;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const { skill, input, context } = (body ?? {}) as { skill?: string; input?: unknown; context?: BusinessOSContext };
  if (!skill || !(SKILLS as readonly string[]).includes(skill)) {
    return NextResponse.json({ error: "INVALID_SKILL", skills: SKILLS }, { status: 400 });
  }

  try {
    const userId = getCurrentUserId();
    const memory = new MemoryEngine({
      memoryRepository: new LocalMemoryRepository(),
      decisionRepository: getDecisionRepository(),
      userId,
    });
    const knowledge = new KnowledgeEngine(new LocalKnowledgeRepository(), userId);
    const registry = new SkillRegistry();
    registry.registerSkills([
      createProductSelectionSkill({ memory, knowledge }),
      createCompetitorAnalysisSkill({ memory, knowledge }),
    ]);
    const agentCtx: AgentContext = {
      userId,
      identity: { userId, source: "fixed" },
      memoryPatterns: await memory.retrieve({}),
      recentEvents: [],
      knowledgeRecords: await knowledge.confirmed(),
      businessContext: context ?? {
        userId, personalProfile: null, businessProfile: null, confirmedKnowledge: [], memoryPatterns: [], activeProjects: await getOpportunityRepository().listOpportunities(), preferences: {}, updatedAt: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
    };
    const output = await registry.invokeSkill(skill, agentCtx, input ?? {});
    return NextResponse.json({ skill, output });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : "技能调用失败";
    return NextResponse.json({ error: "SKILL_FAILED", message }, { status: 500 });
  }
}