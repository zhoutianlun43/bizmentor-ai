import { cn } from "@/lib/utils/cn";

interface ProgressBarProps {
  /** 0-100 */
  value: number;
  className?: string;
}

/** 通用进度条（用于项目进度 / 经验值） */
export function ProgressBar({ value, className }: ProgressBarProps) {
  const ratio = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800", className)}>
      <div
        className="h-full rounded-full bg-indigo-500 transition-all"
        style={{ width: `${ratio}%` }}
      />
    </div>
  );
}