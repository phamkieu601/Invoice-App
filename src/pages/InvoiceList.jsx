import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Search, Eye, RefreshCw, Download, FileText, Activity, WifiOff, Settings, Database, Truck, X, ChevronRight, Send, CheckCircle2 } from 'lucide-react'
import { getInvoiceLog } from '../services/invoiceService'
import { useInvoiceStore } from '../store/invoiceStore'
import { batchCheckInvoiceStatus, isViettelConfigured } from '../services/viettelService'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import Pagination from '../components/ui/Pagination'
import Topbar from '../components/layout/Topbar'
import { useT } from '../i18n'

const fmt = (n, currency = 'VND') => {
  const num = Number(n || 0)
  if (currency === 'USD') return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2 })
  if (currency === 'EUR') return '€' + num.toLocaleString('de-DE', { minimumFractionDigits: 2 })
  return num.toLocaleString('vi-VN') + ' ₫'
}

function getSAPInfo() {
  try {
    const cfg = JSON.parse(localStorage.getItem('sapConfig') || '{}')
    const url  = (import.meta.env.VITE_SAP_BASE_URL || cfg.tenantUrl || '').replace(/\/$/, '')
    const user = import.meta.env.VITE_SAP_USERNAME || cfg.username || ''
    const live = !!(url && user)
    const sysId = url.match(/\/\/([\w-]+)-api\.s4hana/)?.[1] || ''
    return { live, url, user, sysId }
  } catch { return { live: false, url: '', user: '', sysId: '' } }
}

function getInvoiceTotal(inv) {
  if (inv.totalGrossAmount != null) return inv.totalGrossAmount
  return (inv.items || []).reduce((s, it) => s + (it.netAmount != null ? it.netAmount + it.taxAmount : it.qty * it.unitPrice * (1 + it.vatRate / 100)), 0)
}

