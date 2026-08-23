/**
 * 轻量 className 合并工具（避免额外依赖 clsx）。
 * 过滤 falsy 值并用空格连接。
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}