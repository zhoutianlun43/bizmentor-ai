/**
 * AI 商业雷达扫描任务执行器（V1.4）：LLM 生成机会 + 自动保存（后台）。
 */
import { getLlm } from "../../llm";
import { buildRadarScanPrompt, parseRadarReport } from "../../radar";
import { saveRadarFindings } from "../../radar/service";
import { SupabaseOpportunityRepository } from "../../opportunity/supabase-repository";
import { createClient } from "@supabase/supabase-js";
import { env } from "../../config/env";
import { uid } from "../../store/storage";
import type { TaskExecutor } from "../engine";

export const radarScanExecutor: TaskExecutor = async (task, update, log) => {
  const scanId = uid();
  update({ progress: 10, currentStage: "ai_scan", currentStageLabel: "AI 扫描全球商业机会", stages: [{ stage: "ai_scan", status: "running" }] });
  log({ stage: "ai_scan", status: "started", note: "调用 LLM 生成跨行业机会" });

  const llm = getLlm();
  const { system, user } = buildRadarScanPrompt(5);
  const result = await llm.generate([{ role: "system", content: system }, { role: "user", content: user }]);
  const findings = parseRadarReport(result.content, new Date().toISOString());

  update({ progress: 60, currentStage: "persist", currentStageLabel: "自动保存到机会池" });
  let savedCount = 0;
  if (env.supabaseUrl && env.supabaseAnonKey) {
    const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey);
    const repo = new SupabaseOpportunityRepository(supabase, { userId: task.userId });
    const saved = await saveRadarFindings(findings, scanId, repo);
    savedCount = saved.length;
  }

  update({ progress: 100, result: { scanId, savedCount, findings: findings.length } });
};
