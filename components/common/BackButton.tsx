/**
 * 统一返回按钮（V1.x）：智能返回目标由调用方传入（基于来源页面），支持面包屑返回。
 */
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface Props {
  href: string;
  label?: string;
}

export function BackButton({ href, label = "返回" }: Props) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 pt-3 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
    >
      <ArrowLeft className="size-4" />
      {label}
    </Link>
  );
}
