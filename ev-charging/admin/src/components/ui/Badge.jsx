import { cn } from "../../lib/cn";

const VARIANT = {
  default: "bg-slate-100 text-slate-700 dark:bg-slate-800/70 dark:text-slate-200",
  success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
  danger: "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200",
  warning: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200",
  info: "bg-sky-100 text-sky-900 dark:bg-sky-500/20 dark:text-sky-200",
};

export default function Badge({ variant = "default", className, children, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        VARIANT[variant] || VARIANT.default,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
