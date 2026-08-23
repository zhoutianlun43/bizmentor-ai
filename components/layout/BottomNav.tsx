"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, GraduationCap, Home, Lightbulb, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** 底部导航：首页 / 商机 / 项目 / 训练 / 我的 */
const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "首页", icon: Home },
  { href: "/opportunities", label: "商机", icon: Lightbulb },
  { href: "/projects", label: "项目", icon: Briefcase },
  { href: "/training", label: "训练", icon: GraduationCap },
  { href: "/profile", label: "我的", icon: User },
];

/** 判断当前路径是否命中某导航项（子页面归入父级） */
function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40">
      <div className="mx-auto max-w-md border-t border-slate-200 bg-white/90 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <ul className="flex items-stretch justify-around">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href, pathname);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                    active
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
                  )}
                >
                  <Icon className={cn("size-5", active && "stroke-[2.4]")} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}