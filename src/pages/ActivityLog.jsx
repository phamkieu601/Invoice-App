import React, { useState, useCallback } from 'react'
import {
  Activity,
  Trash2,
  Download,
  AlertTriangle,
  FilePlus2,
  CheckCircle2,
  XCircle,
  Clock3,
  RefreshCw,
} from 'lucide-react'
import { getInvoiceLog } from '../services/invoiceService'
import Topbar from '../components/layout/Topbar'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { useT } from '../i18n'

const TYPE_CONFIG_BASE = {
  create: {
    icon: FilePlus2,
    dot: 'bg-blue-500',
    badge: 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800',
    iconBox: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300',
  },
  issue: {
    icon: CheckCircle2,
    dot: 'bg-emerald-500',
    badge: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-800',
    iconBox: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300',
  },
  cancel: {
    icon: XCircle,
    dot: 'bg-red-500',
    badge: 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border-red-100 dark:border-red-800',
    iconBox: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300',
  },
}

const fmt = n => n != null ? Number(n).toLocaleString('vi-VN') + ' VND' : '-'

const fmtTime = value => {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return value
  }
}

function ConfirmClearModal({ onConfirm, onCancel, t }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t('activityLog.clearConfirm.title')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('activityLog.clearConfirm.desc')}
            </p>
          </div>
        </div>
        <div className="px-5 py-4 flex justify-end gap-2 bg-slate-50 dark:bg-slate-800/70">
          <button
            onClick={onCancel}
            className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
          >
            {t('activityLog.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-xs font-semibold text-white transition-colors"
          >
            {t('activityLog.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}

function exportCSV(logs) {
  const header = 'Type,InvoiceID,Series,Number,Customer,TaxCode,IssueDate,Total,SORef,TaxAuthorityCode,Time'
  const rows = logs.map(l =>
    [l.type, l.invoiceId, l.series || '', l.number || '', l.customer || '', l.customerTaxCode || '',
      l.issueDate || '', l.total != null ? Math.round(l.total) : '', l.soRef || '', l.taxAuthorityCode || '', l.time].join(',')
  )
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'activity_log.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function ActivityLog() {
  const t = useT()
  const [logs, setLogs] = useState(() => getInvoiceLog())
  const [filter, setFilter] = useState('all')
  const [showConfirmClear, setShowConfirmClear] = useState(false)

  const reload = useCallback(() => setLogs(getInvoiceLog()), [])

  const clearLog = () => {
    localStorage.removeItem('invoiceLog')
    setLogs([])
    setShowConfirmClear(false)
  }

  const filtered = filter === 'all' ? logs : logs.filter(l => l.type === filter)

  const TYPE_CONFIG = {
    create: { label: t('activityLog.type.create'), ...TYPE_CONFIG_BASE.create },
    issue:  { label: t('activityLog.type.issue'), ...TYPE_CONFIG_BASE.issue },
    cancel: { label: t('activityLog.type.cancel'), ...TYPE_CONFIG_BASE.cancel },
  }

  const TABS = [
    { value: 'all', label: t('activityLog.tab.all') },
    { value: 'create', label: t('activityLog.tab.draft') },
    { value: 'issue', label: t('activityLog.tab.issued') },
    { value: 'cancel', label: t('activityLog.tab.cancelled') },
  ]

  const counts = {
    all: logs.length,
    create: logs.filter(l => l.type === 'create').length,
    issue: logs.filter(l => l.type === 'issue').length,
    cancel: logs.filter(l => l.type === 'cancel').length,
  }

  return (
    <div className="flex flex-col h-full">
      {showConfirmClear && (
        <ConfirmClearModal
          t={t}
          onConfirm={clearLog}
          onCancel={() => setShowConfirmClear(false)}
        />
      )}

      <Topbar
        title={t('activityLog.title')}
        subtitle={t('activityLog.subtitle')}
        actions={
          <div className="flex gap-2">
            <Button icon={RefreshCw} size="sm" variant="ghost" onClick={reload}>
              {t('topbar.refresh')}
            </Button>
            <Button icon={Download} size="sm" variant="secondary" onClick={() => exportCSV(filtered)}>
              {t('activityLog.exportCsv')}
            </Button>
            <Button icon={Trash2} size="sm" variant="ghost" onClick={() => setShowConfirmClear(true)}>
              {t('activityLog.clearLog')}
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {TABS.map(tab => {
            const active = filter === tab.value
            const config = TYPE_CONFIG[tab.value]
            const Icon = config?.icon || Activity
            return (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={`text-left rounded-lg border px-4 py-3 transition-colors ${
                  active
                    ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config?.iconBox || 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'}`}>
                    <Icon size={16} />
                  </div>
                  <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{counts[tab.value]}</span>
                </div>
                <div className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">{tab.label}</div>
              </button>
            )
          })}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('activityLog.title')}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t('activityLog.events').replace('{count}', filtered.length)}
              </div>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-900/40 p-1 overflow-x-auto">
              {TABS.map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setFilter(tab.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
                    filter === tab.value
                      ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    filter === tab.value ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}>
                    {counts[tab.value]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={Activity}
              title={t('activityLog.empty')}
              description={t('activityLog.emptyDesc')}
            />
          ) : (
            <div className="px-5 py-4">
              <div className="relative">
                <div className="absolute left-[17px] top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-700" />
                {filtered.map((log, i) => {
                  const tc = TYPE_CONFIG[log.type] || {
                    label: log.type,
                    dot: 'bg-slate-400',
                    badge: 'text-slate-600 bg-slate-100 border-slate-200',
                    iconBox: 'bg-slate-100 text-slate-500',
                    icon: Activity,
                  }
                  const Icon = tc.icon
                  const seriesNum = log.series && log.number ? `${log.series}/${log.number}` : null
                  return (
                    <div key={i} className="relative flex gap-4 pb-4 last:pb-0">
                      <div className={`relative z-10 w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${tc.iconBox}`}>
                        <Icon size={16} />
                        <span className={`absolute -right-0.5 -bottom-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-800 ${tc.dot}`} />
                      </div>
                      <div className="min-w-0 flex-1 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/20 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${tc.badge}`}>{tc.label}</span>
                            <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 truncate">{log.invoiceId || '-'}</span>
                            {seriesNum && <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 shrink-0">/ {seriesNum}</span>}
                          </div>
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 font-mono shrink-0">
                            <Clock3 size={12} /> {fmtTime(log.time)}
                          </span>
                        </div>

                        <div className="mt-2 flex items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                          {log.customer && <span className="font-semibold text-slate-700 dark:text-slate-300">{log.customer}</span>}
                          {log.customerTaxCode && <span>MST: <span className="font-mono">{log.customerTaxCode}</span></span>}
                          {log.soRef && <span>SO: <span className="font-mono">{log.soRef}</span></span>}
                          {log.issueDate && <span>{t('activityLog.date')} {log.issueDate}</span>}
                          {log.total != null && <span className="font-semibold text-slate-700 dark:text-slate-300">{fmt(Math.round(log.total))}</span>}
                          {log.itemCount != null && <span>{log.itemCount} {t('activityLog.items')}</span>}
                          {log.taxAuthorityCode && (
                            <span className="font-mono text-[10px] text-slate-400">
                              {t('activityLog.cqt')} {log.taxAuthorityCode}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
