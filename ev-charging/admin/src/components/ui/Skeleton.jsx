import { cn } from "../../lib/cn";

export default function Skeleton({ className }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-800/60",
        className
      )}
    />
  );
}
