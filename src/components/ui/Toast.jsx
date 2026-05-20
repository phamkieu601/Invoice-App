import React, { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { useToastStore } from '../../store/toastStore'

const STYLES = {
  success: {
    bar:  'bg-green-500',
    icon: <CheckCircle2 size={16} className="text-green-500 shrink-0" />,
    title: 'text-green-700 dark:text-green-300',
  },
  error: {
    bar:  'bg-red-500',
    icon: <XCircle size={16} className="text-red-500 shrink-0" />,
    title: 'text-red-700 dark:text-red-300',
  },
  info: {
    bar:  'bg-blue-500',
    icon: <Info size={16} className="text-blue-500 shrink-0" />,
    title: 'text-blue-700 dark:text-blue-300',
  },
  warning: {
    bar:  'bg-yellow-500',
    icon: <AlertTriangle size={16} className="text-yellow-500 shrink-0" />,
    title: 'text-yellow-700 dark:text-yellow-300',
  },
}

function ToastItem({ toast, onRemove }) {
  const [visible, setVisible] = useState(false)
  const s = STYLES[toast.type] || STYLES.info

  useEffect(() => {
    // trigger enter animation
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const dismiss = () => {
    setVisible(false)
    setTimeout(() => onRemove(toast.id), 300)
  }

  return (
    <div
      className={`relative flex items-start gap-3 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
        rounded-xl shadow-lg px-4 py-3 overflow-hidden transition-all duration-300
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
    >
      {/* left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${s.bar}`} />

      {s.icon}

      <p className={`flex-1 text-xs font-medium leading-relaxed ${s.title}`}>
        {toast.message}
      </p>

      <button
        onClick={dismiss}
        className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors mt-0.5"
      >
        <X size={13} />
      </button>
    </div>
  )
}

export default function ToastContainer() {
  const toasts = useToastStore(s => s.toasts)
  const remove = useToastStore(s => s.remove)

  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2.5 z-[9999] no-print">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={remove} />
      ))}
    </div>
  )
}
