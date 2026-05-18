import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Search, RefreshCw, FileText, ChevronDown, ChevronUp,
  ShoppingCart, Loader2, WifiOff, Settings, Wifi, Database, Truck,
} from 'lucide-react'
import { useSOStore } from '../store/soStore'
import { calcTotals } from '../services/mockData'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import Pagination from '../components/ui/Pagination'
import Topbar from '../components/layout/Topbar'
import { useT } from '../i18n'

// Detect SAP connection mode from env + localStorage
function getSAPInfo() {
  try {
    const cfg = JSON.parse(localStorage.getItem('sapConfig') || '{}')
    const url  = (import.meta.env.VITE_SAP_BASE_URL || cfg.tenantUrl || '').replace(/\/$/, '')
    const user = import.meta.env.VITE_SAP_USERNAME || cfg.username || ''
    const live = !!(url && user)
    // Extract system ID from URL: https://my408543-api.s4hana.cloud.sap → my408543
    const sysId = url.match(/\/\/([\w-]+)-api\.s4hana/)?.[1] || ''
    return { live, url, user, sysId }
  } catch { return { live: false, url: '', user: '', sysId: '' } }
}

// Format amount with correct currency
function fmtAmt(n, currency = 'VND') {
  const num = Number(n || 0)
  if (currency === 'VND') return num.toLocaleString('vi-VN') + ' ₫'
  if (currency === 'USD') return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2 })
  if (currency === 'EUR') return '€' + num.toLocaleString('de-DE', { minimumFractionDigits: 2 })
  return num.toLocaleString() + ' ' + currency
}

