import React, { useState, useRef, useEffect } from 'react'
import { Bell, Sun, Moon, CheckCircle2, FileText, X, CheckCheck } from 'lucide-react'
import { useThemeStore } from '../../store/themeStore'
import { useNotificationStore } from '../../store/notificationStore'

const ICONS = {
  invoice: FileText,
  default: Bell,
}

function NotificationDropdown({ onClose }) {
  const notifications = useNotificationStore(s => s.notifications)
  const markAllRead = useNotificationStore(s => s.markAllRead)
  const remove = useNotificationStore(s => s.remove)
  const clearAll = useNotificationStore(s => s.clearAll)
  const unread = notifications.filter(n => !n.read).length

  const fmtTime = iso => {
    const diff = Math.floor((Date.now() - new Date(iso)) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return new Date(iso).toLocaleDateString()
  }

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Notifications</span>
          {unread > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              {unread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              title="Mark all as read"
            >
              <CheckCheck size={14} />
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Clear all"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-500">
            <Bell size={24} className="mb-2 opacity-40" />
            <p className="text-xs">No notifications</p>
          </div>
        ) : (
          notifications.map(n => {
            const Icon = ICONS[n.type] || ICONS.default
            return (
              <div
                key={n.id}
                className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                  n.read ? 'bg-white dark:bg-slate-800' : 'bg-blue-50/60 dark:bg-blue-900/10'
                }`}
              >
                <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  n.variant === 'success'
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                }`}>
                  {n.variant === 'success' ? <CheckCircle2 size={14} /> : <Icon size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-snug">{n.title}</p>
                  {n.body && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{n.body}</p>}
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{fmtTime(n.createdAt)}</p>
                </div>
                <button
                  onClick={() => remove(n.id)}
                  className="text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 transition-colors shrink-0 mt-0.5"
                >
                  <X size={12} />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default function Topbar({ title, subtitle, actions }) {
  const dark = useThemeStore(s => s.dark)
  const toggleTheme = useThemeStore(s => s.toggle)
  const notifications = useNotificationStore(s => s.notifications)
  const markAllRead = useNotificationStore(s => s.markAllRead)
  const unread = notifications.filter(n => !n.read).length
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleOpen = () => {
    setOpen(o => !o)
    if (!open) markAllRead()
  }

  return (
    <div className="no-print bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        {title && <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100 leading-tight">{title}</h1>}
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-1.5">
        {actions && (
          <>
            {actions}
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-600 mx-1" />
          </>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="relative w-14 h-8 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 flex items-center transition-colors hover:border-slate-300 dark:hover:border-slate-500"
        >
          <span className={`absolute top-1 w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200 shadow-sm
            ${dark ? 'left-7 bg-slate-600' : 'left-1 bg-white border border-slate-200'}`}>
            {dark ? <Moon size={13} className="text-blue-300" /> : <Sun size={13} className="text-yellow-500" />}
          </span>
          <Sun size={11} className={`absolute left-2.5 transition-opacity ${dark ? 'opacity-20 text-slate-400' : 'opacity-0'}`} />
          <Moon size={11} className={`absolute right-2.5 transition-opacity ${dark ? 'opacity-0' : 'opacity-20 text-slate-400'}`} />
        </button>

        {/* Notification bell */}
        <div className="relative" ref={ref}>
          <button
            onClick={handleOpen}
            className="relative w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 hover:border-slate-300 dark:hover:border-slate-500 transition-colors"
          >
            <Bell size={14} className="text-slate-500 dark:text-slate-400" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-1 ring-white dark:ring-slate-800">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {open && <NotificationDropdown onClose={() => setOpen(false)} />}
        </div>
      </div>
    </div>
  )
}
