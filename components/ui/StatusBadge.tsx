import { OPPORTUNITY_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";
import type { OpportunityStatus } from "@/lib/types";

/** 状态 → 徽章配色 */
const STATUS_STYLES: Record<OpportunityStatus, string> = {
  discovered:
    "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:ring-indigo-800",
  reviewing:
    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-800",
  researching:
    "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-800",
  validating:
    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-800",
  validated:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-800",
  abandoned:
    "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-800",
};

/** 商机状态徽章 */
export function StatusBadge({ status }: { status: OpportunityStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        STATUS_STYLES[status],
      )}
    >
      {OPPORTUNITY_STATUS_LABELS[status]}
    </span>
  );
}