import React from 'react'

const presets = {
  draft:     { label: 'Nháp',          cls: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600' },
  issued:    { label: 'Đã phát hành',  cls: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  cancelled: { label: 'Đã hủy',        cls: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800' },
  pending:   { label: 'Chờ lập hóa đơn', cls: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  invoiced:  { label: 'Đã lập hóa đơn', cls: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
}

export default function Badge({ status, label, color }) {
  if (presets[status]) {
    const p = presets[status]
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${p.cls}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />
        {p.label}
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${color || 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'}`}>
      {label || status}
    </span>
  )
}
