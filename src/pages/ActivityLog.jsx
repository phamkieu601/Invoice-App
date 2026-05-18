import React, { useState, useCallback } from 'react'
import { Activity, Trash2, Download, AlertTriangle } from 'lucide-react'
import { getInvoiceLog } from '../services/invoiceService'
import Topbar from '../components/layout/Topbar'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { useT } from '../i18n'

const TYPE_CONFIG = {
  create: { label: 'Tạo nháp',  labelEn: 'Draft Created', color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' },
  issue:  { label: 'Phát hành', labelEn: 'Issued',        color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30' },
  cancel: { label: 'Đã hủy',    labelEn: 'Cancelled',     color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30' },
}

const fmt = (n) => n != null ? Number(n).toLocaleString('vi-VN') + ' ₫' : '—'

function ConfirmClearModal({ onConfirm, onCancel, lang }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/30 mx-auto mb-4">
          <AlertTriangle size={22} className="text-red-500" />
        </div>
        <h3 className="text-center text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">
          {lang === 'en' ? 'Clear Activity Log?' : 'Xóa nhật ký hoạt động?'}
        </h3>
        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mb-5">
          {lang === 'en'
            ? 'All log entries will be permanently deleted. This action cannot be undone.'
            : 'Toàn bộ nhật ký sẽ bị xóa vĩnh viễn và không thể khôi phục.'}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            {lang === 'en' ? 'Cancel' : 'Hủy'}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-sm font-semibold text-white transition-colors"
          >
            {lang === 'en' ? 'Clear All' : 'Xóa tất cả'}
          </button>
        </div>
      </div>
    </div>
  )
}

function exportCSV(logs) {
  const header = 'Type,InvoiceID,Series,Number,Customer,TaxCode,IssueDate,Total,SORef,TaxAuthorityCode,Time'
  const rows = logs.map(l =>
    [l.type, l.invoiceId, l.series||'', l.number||'', l.customer||'', l.customerTaxCode||'',
     l.issueDate||'', l.total!=null?Math.round(l.total):'', l.soRef||'', l.taxAuthorityCode||'', l.time].join(',')
  )
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'activity_log.csv'; a.click()
  URL.revokeObjectURL(url)
}

export default function ActivityLog() {
  const t = useT()
  const lang = t('nav.overview') === 'Overview' ? 'en' : 'vi'
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

  const TABS = [
    { value: 'all',    label: lang === 'en' ? 'All' : 'Tất cả' },
    { value: 'create', label: lang === 'en' ? 'Draft Created' : 'Tạo nháp' },
    { value: 'issue',  label: lang === 'en' ? 'Issued' : 'Phát hành' },
    { value: 'cancel', label: lang === 'en' ? 'Cancelled' : 'Đã hủy' },
  ]

  const counts = {
    all: logs.length,
    create: logs.filter(l => l.type === 'create').length,
    issue:  logs.filter(l => l.type === 'issue').length,
    cancel: logs.filter(l => l.type === 'cancel').length,
  }

  return (
    <div className="flex flex-col h-full">
      {showConfirmClear && (
        <ConfirmClearModal
          lang={lang}
          onConfirm={clearLog}
          onCancel={() => setShowConfirmClear(false)}
        />
      )}

      <Topbar
        title={lang === 'en' ? 'Activity Log' : 'Nhật ký hoạt động'}
        subtitle={lang === 'en' ? 'Invoice lifecycle events' : 'Lịch sử thao tác hóa đơn điện tử'}
        actions={
          <div className="flex gap-2">
            <Button icon={Download} size="sm" variant="secondary" onClick={() => exportCSV(filtered)}>
              {lang === 'en' ? 'Export CSV' : 'Xuất CSV'}
            </Button>
            <Button icon={Trash2} size="sm" variant="ghost" onClick={() => setShowConfirmClear(true)}>
              {lang === 'en' ? 'Clear Log' : 'Xóa nhật ký'}
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          {/* Tabs */}
          <div className="flex items-center gap-1 px-4 pt-3 border-b border-slate-100 dark:border-slate-700">
            {TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors border-b-2 -mb-px
                  ${filter === tab.value
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >
                {tab.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold
                  ${filter === tab.value ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                  {counts[tab.value]}
                </span>
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={Activity}
              title={lang === 'en' ? 'No activity logs' : 'Chưa có nhật ký'}
              description={lang === 'en'
                ? 'Activity will appear here when invoices are created, issued, or cancelled.'
                : 'Nhật ký sẽ xuất hiện khi hóa đơn được tạo, phát hành hoặc hủy.'}
            />
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {filtered.map((log, i) => {
                const tc = TYPE_CONFIG[log.type] || { label: log.type, labelEn: log.type, color: 'text-slate-500 bg-slate-100' }
                const typeLabel = lang === 'en' ? tc.labelEn : tc.label
                const seriesNum = log.series && log.number ? `${log.series}/${log.number}` : null
                return (
                  <div key={i} className="px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    {/* Row 1: type badge + invoice id + time */}
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${tc.color}`}>{typeLabel}</span>
                      <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 shrink-0">{log.invoiceId}</span>
                      {seriesNum && (
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 shrink-0">· {seriesNum}</span>
                      )}
                      {log.soRef && (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">· SO {log.soRef}</span>
                      )}
                      <span className="ml-auto text-[11px] text-slate-400 font-mono shrink-0">
                        {new Date(log.time).toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN')}
                      </span>
                    </div>
                    {/* Row 2: customer info + financials */}
                    <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                      {log.customer && (
                        <span className="font-medium text-slate-700 dark:text-slate-300">{log.customer}</span>
                      )}
                      {log.customerTaxCode && (
                        <span>MST: <span className="font-mono">{log.customerTaxCode}</span></span>
                      )}
                      {log.issueDate && (
                        <span>{lang === 'en' ? 'Date:' : 'Ngày:'} {log.issueDate}</span>
                      )}
                      {log.total != null && (
                        <span className="font-semibold text-slate-600 dark:text-slate-300">{fmt(Math.round(log.total))}</span>
                      )}
                      {log.itemCount != null && (
                        <span>{log.itemCount} {lang === 'en' ? 'item(s)' : 'dòng hàng'}</span>
                      )}
                      {log.taxAuthorityCode && (
                        <span className="font-mono text-[10px] text-slate-400">
                          {lang === 'en' ? 'Auth:' : 'CQT:'} {log.taxAuthorityCode}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {filtered.length > 0 && (
            <div className="px-5 py-2.5 border-t border-slate-100 dark:border-slate-700 text-[11px] text-slate-400">
              {lang === 'en' ? `${filtered.length} events` : `${filtered.length} sự kiện`}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