export default function InvoiceList() {
  const t = useT()
  const sapInfo = getSAPInfo()

  const STATUS_TABS = [
    { value: '',           label: t('invoiceList.tab.all') },
    { value: 'issued',     label: t('invoiceList.tab.issued') },
    { value: 'cancelled',  label: t('invoiceList.tab.cancelled') },
  ]
  const { invoices, loading, error, fetchInvoices } = useInvoiceStore()
  const location = useLocation()
  const [search, setSearch] = useState(location.state?.deliveryFilter || '')
  const [activeTab, setActiveTab] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [showLog, setShowLog] = useState(false)
  const [activityLog] = useState(() => getInvoiceLog())
  const [selectedInv, setSelectedInv] = useState(null)
  const [viettelMap, setViettelMap] = useState(new Map())   // billingDoc → { exists, invoiceNo, ... }
  const [viettelLoading, setViettelLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { setPage(1) }, [search, activeTab])
  useEffect(() => { fetchInvoices({ search, status: activeTab, deliveryFilter: location.state?.deliveryFilter }) }, [search, activeTab])

  // Sau khi invoices load xong, check Viettel status cho tất cả billing docs
  useEffect(() => {
    if (!invoices.length || !isViettelConfigured()) return
    const docs = invoices.map(inv => inv.sapBillingDoc).filter(Boolean)
    setViettelLoading(true)
    batchCheckInvoiceStatus(docs)
      .then(map => setViettelMap(map))
      .catch(() => {})
      .finally(() => setViettelLoading(false))
  }, [invoices])

  const counts = {
    '': invoices.length,
    draft: invoices.filter(i => i.status === 'draft').length,
    issued: invoices.filter(i => i.status === 'issued').length,
    cancelled: invoices.filter(i => i.status === 'cancelled').length,
  }

  const pagedInvoices = invoices.slice((page - 1) * pageSize, page * pageSize)

  const totalRevenue = invoices
    .filter(i => i.status === 'issued')
    .reduce((s, inv) => s + getInvoiceTotal(inv), 0)

  const doRefresh = () => fetchInvoices({ search, status: activeTab })


  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={t('invoiceList.title')}
        subtitle={t('invoiceList.subtitle')}
        actions={
          <div className="flex items-center gap-2">
            {sapInfo.live ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                  Billing Document Integration · SAP_COM_0192
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                <Database size={11} className="text-amber-500" />
                <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">Demo</span>
              </div>
            )}
            <Button icon={Download} size="sm" variant="secondary">{t('invoiceList.exportExcel')}</Button>
            <Button icon={RefreshCw} size="sm" variant="secondary" onClick={doRefresh}>
              {t('topbar.refresh')}
            </Button>
          </div>
        }
      />

      {/* ── SAP error banner ─────────────────────────────────────── */}
      {error && !loading && (
        <div className="mx-6 mt-4 flex items-start gap-3 px-4 py-3.5 rounded-xl border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20">
          <WifiOff size={16} className="text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-red-700 dark:text-red-300">
              Không thể tải Billing Documents từ SAP_COM_0192
            </div>
            <div className="text-xs text-red-500 dark:text-red-400 mt-0.5">{error}</div>
            <div className="text-[11px] text-slate-400 font-mono mt-1 truncate">
              {sapInfo.url || 'Chưa cấu hình Tenant URL'}{sapInfo.user ? ` · ${sapInfo.user}` : ''}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={doRefresh}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
              <RefreshCw size={11} /> Thử lại
            </button>
            <button onClick={() => navigate('/settings/sap')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">
              <Settings size={11} /> Cấu hình SAP
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-6 space-y-4">
        {/* Summary bar */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">{t('invoiceList.totalInvoices')}</span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{invoices.length}</span>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">{t('invoiceList.issuedRevenue')}</span>
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{fmt(totalRevenue)}</span>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">{t('invoiceList.pendingIssuance')}</span>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
              {t('invoiceList.pendingIssuanceVal').replace('{n}', invoices.filter(i => i.status === 'draft').length)}
            </span>
          </div>
        </div>

        {/* Table card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          {/* Status tabs */}
          <div className="flex items-center gap-1 px-4 pt-3 border-b border-slate-100 dark:border-slate-700">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors border-b-2 -mb-px
                  ${activeTab === tab.value
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >
                {tab.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold
                  ${activeTab === tab.value ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                  {counts[tab.value] ?? 0}
                </span>
              </button>
            ))}
          </div>

          {/* Search row */}
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('invoiceList.search')}
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
              />
            </div>
            <Button icon={RefreshCw} size="sm" variant="ghost" onClick={doRefresh}>
              Tải lại
            </Button>
            {activityLog.length > 0 && (
              <button onClick={() => setShowLog(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  showLog
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400'
                    : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}>
                <Activity size={12} /> Nhật ký ({activityLog.length})
              </button>
            )}
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400 dark:text-slate-500 text-sm">
              <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Loading...
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left px-5 py-2.5 font-semibold">Billing Doc</th>
                  <th className="text-left px-4 py-2.5 font-semibold">← Phiếu giao hàng</th>
                  <th className="text-left px-4 py-2.5 font-semibold">{t('invoiceList.col.customer')}</th>
                  <th className="text-left px-4 py-2.5 font-semibold">{t('invoiceList.col.issueDate')}</th>
                  <th className="text-left px-4 py-2.5 font-semibold">{t('invoiceList.col.dueDate')}</th>
                  <th className="text-right px-4 py-2.5 font-semibold">{t('invoiceList.col.total')}</th>
                  <th className="text-center px-4 py-2.5 font-semibold">{t('invoiceList.col.status')}</th>
                  <th className="text-center px-4 py-2.5 font-semibold">
                    <span className="flex items-center justify-center gap-1">
                      Số HĐĐT
                      {viettelLoading && isViettelConfigured() && <span className="w-2.5 h-2.5 border border-slate-300 border-t-slate-500 rounded-full animate-spin" />}
                    </span>
                  </th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={9}>
                      <EmptyState
                        icon={error ? WifiOff : FileText}
                        title={error ? 'Không tải được dữ liệu' : 'Không có Billing Document'}
                        description={
                          error
                            ? 'Kết nối SAP_COM_0192 thất bại. Kiểm tra cấu hình trong Settings → SAP.'
                            : sapInfo.live
                              ? 'SAP chưa có Billing Document nào khớp bộ lọc hiện tại.'
                              : 'Chưa kết nối SAP — đang dùng dữ liệu demo.'
                        }
                      />
                    </td>
                  </tr>
                )}
                {pagedInvoices.map(inv => {
                  const total = getInvoiceTotal(inv)
                  const isSelected = selectedInv?.id === inv.id
                  return (
                    <tr key={inv.id}
                      className={`cursor-pointer transition-colors group ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50/60 dark:hover:bg-slate-700/30'}`}
                      onClick={() => setSelectedInv(isSelected ? null : inv)}>
                      <td className="px-5 py-3">
                        <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                          {inv.sapBillingDoc}
                        </span>
                        {inv.billingDocType && (
                          <div className="text-[10px] text-slate-400 mt-0.5">{inv.billingDocType}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {inv.deliveryRef
                          ? <button
                              onClick={e => { e.stopPropagation(); navigate('/deliveries', { state: { soFilter: inv.deliveryRef } }) }}
                              className="flex items-center gap-1 font-mono text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                            >
                              <Truck size={10} /> {inv.deliveryRef}
                            </button>
                          : <span className="text-slate-400 text-xs">—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{inv.customer.name}</div>
                        {inv.customer.taxCode && (
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">MST: {inv.customer.taxCode}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{inv.issueDate}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{inv.dueDate || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {fmt(total, inv.currency)}
                        </span>
                        {inv.currency && inv.currency !== 'VND' && (
                          <div className="text-[10px] text-slate-400 mt-0.5 text-right">{inv.currency}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {inv.status === 'cancelled'
                          ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">Đã hủy</span>
                          : <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">Chưa phát hành</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-center">
                        {(() => {
                          const vt = viettelMap.get(inv.sapBillingDoc)
                          if (viettelLoading && isViettelConfigured() && !vt) return <span className="w-3 h-3 border border-slate-300 border-t-slate-400 rounded-full animate-spin inline-block" />
                          if (vt?.exists && vt.invoiceNo) return (
                            <span className="font-mono text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                              {vt.invoiceNo}
                            </span>
                          )
                          return <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                        })()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={e => { e.stopPropagation(); setSelectedInv(isSelected ? null : inv) }}
                            className={`flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium border rounded-lg transition-colors ${
                              isSelected
                                ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400'
                                : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            <Eye size={11} /> Chi tiết
                          </button>
                          {inv.status !== 'cancelled' && (
                            <button
                              onClick={e => { e.stopPropagation(); navigate(`/billing-preview/${inv.sapBillingDoc}`, { state: { inv } }) }}
                              className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors whitespace-nowrap cursor-pointer"
                            >
                              <Send size={11} /> Phát hành
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {invoices.length > 0 && (
            <div className="px-5 py-2 border-t border-slate-100 dark:border-slate-700">
              <Pagination
                page={page}
                pageSize={pageSize}
                total={invoices.length}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          )}
        </div>

        {/* Activity Log */}
        {showLog && activityLog.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
              <Activity size={14} className="text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Nhật ký hoạt động hóa đơn</span>
              <span className="ml-auto text-[10px] text-slate-400">{activityLog.length} sự kiện</span>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {activityLog.slice(0, 20).map((log, i) => {
                const typeMap = {
                  create: { label: 'Tạo nháp', color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' },
                  issue:  { label: 'Phát hành', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30' },
                  cancel: { label: 'Hủy', color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30' },
                }
                const t = typeMap[log.type] || { label: log.type, color: 'text-slate-500 bg-slate-100' }
                return (
                  <div key={i} className="flex items-center gap-4 px-5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${t.color}`}>{t.label}</span>
                    <span className="font-mono text-xs text-blue-600 dark:text-blue-400 shrink-0">{log.invoiceId}</span>
                    {log.customer && <span className="text-xs text-slate-600 dark:text-slate-300 truncate flex-1">{log.customer}</span>}
                    {log.soRef && <span className="text-[11px] text-slate-400 shrink-0">SO {log.soRef}</span>}
                    {log.number && <span className="text-[11px] text-slate-400 shrink-0 font-mono">#{log.number}</span>}
                    <span className="text-[11px] text-slate-400 shrink-0 font-mono ml-auto">{new Date(log.time).toLocaleString('vi-VN')}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Billing Detail Panel ─────────────────────────────────── */}
      {selectedInv && (
        <div className="fixed inset-y-0 right-0 z-40 flex">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/20 dark:bg-black/40" onClick={() => setSelectedInv(null)} />
          {/* Panel */}
          <div className="relative ml-auto w-full max-w-md bg-white dark:bg-slate-800 shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">{selectedInv.sapBillingDoc}</span>
                  <Badge status={selectedInv.status} />
                  {selectedInv.billingDocType && (
                    <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{selectedInv.billingDocType}</span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">Billing Document · SAP_COM_0192</div>
              </div>
              <button onClick={() => setSelectedInv(null)} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* Khách hàng */}
              <section>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Người mua hàng</div>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-1.5 text-xs">
                  <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{selectedInv.customer.name || '—'}</div>
                  {selectedInv.customer.code && <div className="text-slate-500">Mã KH: <span className="font-mono">{selectedInv.customer.code}</span></div>}
                  {selectedInv.customer.taxCode && <div className="text-slate-500">MST: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedInv.customer.taxCode}</span></div>}
                  {selectedInv.customer.address && <div className="text-slate-500">Địa chỉ: {selectedInv.customer.address}</div>}
                  {selectedInv.customer.phone && <div className="text-slate-500">ĐT: {selectedInv.customer.phone}</div>}
                  {selectedInv.customer.email && <div className="text-slate-500">Email: {selectedInv.customer.email}</div>}
                </div>
              </section>

              {/* Thông tin chứng từ */}
              <section>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Thông tin chứng từ</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Billing Document', value: selectedInv.sapBillingDoc },
                    { label: 'Loại chứng từ', value: selectedInv.billingDocType || '—' },
                    { label: 'Ngày phát hành', value: selectedInv.issueDate || '—' },
                    { label: 'Ngày đến hạn', value: selectedInv.dueDate || '—' },
                    { label: 'Đơn vị tiền tệ', value: selectedInv.currency || 'VND' },
                    { label: 'Điều kiện thanh toán', value: selectedInv.paymentMethod || '—' },
                    selectedInv.deliveryRef ? { label: 'Phiếu giao hàng (Delivery)', value: selectedInv.deliveryRef, link: () => { setSelectedInv(null); navigate('/deliveries', { state: { soFilter: selectedInv.deliveryRef } }) } } : null,
                  ].filter(Boolean).map(r => (
                    <div key={r.label} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
                      <div className="text-[10px] text-slate-400 mb-0.5">{r.label}</div>
                      {r.link
                        ? <button onClick={r.link} className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"><Truck size={10} />{r.value}</button>
                        : <div className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">{r.value}</div>
                      }
                    </div>
                  ))}
                </div>
              </section>

              {/* Line items */}
              {selectedInv.items?.length > 0 && (
                <section>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Dòng hàng ({selectedInv.items.length})</div>
                  <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                          <th className="text-left px-3 py-2">Mô tả</th>
                          <th className="text-right px-3 py-2">SL</th>
                          <th className="text-right px-3 py-2">Đơn giá</th>
                          <th className="text-right px-3 py-2">VAT</th>
                          <th className="text-right px-3 py-2">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {selectedInv.items.map((it, i) => (
                          <tr key={i} className="bg-white dark:bg-slate-800">
                            <td className="px-3 py-2 text-slate-700 dark:text-slate-300 max-w-[140px]">
                              <div className="truncate">{it.description || '—'}</div>
                              {it.unit && <div className="text-[10px] text-slate-400">{it.unit}</div>}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400">{it.qty}</td>
                            <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400">{Number(it.unitPrice || 0).toLocaleString('vi-VN')}</td>
                            <td className="px-3 py-2 text-right text-slate-500">{it.vatRate}%</td>
                            <td className="px-3 py-2 text-right font-semibold text-slate-800 dark:text-slate-200">
                              {it.netAmount != null
                                ? Number(it.netAmount + (it.taxAmount || 0)).toLocaleString('vi-VN')
                                : Number(it.qty * it.unitPrice * (1 + it.vatRate / 100)).toLocaleString('vi-VN')
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Totals */}
              <section className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-1.5 text-xs">
                {selectedInv.totalNetAmount != null && (
                  <div className="flex justify-between text-slate-500"><span>Tiền hàng (chưa VAT)</span><span>{Number(selectedInv.totalNetAmount).toLocaleString('vi-VN')} {selectedInv.currency}</span></div>
                )}
                {selectedInv.totalTaxAmount != null && (
                  <div className="flex justify-between text-slate-500"><span>Thuế VAT</span><span>{Number(selectedInv.totalTaxAmount).toLocaleString('vi-VN')} {selectedInv.currency}</span></div>
                )}
                <div className="flex justify-between font-bold text-sm text-slate-800 dark:text-slate-100 pt-1.5 border-t border-slate-200 dark:border-slate-600">
                  <span>Tổng cộng</span>
                  <span className="text-blue-600 dark:text-blue-400">{fmt(getInvoiceTotal(selectedInv), selectedInv.currency)}</span>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700 flex gap-2">
              {selectedInv.status === 'cancelled' ? (
                <div className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-xl">
                  Hóa đơn đã hủy
                </div>
              ) : (
                <button
                  onClick={() => { setSelectedInv(null); navigate(`/billing-preview/${selectedInv.sapBillingDoc}`, { state: { inv: selectedInv } }) }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors cursor-pointer"
                >
                  <Send size={14} /> Phát hành hóa đơn
                </button>
              )}
              <button
                onClick={() => setSelectedInv(null)}
                className="px-4 py-2.5 text-sm font-medium border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
