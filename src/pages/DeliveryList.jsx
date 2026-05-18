import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Search, RefreshCw, Truck, Loader2, WifiOff, Database, ChevronDown, ChevronUp,
  ShoppingCart, FileText,
} from 'lucide-react'
import { getDeliveries } from '../services/deliveryService'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import Pagination from '../components/ui/Pagination'
import Topbar from '../components/layout/Topbar'

function getSAPInfo() {
  try {
    const cfg = JSON.parse(localStorage.getItem('sapConfig') || '{}')
    const url  = (import.meta.env.VITE_SAP_BASE_URL || cfg.tenantUrl || '').replace(/\/$/, '')
    const user = import.meta.env.VITE_SAP_USERNAME || cfg.username || ''
    return { live: !!(url && user) }
  } catch { return { live: false } }
}

const STATUS_BADGE = {
  open:      { label: 'Chờ giao', color: 'yellow' },
  partial:   { label: 'Giao một phần', color: 'blue' },
  completed: { label: 'Đã giao', color: 'green' },
}

const STATUS_TABS = [
  { value: '', label: 'Tất cả' },
  { value: 'open', label: 'Chờ giao' },
  { value: 'partial', label: 'Giao một phần' },
  { value: 'completed', label: 'Đã giao' },
]

export default function DeliveryList() {
  const sapInfo = getSAPInfo()
  const navigate = useNavigate()
  const location = useLocation()

  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [search, setSearch]         = useState(location.state?.soFilter || '')
  const [activeTab, setActiveTab]   = useState('')
  const [expanded, setExpanded]     = useState(null)
  const [page, setPage]             = useState(1)
  const [pageSize]                  = useState(15)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getDeliveries({ search, status: activeTab })
      setDeliveries(data)
    } catch (e) {
      setError(e.message || 'Không thể tải dữ liệu giao hàng')
    } finally {
      setLoading(false)
    }
  }, [search, activeTab])

  useEffect(() => { fetch() }, [fetch])
  useEffect(() => { setPage(1) }, [search, activeTab])

  const paged = deliveries.slice((page - 1) * pageSize, page * pageSize)
  const counts = {
    '':        deliveries.length,
    open:      deliveries.filter(d => d.status === 'open').length,
    partial:   deliveries.filter(d => d.status === 'partial').length,
    completed: deliveries.filter(d => d.status === 'completed').length,
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Delivery Processing"
        subtitle="Quản lý phiếu giao hàng từ SAP S/4HANA"
        actions={
          <div className="flex items-center gap-2">
            {sapInfo.live ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                  Delivery Processing Integration · SAP_COM_0106
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                <Database size={11} className="text-amber-500" />
                <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">Demo</span>
              </div>
            )}
            <Button size="sm" variant="outline" onClick={fetch} disabled={loading}>
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Làm mới
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
            <WifiOff size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Search + tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="px-4 pt-4 pb-2 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tìm phiếu giao hàng, khách hàng, SO..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Status tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-700 px-4 gap-1 overflow-x-auto">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.value
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {tab.label}
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px]">
                  {counts[tab.value] ?? 0}
                </span>
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Phiếu giao hàng</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Sales Order</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Khách hàng</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ngày giao</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Khối lượng</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Trạng thái</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Thao tác</th>
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={8} className="text-center py-16">
                      <Loader2 size={24} className="animate-spin mx-auto text-slate-400 mb-2" />
                      <p className="text-slate-400 text-sm">Đang tải dữ liệu từ SAP_COM_0106...</p>
                    </td>
                  </tr>
                )}
                {!loading && paged.length === 0 && (
                  <tr>
                    <td colSpan={8}>
                      <EmptyState
                        icon={Truck}
                        title="Không có phiếu giao hàng"
                        description="Không tìm thấy dữ liệu phù hợp."
                      />
                    </td>
                  </tr>
                )}
                {!loading && paged.map(d => (
                  <React.Fragment key={d.deliveryDoc}>
                    <tr
                      className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer"
                      onClick={() => setExpanded(expanded === d.deliveryDoc ? null : d.deliveryDoc)}
                    >
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {d.deliveryDoc}
                      </td>
                      <td className="px-4 py-3">
                        {d.soRef
                          ? <button
                              onClick={e => { e.stopPropagation(); navigate('/sales-orders', { state: { soFilter: d.soRef } }) }}
                              className="font-mono text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <ShoppingCart size={10} /> {d.soRef}
                            </button>
                          : <span className="text-slate-400 text-xs">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 text-sm">
                        {d.customerName || d.soldToParty || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                        {d.deliveryDate || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                        {d.totalWeight > 0 ? `${d.totalWeight.toLocaleString()} ${d.weightUnit}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge color={STATUS_BADGE[d.status]?.color || 'gray'}>
                          {STATUS_BADGE[d.status]?.label || d.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => navigate('/invoices', { state: { deliveryFilter: d.deliveryDoc } })}
                          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 whitespace-nowrap cursor-pointer"
                        >
                          <FileText size={10} /> Hóa đơn
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {expanded === d.deliveryDoc
                          ? <ChevronUp size={14} />
                          : <ChevronDown size={14} />
                        }
                      </td>
                    </tr>

                    {/* Expanded items */}
                    {expanded === d.deliveryDoc && (
                      <tr className="bg-slate-50 dark:bg-slate-800/40">
                        <td colSpan={8} className="px-6 py-3">
                          {d.items.length === 0 ? (
                            <p className="text-xs text-slate-400">Không có dòng hàng</p>
                          ) : (
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-slate-400 uppercase tracking-wide">
                                  <th className="text-left pb-1.5 pr-4">Material</th>
                                  <th className="text-left pb-1.5 pr-4">Mô tả</th>
                                  <th className="text-right pb-1.5">SL giao</th>
                                  <th className="text-left pb-1.5 pl-2">ĐVT</th>
                                </tr>
                              </thead>
                              <tbody>
                                {d.items.map(it => (
                                  <tr key={it.id} className="border-t border-slate-200 dark:border-slate-700">
                                    <td className="py-1.5 pr-4 font-mono text-slate-600 dark:text-slate-400">{it.material || '—'}</td>
                                    <td className="py-1.5 pr-4 text-slate-700 dark:text-slate-300">{it.description || '—'}</td>
                                    <td className="py-1.5 text-right text-slate-700 dark:text-slate-300 font-semibold">{it.qty.toLocaleString()}</td>
                                    <td className="py-1.5 pl-2 text-slate-500">{it.unit}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {deliveries.length > pageSize && (
            <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700">
              <Pagination
                page={page}
                pageSize={pageSize}
                total={deliveries.length}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
