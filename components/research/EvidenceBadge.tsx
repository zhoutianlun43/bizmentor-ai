import { cn } from "@/lib/utils/cn";
import type { EvidenceClass } from "@/lib/research";

const STYLES: Record<EvidenceClass, string> = {
  FACT: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-800",
  AI_INFERENCE: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-800",
  ASSUMPTION: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-800",
  NEEDS_VALIDATION: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-800",
};

const LABELS: Record<EvidenceClass, string> = {
  FACT: "事实",
  AI_INFERENCE: "AI推断",
  ASSUMPTION: "假设",
  NEEDS_VALIDATION: "需验证",
};

/** 证据分类徽章 */
export function EvidenceBadge({ evidenceClass }: { evidenceClass: EvidenceClass }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset",
        STYLES[evidenceClass],
      )}
    >
      {LABELS[evidenceClass]}
    </span>
  );
}