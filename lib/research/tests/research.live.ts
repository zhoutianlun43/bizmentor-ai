/**
 * 真实端到端研究（V0.3-A live smoke）。
 * 用法：pnpm test:research-live
 * - 使用真实 runAI（V0.2 Gateway）执行完整研究流程
 * - OpenAI 无余额时 research/reasoning 阶段自动降级 DeepSeek 并显式标记 degraded
 * - 安全：不打印 API Key；失败只输出安全摘要
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function loadEnvLocal(): void {
  const file = join(process.cwd(), ".env.local");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvLocal();

async function main(): Promise<void> {
  const { runAI } = await import("../../ai/gateway");
  const { runResearchPipeline, TOTAL_STAGES } = await import("../pipeline");
  const { getExternalProvider } = await import("../external/providers");
  const provider = getExternalProvider();

  const input = {
    opportunity: {
      id: "live-e2e",
      name: "AI × 电商运营自动化",
      description: "面向中小电商卖家的 AI 运营助手：自动生成商品素材、客服话术与投放建议。",
      notes: "",
    },
    materials: [],
  };

  console.log("开始真实研究（OpenAI 若无余额将自动降级 DeepSeek 并标记 degraded）...");
  const startedAt = Date.now();

  const run = await runResearchPipeline(input, {
    runAi: (task) => runAI(task),
    externalResearch: async (req) => {
      const results = await provider.search(req.query, { limit: 5 });
      const documents = [];
      for (const r of results.slice(0, 2)) {
        try {
          documents.push(await provider.read(r.url));
        } catch {
          // 单个网页失败跳过
        }
      }
      return { searches: [{ taskId: "", area: req.area, query: req.query, results, documents }], documents };
    },
    onStage: (stage, index) => {
      console.log(
        `[${index + 1}/${TOTAL_STAGES}] ${stage.stage}: ${stage.status} | provider=${stage.provider} | degraded=${stage.provider_degraded} | tokens=${stage.inputTokens + stage.outputTokens} | cost=$${stage.estimatedCost.toFixed(6)}`,
      );
    },
  });

  console.log(`\n总耗时 ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
  console.log(`status: ${run.status}`);
  if (run.error) console.log(`error: ${run.error.message}`);

  if (run.report) {
    console.log(`overall_score: ${run.report.score.overall_score} | confidence: ${run.report.score.confidence}`);
    console.log(`sections: ${run.report.sections.length}`);
    console.log(`evidence: ${run.report.sections.reduce((n, s) => n + s.evidence.length, 0)} 条`);
    console.log(`assumptions: ${run.report.score.assumptions.length} | unknowns: ${run.report.score.unknowns.length}`);
    console.log(`executiveSummary: ${run.report.executiveSummary.slice(0, 160)}`);
    console.log(`nextActions: ${run.report.nextActions.join(" | ")}`);
    console.log(`meta.degraded: ${run.report.meta.degraded} | notice: ${run.report.meta.notice}`);
  } else {
    console.log("报告未生成（禁止伪造）。");
  }

  process.exitCode = run.status === "completed" || run.status === "degraded" ? 0 : 1;
}

void main();