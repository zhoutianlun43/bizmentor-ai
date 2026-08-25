/**
 * /api/judgment —— 生成 AI 商业判断（V0.9 决策型报告核心）。
 * 服务端直接调用 AI Gateway（Key 只存在环境变量）；结果写入 research_runs.report.judgment（jsonb，无 schema 迁移）。
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runAI } from "@/lib/ai/gateway";
import { DecisionService } from "@/lib/decision";
import { SupabaseDecisionRepository } from "@/lib/decision/supabase-repository";
import { SupabaseResearchRepository } from "@/lib/research/supabase-repository";
import { env } from "@/lib/config/env";
import { getCurrentUserId } from "@/lib/identity";
import type { RunAiFn } from "@/lib/research/ai-call";

const runAi: RunAiFn = (task) => runAI(task);

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const { opportunityId } = (body ?? {}) as { opportunityId?: string };
  if (!opportunityId || typeof opportunityId !== "string") {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  try {
    // 服务端路由：用 anon key 直接创建 Supabase client（与浏览器同款，RLS 允许 local-user 读写）
    if (!env.supabaseUrl || !env.supabaseAnonKey) {
      return NextResponse.json({ error: "JUDGMENT_FAILED", message: "Supabase 未配置" }, { status: 500 });
    }
    const userId = getCurrentUserId();
    const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey);
    const service = new DecisionService({
      decisionRepository: new SupabaseDecisionRepository(supabase, { userId }),
      researchRepository: new SupabaseResearchRepository(supabase, { userId }),
      runAi,
    });
    const judgment = await service.generateJudgment(opportunityId);
    let evidenceScore = null;
    try {
      evidenceScore = await service.generateEvidenceScore(opportunityId);
    } catch {
      // Evidence Score 失败不影响 AI 商业判断
    }
    return NextResponse.json({ judgment, evidenceScore });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : "商业判断生成失败";
    return NextResponse.json({ error: "JUDGMENT_FAILED", message }, { status: 500 });
  }
}


