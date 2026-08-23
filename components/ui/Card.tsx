import { cn } from "@/lib/utils/cn";
import type { HTMLAttributes } from "react";

/** 通用卡片容器：圆角 + 边框 + 阴影，适配暗色/浅色 */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm",
        "dark:border-slate-800 dark:bg-slate-900",
        className,
      )}
      {...props}
    />
  );
}