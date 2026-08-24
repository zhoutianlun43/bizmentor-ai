/**
 * /api/review —— 晚间复盘 → 知识候选（V0.6.0 MVP Learning Center）。
 * 返回 DailyReview + 由复盘生成的 Knowledge 候选（客户端存入本地未确认，用户确认后进入长期认知）。
 */
import { NextResponse } from "next/server";
import { generateEveningReview } from "@/lib/agent/loops/review";
import { KnowledgeEngine } from "@/lib/knowledge";
import { LocalKnowledgeRepository } from "@/lib/knowledge/repository";
import { LocalMemoryRepository } from "@/lib/memory/repository";
import { MemoryEngine } from "@/lib/memory";
import { getCurrentUserId } from "@/lib/identity";
import { getDecisionRepository, getOpportunityRepository } from "@/lib/repository/provider";

export async function POST() {
  try {
    const userId = getCurrentUserId();
    const memory = new MemoryEngine({ memoryRepository: new LocalMemoryRepository(), decisionRepository: getDecisionRepository(), userId });
    const knowledge = new KnowledgeEngine(new LocalKnowledgeRepository(), userId);
    const review = await generateEveningReview({
      opportunityRepository: getOpportunityRepository(),
      decisionRepository: getDecisionRepository(),
      memory,
      userId,
    });
    // 由复盘生成候选（未确认）；客户端负责存入本地并展示给用户确认
    const candidates = await knowledge.captureFromReview(review);
    return NextResponse.json({
      review: { date: review.date, completedActions: review.completedActions, lessons: review.lessons, tomorrowActions: review.tomorrowActions },
      knowledgeCandidates: candidates.map((c) => ({ id: c.id, type: c.type, content: c.content, source: c.source, confirmed: c.confirmed })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : "复盘失败";
    return NextResponse.json({ error: "REVIEW_FAILED", message }, { status: 500 });
  }
}