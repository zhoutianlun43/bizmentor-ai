import { CheckCircle2, Circle, Database, FileSearch, Loader2, Search, XCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { ResearchStageName, StageRun } from "@/lib/research";

const STAGE_LABELS: Record<ResearchStageName, string> = {
  analyzer: "商机分析",
  planner: "研究规划",
  "external-research": "外部研究",
  "evidence-extraction": "证据提取",
  "evidence-validation": "证据验证",
  "evidence-verify": "证据自动验证",
  synthesis: "研究综合",
  scoring: "机会评分",
  "validation-plan": "验证方案",
  summary: "最终报告",
};

/** AI 执行动作（V1.1 时间线） */
const STAGE_ACTIONS: Record<ResearchStageName, string> = {
  analyzer: "解析商机定义与问题",
  planner: "规划研究任务与数据来源",
  "external-research": "真实搜索并读取外部网页",
  "evidence-extraction": "从来源/AI 推理提取证据",
  "evidence-validation": "来源绑定、可信度与冲突检测",
  "evidence-verify": "证据不足领域自动扩展搜索补源",
  synthesis: "综合章节与竞品分析",
  scoring: "AI 提案评分 + 确定性聚合",
  "validation-plan": "生成验证方案",
  summary: "生成最终研究报告",
};

const STAGE_ORDER: ResearchStageName[] = [
  "analyzer",
  "planner",
  "external-research",
  "evidence-extraction",
  "evidence-validation",
  "evidence-verify",
  "synthesis",
  "scoring",
  "validation-plan",
  "summary",
];

/** 研究过程时间线（V1.1）：当前阶段 / AI 执行动作 / 数据来源数量 / 已发现证据数量 / 进度 */
export function ResearchProgress({ stages }: { stages: StageRun[] }) {
  const completed = stages.filter((s) => s.status === "completed").length;
  const failed = stages.filter((s) => s.status === "failed").length;
  const percent = Math.round((completed / STAGE_ORDER.length) * 100);

  const current = STAGE_ORDER.find((name, i) => !stages[i]) ?? STAGE_ORDER[STAGE_ORDER.length - 1];
  const currentStage = stages.find((s) => s.stage === current);

  // 最新来源/证据/搜索计数（阶段产出）
  const sources = stages.filter((s) => typeof s.sourcesFound === "number").pop()?.sourcesFound ?? 0;
  const evidence = stages.filter((s) => typeof s.evidenceFound === "number").pop()?.evidenceFound ?? 0;
  const searches = stages.filter((s) => typeof s.searchesCount === "number").pop()?.searchesCount ?? 0;

  return (
    <div className="space-y-3">
      {/* 顶部统计 */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">研究进度</span>
        <span className="text-[10px] text-slate-400">{completed}/{STAGE_ORDER.length} 阶段 · {percent}%</span>
        <div className="ml-auto flex items-center gap-2 text-[10px] text-slate-400">
          <span className="inline-flex items-center gap-1"><Search className="size-3" />搜索 {searches}</span>
          <span className="inline-flex items-center gap-1"><Database className="size-3" />来源 {sources}</span>
          <span className="inline-flex items-center gap-1"><FileSearch className="size-3" />证据 {evidence}</span>
        </div>
      </div>
      {/* 进度条 */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: percent + "%" }} />
      </div>
      {/* 当前阶段 */}
      <div className="flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2 dark:bg-indigo-950/40">
        <Loader2 className="size-4 animate-spin text-indigo-500" />
        <div>
          <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
            {currentStage ? STAGE_LABELS[currentStage.stage] ?? currentStage.stage : STAGE_LABELS[current] ?? current}
            {failed > 0 ? <span className="ml-1 text-rose-500">（{failed} 阶段失败）</span> : null}
          </p>
          <p className="text-[10px] text-indigo-500/80 dark:text-indigo-400/80">
            {STAGE_ACTIONS[current] ?? ""}
            {currentStage ? <span className="ml-1 text-slate-400">· API: {currentStage.provider === "external" ? "外部搜索" : currentStage.provider === "deepseek" ? "DeepSeek" : "OpenAI"}</span> : null}
          </p>
        </div>
      </div>
      {/* 阶段列表 */}
      <ol className="space-y-1.5">
        {STAGE_ORDER.map((name, index) => {
          const stage = stages[index];
          const done = stage?.status === "completed";
          const failedStage = stage?.status === "failed";
          const waiting = !stage;
          return (
            <li key={name} className="flex items-center gap-2 text-sm">
              {done ? (
                <CheckCircle2 className="size-4 text-emerald-500" />
              ) : failedStage ? (
                <XCircle className="size-4 text-rose-500" />
              ) : waiting ? (
                <Circle className="size-4 text-slate-300 dark:text-slate-600" />
              ) : (
                <Loader2 className="size-4 animate-spin text-indigo-500" />
              )}
              <span className={cn(failedStage && "text-rose-600 dark:text-rose-400", done && "text-slate-700 dark:text-slate-200", waiting && "text-slate-400 dark:text-slate-500")}>
                {STAGE_LABELS[name]}
              </span>
              {stage ? (
                <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500">
                  {stage.provider === "external" ? "外部搜索 · " : stage.provider === "deepseek" ? "DeepSeek · " : "OpenAI · "}
                  {done ? "完成" : failedStage ? "失败" : "进行中"}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
