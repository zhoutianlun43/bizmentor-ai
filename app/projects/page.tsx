import { AppHeader } from "@/components/layout/AppHeader";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { mockProjects } from "@/lib/data/mock/projects";
import { formatDate } from "@/lib/utils/format";

/**
 * 项目列表。
 * 项目 = 用户已决定验证的商机，与「商机」严格区分。
 * V0.1 使用 mock 数据，未来从数据库读取。
 */
export default function ProjectsPage() {
  return (
    <div className="px-5 pb-4">
      <AppHeader title="项目" subtitle="已决定进入验证的机会" />

      <div className="mt-2 space-y-3">
        {mockProjects.map((project) => (
          <Card key={project.id}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {project.name}
              </h3>
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {project.stage}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <ProgressBar value={project.progress} className="flex-1" />
              <span className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                {project.progress}%
              </span>
            </div>

            <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
              <span className="font-medium text-slate-500 dark:text-slate-400">下一步：</span>
              {project.nextAction}
            </div>

            <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
              更新于 {formatDate(project.updatedAt)}
            </p>
          </Card>
        ))}
      </div>

      <p className="mt-4 rounded-xl bg-indigo-50 px-3 py-2.5 text-xs leading-relaxed text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
        💡 项目与商机不同：商机是「可能值得研究」，项目是「你已决定验证」。V0.1 先展示项目列表，项目推进与阶段流转在后续版本加入。
      </p>
    </div>
  );
}