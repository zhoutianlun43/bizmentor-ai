/**
 * Research 任务执行器（V1.4）：服务端运行完整研究管线，逐阶段更新进度。
 */
import { runResearchPipeline, TOTAL_STAGES } from "../../research/pipeline";
import { runAI } from "../../ai/gateway";
import { createExternalResearchFn } from "../../external";
import { SupabaseResearchRepository } from "../../research/supabase-repository";
import { createClient } from "@supabase/supabase-js";
import { env } from "../../config/env";
import type { TaskStage } from "../types";
import type { TaskExecutor } from "../engine";
import type { ResearchInput } from "../../research/types";

export const researchExecutor: TaskExecutor = async (task, update, log) => {
  const payload = (task.payload ?? {}) as Partial<ResearchInput> & { opportunity?: Record<string, unknown> };
  const opportunity = payload.opportunity as ResearchInput["opportunity"];
  if (!opportunity?.id || !opportunity?.name) throw new Error("缺少商机数据");

  update({
    progress: 2,
    currentStage: "started",
    currentStageLabel: "开始 AI 研究",
    stages: [{ stage: "started", label: "开始 AI 研究", status: "running" }],
  });

  const run = await runResearchPipeline(
    {
      opportunity: {
        id: opportunity.id as string,
        name: opportunity.name as string,
        description: (opportunity.description as string) ?? "",
        notes: (opportunity.notes as string | undefined) ?? undefined,
      },
      materials: payload.materials ?? [],
    },
    {
      runAi: (t) => runAI(t),
      externalResearch: createExternalResearchFn(),
      onStage: (stageRun, index) => {
        const pct = Math.round(((index + 1) / TOTAL_STAGES) * 100);
        const stage: TaskStage = {
          stage: stageRun.stage,
          status: stageRun.status === "completed" ? "completed" : "failed",
          provider: stageRun.provider,
          sourcesFound: stageRun.sourcesFound,
          evidenceFound: stageRun.evidenceFound,
          searched: stageRun.searchesCount,
        };
        const stages = [...(task.stages ?? [])];
        // 覆盖同名阶段（重试/幂等）
        const existing = stages.findIndex((s) => s.stage === stageRun.stage);
        if (existing >= 0) stages[existing] = stage;
        else stages.push(stage);
        update({ progress: pct, currentStage: stageRun.stage, stages });
        log({
          stage: stageRun.stage,
          provider: stageRun.provider,
          inputTokens: stageRun.inputTokens,
          outputTokens: stageRun.outputTokens,
          estimatedCost: stageRun.estimatedCost,
          status: stageRun.status === "completed" ? "completed" : "failed",
          note: stageRun.error,
        });
      },
    },
  );

  if (env.supabaseUrl && env.supabaseAnonKey) {
    const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey);
    const repo = new SupabaseResearchRepository(supabase, { userId: task.userId });
    await repo.saveRun(run);
  }
  update({ result: { runId: run.runId, status: run.status, report: Boolean(run.report) } });
};
