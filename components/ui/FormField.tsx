import { cn } from "@/lib/utils/cn";
import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

const CONTROL_CLASSES =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500";

function Label({ htmlFor, label, required }: { htmlFor: string; label: string; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
      {label}
      {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
    </label>
  );
}

/** 文本输入框 */
export function TextField({
  label,
  required,
  id,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div>
      <Label htmlFor={id ?? label} label={label} required={required} />
      <input id={id ?? label} className={cn(CONTROL_CLASSES, className)} required={required} {...props} />
    </div>
  );
}

/** 多行文本框 */
export function TextArea({
  label,
  required,
  id,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <div>
      <Label htmlFor={id ?? label} label={label} required={required} />
      <textarea id={id ?? label} className={cn(CONTROL_CLASSES, "min-h-24 resize-y", className)} required={required} {...props} />
    </div>
  );
}

/** 下拉选择框 */
export function SelectField({
  label,
  required,
  id,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <div>
      <Label htmlFor={id ?? label} label={label} required={required} />
      <select id={id ?? label} className={cn(CONTROL_CLASSES, className)} required={required} {...props}>
        {children}
      </select>
    </div>
  );
}