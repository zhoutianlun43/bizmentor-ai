import { cn } from "@/lib/utils/cn";

interface ScoreBarProps {
  label: string;
  value: number;
  /** 满分（默认 10，能力评分传 100） */
  max?: number;
  /** 是否将高值视为负面（如竞争/风险） */
  invert?: boolean;
}

/** 带标签的评分条：用于商机评分维度与能力评分 */
export function ScoreBar({ label, value, max = 10, invert = false }: ScoreBarProps) {
  const ratio = Math.min(100, Math.max(0, (value / max) * 100));
  // 负面维度：值越高颜色越偏红；正面维度：值越高越绿
  const barColor = invert
    ? value >= 7
      ? "bg-rose-500"
      : value >= 4
        ? "bg-amber-500"
        : "bg-emerald-500"
    : value >= 7
      ? "bg-emerald-500"
      : value >= 4
        ? "bg-amber-500"
        : "bg-rose-500";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-600 dark:text-slate-400">{label}</span>
        <span className="font-medium text-slate-900 tabular-nums dark:text-slate-200">{value.toFixed(1)}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${ratio}%` }} />
      </div>
    </div>
  );
}