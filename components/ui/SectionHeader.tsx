import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  /** 可选「查看全部」链接 */
  href?: string;
  linkLabel?: string;
}

/** 区块标题：左侧标题 + 右侧可选链接 */
export function SectionHeader({ title, href, linkLabel = "查看全部" }: SectionHeaderProps) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      {href ? (
        <Link
          href={href}
          className="inline-flex items-center gap-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400"
        >
          {linkLabel}
          <ChevronRight className="size-3.5" />
        </Link>
      ) : null}
    </div>
  );
}