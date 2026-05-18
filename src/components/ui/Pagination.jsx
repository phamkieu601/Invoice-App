import React from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

export default function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  const pages = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)
  }

  const btn = (onClick, disabled, children, active = false) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center min-w-[32px] h-8 px-2 rounded-lg text-xs font-medium transition-all border
        disabled:opacity-40 disabled:cursor-not-allowed
        ${active
          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
          : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 hover:border-slate-300'}`}
    >
      {children}
    </button>
  )

  return (
    <div className="flex items-center justify-between px-1 py-2">
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {total === 0 ? 'No records' : `${from}–${to} of ${total} records`}
        </span>
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={e => { onPageSizeChange(Number(e.target.value)); onPageChange(1) }}
            className="text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300"
          >
            {[10, 20, 50].map(s => <option key={s} value={s}>{s} / page</option>)}
          </select>
        )}
      </div>

      <div className="flex items-center gap-1">
        {btn(() => onPageChange(1), page === 1, <ChevronsLeft size={13} />)}
        {btn(() => onPageChange(page - 1), page === 1, <ChevronLeft size={13} />)}
        {pages.map((p, i) =>
          p === '...'
            ? <span key={`e-${i}`} className="px-1 text-xs text-slate-400 select-none">…</span>
            : btn(() => onPageChange(p), false, p, p === page)
        )}
        {btn(() => onPageChange(page + 1), page === totalPages, <ChevronRight size={13} />)}
        {btn(() => onPageChange(totalPages), page === totalPages, <ChevronsRight size={13} />)}
      </div>
    </div>
  )
}
