import React from 'react'
import { FileSearch } from 'lucide-react'

export default function EmptyState({ icon: Icon = FileSearch, title = 'No data found', description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
        <Icon size={24} className="text-slate-400 dark:text-slate-500" />
      </div>
      <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{title}</div>
      {description && <div className="text-xs text-slate-400 dark:text-slate-500 max-w-xs">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
