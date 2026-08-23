import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { ResearchStageName, StageRun } from "@/lib/research";

const STAGE_LABELS: Record<ResearchStageName, string> = {
  analyzer: "商机分析",
  planner: "研究规划",
  "external-research": "外部研究",
  "evidence-extraction": "证据提取",
  "evidence-validation": "证据验证",
  synthesis: "研究综合",
  scoring: "机会评分",
  "validation-plan": "验证方案",
  summary: "最终报告",
};

/** 研究阶段进度列表（UI 运行中展示） */
export function ResearchProgress({ stages }: { stages: StageRun[] }) {
  const names: ResearchStageName[] = ["analyzer", "planner", "external-research", "evidence-extraction", "evidence-validation", "synthesis", "scoring", "validation-plan", "summary"];
  return (
    <ol className="space-y-1.5">
      {names.map((name, index) => {
        const stage = stages[index];
        const done = stage?.status === "completed";
        const failed = stage?.status === "failed";
        const waiting = !stage;
        return (
          <li key={name} className="flex items-center gap-2 text-sm">
            {done ? (
              <CheckCircle2 className="size-4 text-emerald-500" />
            ) : failed ? (
              <XCircle className="size-4 text-rose-500" />
            ) : waiting ? (
              <Circle className="size-4 text-slate-300 dark:text-slate-600" />
            ) : (
              <Loader2 className="size-4 animate-spin text-indigo-500" />
            )}
            <span className={cn(failed && "text-rose-600 dark:text-rose-400", done && "text-slate-700 dark:text-slate-200", waiting && "text-slate-400 dark:text-slate-500")}>
              {STAGE_LABELS[name]}
            </span>
            {stage ? (
              <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500">
                {done ? "完成" : failed ? "失败" : "进行中"}
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}