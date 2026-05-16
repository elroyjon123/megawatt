import { cn } from "../../lib/cn";

export function TableContainer({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "overflow-auto rounded-2xl border border-slate-200 bg-white/60",
        "dark:border-slate-800 dark:bg-slate-950/30",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Table({ className, children, ...props }) {
  return (
    <table className={cn("w-full text-left text-sm", className)} {...props}>
      {children}
    </table>
  );
}

export function THead({ className, children, ...props }) {
  return (
    <thead
      className={cn(
        "sticky top-0 z-10 bg-white/80 text-xs uppercase text-slate-500 backdrop-blur",
        "dark:bg-slate-950/60",
        className
      )}
      {...props}
    >
      {children}
    </thead>
  );
}

export function TH({ className, children, ...props }) {
  return (
    <th className={cn("px-3 py-2 font-semibold", className)} {...props}>
      {children}
    </th>
  );
}

export function TBody({ className, children, ...props }) {
  return (
    <tbody
      className={cn(
        "divide-y divide-slate-100 text-slate-700",
        "dark:divide-slate-900 dark:text-slate-200",
        className
      )}
      {...props}
    >
      {children}
    </tbody>
  );
}

export function TR({ className, children, ...props }) {
  return (
    <tr
      className={cn(
        "transition",
        "odd:bg-white/40 even:bg-white/20 hover:bg-emerald-50/50",
        "dark:odd:bg-slate-950/20 dark:even:bg-slate-950/10 dark:hover:bg-emerald-500/10",
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TD({ className, children, ...props }) {
  return (
    <td className={cn("px-3 py-2 align-top", className)} {...props}>
      {children}
    </td>
  );
}
