import { cn } from "@/lib/utils/cn";
import { formatScore } from "@/lib/utils/format";

/** 综合评分徽章：≥8 绿 / ≥6 琥珀 / 其余灰 */
export function ScoreBadge({ value, className }: { value: number | undefined; className?: string }) {
  const tone =
    value === undefined
      ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
      : value >= 8
        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
        : value >= 6
          ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold",
        tone,
        className,
      )}
    >
      {value === undefined ? "待评分" : `${formatScore(value)} / 10`}
    </span>
  );
}