export default function SOList() {
  const t = useT()
  const sapInfo = getSAPInfo()

  const STATUS_TABS = [
    { value: '',          label: t('soList.tab.all') },
    { value: 'pending',   label: t('soList.tab.pending') },
    { value: 'invoiced',  label: t('soList.tab.invoiced') },
    { value: 'cancelled', label: t('soList.tab.cancelled') },
  ]
  const { salesOrders, loading, error, fetchSalesOrders } = useSOStore()
  const location = useLocation()
  const [search, setSearch]         = useState(location.state?.soFilter || '')
  const [activeTab, setActiveTab]   = useState('')
  const [expandedSO, setExpandedSO] = useState(location.state?.soFilter || null)
  const [page, setPage]             = useState(1)
  const [pageSize, setPageSize]     = useState(10)
  const navigate = useNavigate()

  useEffect(() => { setPage(1) }, [search, activeTab])
  useEffect(() => { fetchSalesOrders({ search, status: activeTab }) }, [search, activeTab])

  const pagedSOs = salesOrders.slice((page - 1) * pageSize, page * pageSize)
  const counts = {
    '':        salesOrders.length,
    pending:   salesOrders.filter(s => s.invoiceStatus === 'pending').length,
    invoiced:  salesOrders.filter(s => s.invoiceStatus === 'invoiced').length,
    cancelled: salesOrders.filter(s => s.invoiceStatus === 'cancelled').length,
  }

  const doRefresh = () => fetchSalesOrders({ search, status: activeTab })

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={t('soList.title')}
        subtitle={t('soList.subtitle')}
        actions={
          <div className="flex items-center gap-2">
            {/* SAP connection badge */}
            {sapInfo.live ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                  Sales Order Integration · SAP_COM_0109
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                <Database size={11} className="text-amber-500" />
                <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">Demo</span>
              </div>
            )}
            <Button icon={RefreshCw} size="sm" variant="secondary" onClick={doRefresh}>
              {t('topbar.refresh')}
            </Button>
          </div>
        }
      />

      {/* ── SAP error banner ──────────────────────────────────────── */}
      {error && !loading && (
        <div className="mx-6 mt-4 flex items-start gap-3 px-4 py-3.5 rounded-xl border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20">
          <WifiOff size={16} className="text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-red-700 dark:text-red-300">
              Không thể kết nối SAP S/4HANA
            </div>
            <div className="text-xs text-red-500 dark:text-red-400 mt-0.5">{error}</div>
            <div className="text-[11px] text-slate-400 font-mono mt-1 truncate">
              {sapInfo.url || 'Chưa cấu hình Tenant URL'}
              {sapInfo.user ? ` · ${sapInfo.user}` : ''}
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

        {/* ── Summary cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: t('soList.totalSO'),       value: salesOrders.length,  color: 'text-slate-800 dark:text-slate-100' },
            { label: t('soList.pendingInvoice'), value: `${counts.pending} SO`,  color: 'text-amber-600 dark:text-amber-400' },
            { label: t('soList.invoiced'),       value: `${counts.invoiced} SO`, color: 'text-blue-600 dark:text-blue-400'  },
          ].map(card => (
            <div key={card.label} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">{card.label}</span>
              <span className={`text-sm font-bold ${card.color}`}>{card.value}</span>
            </div>
          ))}
        </div>

        {/* ── Table card ────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">

          {/* Status tabs */}
          <div className="flex items-center gap-1 px-4 pt-3 border-b border-slate-100 dark:border-slate-700">
            {STATUS_TABS.map(tab => (
              <button key={tab.value} onClick={() => setActiveTab(tab.value)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors border-b-2 -mb-px ${
                  activeTab === tab.value
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}>
                {tab.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === tab.value
                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}>
                  {counts[tab.value] ?? 0}
                </span>
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder={t('soList.search')}
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500" />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-slate-400 text-sm">
              <Loader2 size={16} className="animate-spin" /> Đang tải từ SAP...
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                  <th className="w-8 px-2 py-2.5" />
                  <th className="text-left px-4 py-2.5 font-semibold">{t('soList.col.soNumber')}</th>
                  <th className="text-left px-4 py-2.5 font-semibold">{t('soList.col.customer')}</th>
                  <th className="text-left px-4 py-2.5 font-semibold">{t('soList.col.soDate')}</th>
                  <th className="text-left px-4 py-2.5 font-semibold">{t('soList.col.deliveryDate')}</th>
                  <th className="text-right px-4 py-2.5 font-semibold">{t('soList.col.total')}</th>
                  <th className="px-4 py-2.5 w-36" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {salesOrders.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState
                        icon={error ? WifiOff : ShoppingCart}
                        title={error ? 'Không tải được dữ liệu' : 'Không có Sales Order'}
                        description={
                          error
                            ? 'Kết nối SAP thất bại. Kiểm tra cấu hình trong Settings → SAP.'
                            : sapInfo.live
                              ? 'SAP chưa có SO nào khớp bộ lọc hiện tại.'
                              : 'Chưa kết nối SAP — đang dùng dữ liệu demo.'
                        }
                      />
                    </td>
                  </tr>
                )}
                {pagedSOs.map(so => {
                  const { total } = calcTotals(so.items)
                  const isExpanded = expandedSO === so.soNumber
                  return (
                    <React.Fragment key={so.soNumber}>
                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                        {/* Expand */}
                        <td className="px-2 py-3 text-center">
                          <button onClick={() => setExpandedSO(isExpanded ? null : so.soNumber)}
                            className="text-slate-400 hover:text-blue-500 transition-colors">
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                        {/* SO Number */}
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                            {so.soNumber}
                          </span>
                          {so.note && (
                            <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[120px]">{so.note}</div>
                          )}
                        </td>
                        {/* Customer */}
                        <td className="px-4 py-3">
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                            {so.customer.name}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {so.customer.code && (
                              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                                BP: {so.customer.code}
                              </span>
                            )}
                            {so.customer.taxCode && (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                MST: {so.customer.taxCode}
                              </span>
                            )}
                          </div>
                        </td>
                        {/* Dates */}
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">{so.soDate}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{so.deliveryDate || '—'}</td>
                        {/* Amount */}
                        <td className="px-4 py-3 text-right">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {fmtAmt(total, so.currency)}
                          </span>
                          {so.currency && so.currency !== 'VND' && (
                            <div className="text-[10px] text-slate-400 mt-0.5 text-right">{so.currency}</div>
                          )}
                        </td>
                        {/* Action */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <Button icon={Truck} size="xs" variant="ghost"
                              onClick={() => navigate('/deliveries', { state: { soFilter: so.soNumber } })}>
                              Phiếu giao
                            </Button>
                            {so.billingStatus !== 'pending' && (
                              <Button icon={FileText} size="xs" variant="ghost"
                                onClick={() => navigate('/invoices')}>
                                Hóa đơn
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* ── Expanded row ── */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="bg-slate-50 dark:bg-slate-900/30 px-8 py-4">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                Line Items
                                <span className="font-mono text-blue-600 dark:text-blue-400">SO {so.soNumber}</span>
                                {so.note && <span className="font-normal text-slate-400">· {so.note}</span>}
                              </div>
                              {sapInfo.live && (
                                <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                                  <Wifi size={10} /> SAP Live Data
                                </div>
                              )}
                            </div>

                            {/* Items table */}
                            <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
                              <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                    {['#', t('soList.col.desc'), t('soList.col.unit'), t('soList.col.qty'), t('soList.col.unitPrice'), t('soList.col.vat'), t('soList.col.amount')].map(h => (
                                      <th key={h} className="px-3 py-2 font-semibold text-left border-b border-slate-200 dark:border-slate-600 last:text-right">
                                        {h}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {so.items.map((item, idx) => (
                                    <tr key={item.id || idx} className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 last:border-0">
                                      <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                                      <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{item.description}</td>
                                      <td className="px-3 py-2 text-slate-500">{item.unit}</td>
                                      <td className="px-3 py-2">{item.qty}</td>
                                      <td className="px-3 py-2">{Number(item.unitPrice).toLocaleString('vi-VN')}</td>
                                      <td className="px-3 py-2 text-slate-500">{item.vatRate}%</td>
                                      <td className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-300">
                                        {fmtAmt(item.qty * item.unitPrice, so.currency)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between mt-3">
                              <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                                <span>{t('soList.payment')}: <strong>{so.paymentMethod}</strong></span>
                                <span>·</span>
                                <span>{t('soList.currency')}: <strong>{so.currency}</strong></span>
                                {so.buyerName && <><span>·</span><span>Buyer: <strong>{so.buyerName}</strong></span></>}
                              </div>
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                {t('soList.total')} {fmtAmt(total, so.currency)}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          )}

          {salesOrders.length > 0 && (
            <div className="px-5 py-2 border-t border-slate-100 dark:border-slate-700">
              <Pagination page={page} pageSize={pageSize} total={salesOrders.length}
                onPageChange={setPage} onPageSizeChange={setPageSize} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
