/**
 * /api/operation —— 生成商业操盘手报告（V1.2 真实商业落地决策系统）。
 * 服务端：AI Gateway + 真实外部研究（Tavily 等）→ 市场验证/产品矩阵/竞品/供应链/定价/获客/内容30/广告/90天/投资判断。
 * 结果写入 research_runs.report.operationPlan（jsonb，无 schema 迁移）；sourceRequired 全程保留。
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
    if (!env.supabaseUrl || !env.supabaseAnonKey) {
      return NextResponse.json({ error: "OPERATION_FAILED", message: "Supabase 未配置" }, { status: 500 });
    }
    const userId = getCurrentUserId();
    const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey);
    const service = new DecisionService({
      decisionRepository: new SupabaseDecisionRepository(supabase, { userId }),
      researchRepository: new SupabaseResearchRepository(supabase, { userId }),
      runAi,
    });
    const operationPlan = await service.generateOperationPlan(opportunityId);
    return NextResponse.json({ operationPlan });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : "商业操盘手报告生成失败";
    return NextResponse.json({ error: "OPERATION_FAILED", message }, { status: 500 });
  }
}

