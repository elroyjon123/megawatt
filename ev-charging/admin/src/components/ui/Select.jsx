import { cn } from "../../lib/cn";

export default function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm",
        "dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-100",
        "focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100",
        "dark:focus:border-emerald-400 dark:focus:ring-emerald-500/20",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
