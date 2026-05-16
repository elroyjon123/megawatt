export default function ListHeader({ title, subtitle, meta, actions }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
          {meta && <span className="text-xs font-medium text-slate-500">{meta}</span>}
        </div>
      </div>
      {actions ? <div className="flex items-center gap-2 sm:justify-end">{actions}</div> : null}
    </div>
  );
}
