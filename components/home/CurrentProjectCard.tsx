import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { Project } from "@/lib/types";

/** 首页·区域三：当前项目 */
export function CurrentProjectCard({ project }: { project: Project }) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">当前项目</p>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {project.stage}
        </span>
      </div>

      <h3 className="text-base font-semibold text-slate-900 dark:text-white">{project.name}</h3>

      <div className="mt-3 flex items-center gap-3">
        <ProgressBar value={project.progress} className="flex-1" />
        <span className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300">
          {project.progress}%
        </span>
      </div>

      <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
        <span className="font-medium text-slate-500 dark:text-slate-400">下一动作：</span>
        {project.nextAction}
      </div>

      <Link
        href="/projects"
        className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400"
      >
        查看项目
        <ArrowRight className="size-4" />
      </Link>
    </Card>
  );
}