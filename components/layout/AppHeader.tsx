import { ThemeToggle } from "@/components/providers/ThemeProvider";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
}

/** 页面顶部：标题 + 问候语 + 深浅色切换 */
export function AppHeader({ title, subtitle }: AppHeaderProps) {
  return (
    <header className="flex items-start justify-between px-5 pb-2 pt-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        ) : null}
      </div>
      <ThemeToggle />
    </header>
  );
}