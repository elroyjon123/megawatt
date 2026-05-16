import { cn } from "../../lib/cn";

export default function ErrorState({
  title = "Something went wrong",
  description,
  action,
  className,
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-rose-200 bg-rose-50/70 p-6",
        "dark:border-rose-900/50 dark:bg-rose-950/30",
        className
      )}
    >
      <div className="text-base font-semibold text-rose-900 dark:text-rose-200">{title}</div>
      {description ? (
        <div className="mt-1 text-sm text-rose-900/80 dark:text-rose-200/80">{description}</div>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
