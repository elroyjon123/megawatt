import { cn } from "../../lib/cn";

export default function EmptyState({
  title = "Nothing here",
  description,
  action,
  className,
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-slate-300/70 bg-white/60 p-6 text-center",
        "dark:border-slate-700/80 dark:bg-slate-900/40",
        className
      )}
    >
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
        <span className="text-xl">+</span>
      </div>
      <div className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">{title}</div>
      {description ? <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</div> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
