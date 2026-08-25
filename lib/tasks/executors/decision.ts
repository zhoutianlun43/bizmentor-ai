/**
 * 决策任务执行器（V1.4）：AI 商业判断 → Evidence Score → 商业操盘手报告（后台串行）。
 */
import { runAI } from "../../ai/gateway";
import { DecisionService } from "../../decision/service";
import { SupabaseDecisionRepository } from "../../decision/supabase-repository";
import { SupabaseResearchRepository } from "../../research/supabase-repository";
import { createClient } from "@supabase/supabase-js";
import { env } from "../../config/env";
import type { TaskExecutor } from "../engine";

export const decisionExecutor: TaskExecutor = async (task, update, log) => {
  const payload = (task.payload ?? {}) as { opportunityId?: string };
  const opportunityId = payload.opportunityId;
  if (!opportunityId) throw new Error("缺少 opportunityId");
  if (!env.supabaseUrl || !env.supabaseAnonKey) throw new Error("Supabase 未配置");

  const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey);
  const service = new DecisionService({
    decisionRepository: new SupabaseDecisionRepository(supabase, { userId: task.userId }),
    researchRepository: new SupabaseResearchRepository(supabase, { userId: task.userId }),
    runAi: (t) => runAI(t),
  });

  update({ progress: 10, currentStage: "judgment", currentStageLabel: "生成 AI 商业判断", stages: [{ stage: "judgment", status: "running" }] });
  log({ stage: "judgment", status: "started" });
  const judgment = await service.generateJudgment(opportunityId);
  update({ progress: 40, currentStage: "evidence_score", currentStageLabel: "生成 Evidence Score" });

  let evidenceScoreId: string | undefined;
  try {
    const es = await service.generateEvidenceScore(opportunityId);
    evidenceScoreId = es.id;
    update({ progress: 55, currentStage: "operation_plan", currentStageLabel: "生成商业操盘手报告" });
  } catch {
    update({ progress: 55, currentStage: "operation_plan", currentStageLabel: "生成商业操盘手报告（证据评分跳过）" });
  }

  const op = await service.generateOperationPlan(opportunityId);
  update({
    progress: 100,
    result: { judgmentId: judgment.id, evidenceScoreId, operationPlanVersion: op.version },
  });
};
