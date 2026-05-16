export default function PaginationControls({ page, totalPages, onPrev, onNext, disabled }) {
  return (
    <div className="flex items-center justify-between gap-2 sm:justify-end">
      <div className="text-xs font-medium text-slate-500 sm:hidden">
        Page {page} / {totalPages}
      </div>
      <button
        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        onClick={onPrev}
        disabled={disabled || page <= 1}
      >
        Prev
      </button>
      <button
        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        onClick={onNext}
        disabled={disabled || page >= totalPages}
      >
        Next
      </button>
    </div>
  );
}
