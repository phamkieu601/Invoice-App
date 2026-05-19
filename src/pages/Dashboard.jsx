import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  FileText, CheckCircle, ShoppingCart,
  ArrowRight, FileClock, FileCheck2, FileX2,
  MailX, DollarSign, Receipt, BarChart2,
} from 'lucide-react'
import { useInvoiceStore } from '../store/invoiceStore'
import { useSOStore } from '../store/soStore'
import { getIssuedInvoices } from '../services/issuedInvoiceService'
import StatCard from '../components/ui/StatCard'
import Button from '../components/ui/Button'
import Topbar from '../components/layout/Topbar'
import { useT } from '../i18n'
import { useThemeStore } from '../store/themeStore'

const fmt = (n) => Number(n || 0).toLocaleString('vi-VN') + ' ₫'
const fmtM = (n) => {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(0) + 'M'
  return Number(n).toLocaleString('vi-VN')
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function CustomTooltipRevenue({ active, payload, label, t }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 shadow-lg text-xs">
      <div className="font-semibold text-slate-700 dark:text-slate-200 mb-1">{label}</div>
      <div className="text-blue-600 dark:text-blue-400">{t('dashboard.chart.revenueLabel')}: {fmtM(payload[0]?.value)} ₫</div>
      {payload[1] && <div className="text-slate-500 dark:text-slate-400">{t('dashboard.chart.invoicesLabel')}: {payload[1]?.value}</div>}
    </div>
  )
}

function CustomTooltipPie({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 shadow-lg text-xs">
      <div className="font-semibold text-slate-700 dark:text-slate-200">{payload[0].name}</div>
      <div style={{ color: payload[0].payload.fill }}>{payload[0].value} invoices</div>
    </div>
  )
}

export default function Dashboard() {
  const { invoices, fetchInvoices } = useInvoiceStore()
  const { salesOrders, fetchSalesOrders } = useSOStore()
  const { dark } = useThemeStore()
  const navigate = useNavigate()
  const t = useT()
  const [issuedHDDT, setIssuedHDDT] = useState([])

  useEffect(() => {
    fetchInvoices()
    fetchSalesOrders()
    getIssuedInvoices({}).then(setIssuedHDDT).catch(() => {})
  }, [])

  const today = new Date().toISOString().slice(0, 10)
  const currentYear = new Date().getFullYear()

  // Dùng issued_invoices từ Supabase làm nguồn chính
  const issuedSet     = new Set(issuedHDDT.map(r => r.billing_doc))
  const cancelled     = invoices.filter(i => i.status === 'cancelled').length
  const issuedCount   = issuedSet.size
  const pendingCount  = invoices.filter(i => i.status !== 'cancelled' && !issuedSet.has(i.sapBillingDoc)).length
  const pendingSO     = salesOrders.filter(s => s.invoiceStatus === 'pending').length
  const recentInvoices = [...invoices].slice(0, 5)

  // KPI từ SAP billing docs (totalGrossAmount / totalTaxAmount)
  const revenueToday = invoices
    .filter(i => i.issueDate === today)
    .reduce((s, i) => s + (i.totalGrossAmount || 0), 0)

  const totalRevenueSAP = invoices
    .filter(i => i.status !== 'cancelled')
    .reduce((s, i) => s + (i.totalGrossAmount || 0), 0)

  const totalVAT = invoices
    .filter(i => i.status !== 'cancelled')
    .reduce((s, i) => s + (i.totalTaxAmount || 0), 0)

  // Monthly Revenue từ SAP invoices, group theo issueDate tháng, năm hiện tại
  const monthlyMap = new Map(MONTHS.map(m => [m, { month: m, revenue: 0, invoices: 0 }]))
  invoices
    .filter(i => i.status !== 'cancelled' && i.issueDate?.startsWith(String(currentYear)))
    .forEach(i => {
      const m = parseInt(i.issueDate?.slice(5, 7)) - 1
      const key = MONTHS[m]
      if (key && monthlyMap.has(key)) {
        monthlyMap.get(key).revenue  += i.totalGrossAmount || 0
        monthlyMap.get(key).invoices += 1
      }
    })
  const MONTHLY_REVENUE = Array.from(monthlyMap.values())

  // Growth Rate: tháng hiện tại vs tháng trước
  const curMonth  = new Date().getMonth()
  const currMonthRevenue = MONTHLY_REVENUE[curMonth]?.revenue || 0
  const prevMonthRevenue = curMonth > 0 ? MONTHLY_REVENUE[curMonth - 1]?.revenue || 0 : 0
  const growthRate = prevMonthRevenue > 0
    ? Math.round(((currMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100)
    : 0

  // Top Customers từ SAP invoices
  const custMap = new Map()
  invoices.filter(i => i.status !== 'cancelled').forEach(i => {
    const name = i.customer?.name || i.customer?.code || '—'
    const prev = custMap.get(name) || { name, revenue: 0, invoices: 0 }
    custMap.set(name, { name, revenue: prev.revenue + (i.totalGrossAmount || 0), invoices: prev.invoices + 1 })
  })
  const TOP_CUSTOMERS = [...custMap.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  // Pie data
  const pieData = [
    { name: t('dashboard.status.issued'),   value: issuedCount,  fill: '#22c55e' },
    { name: t('dashboard.status.pending'),  value: pendingCount, fill: '#eab308' },
    { name: t('dashboard.status.cancelled'),value: cancelled,    fill: '#ef4444' },
  ].filter(d => d.value > 0)

  // chart colors
  const gridColor = dark ? '#334155' : '#e2e8f0'
  const tickColor = dark ? '#94a3b8' : '#94a3b8'

  // top customer bar max
  const maxRevenue = Math.max(...TOP_CUSTOMERS.map(c => c.revenue), 1)

  return (
    <div className="flex flex-col h-full">
      <Topbar title={t('dashboard.title')} />

      <div className="flex-1 overflow-auto p-6 space-y-5 bg-slate-100 dark:bg-slate-900">

        {/* ── Row 1: KPI Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={t('dashboard.kpi.todayRevenue')}
            value={revenueToday > 0 ? fmt(revenueToday) : '—'}
            subtitle={revenueToday > 0 ? today : t('dashboard.kpi.todayRevenueSub')}
            icon={DollarSign} color="blue" trend={null}
          />
          <StatCard
            title={t('dashboard.kpi.vat')}
            value={fmt(totalVAT)}
            subtitle={t('dashboard.kpi.vatSub').replace('{n}', invoices.filter(i=>i.status!=='cancelled').length)}
            icon={Receipt} color="purple" trend={null}
          />
          <StatCard
            title={t('dashboard.kpi.issued')}
            value={issuedCount}
            subtitle={t('dashboard.kpi.issuedSub').replace('{total}', invoices.length).replace('{pending}', pendingCount)}
            icon={CheckCircle} color="green" trend={null}
          />
          <StatCard
            title={t('dashboard.kpi.growth')}
            value={`${growthRate > 0 ? '+' : ''}${growthRate}%`}
            subtitle={t('dashboard.kpi.growthSub')}
            icon={BarChart2} color={growthRate >= 0 ? 'green' : 'red'} trend={growthRate}
          />
        </div>

        {/* ── Row 2: Area Chart + Pie Chart ── */}
        <div className="grid grid-cols-3 gap-4">

          {/* Area chart — Monthly Revenue */}
          <div className="col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('dashboard.chart.monthlyRevenue')}</div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{t('dashboard.chart.monthlyRevenueSub').replace('{year}', currentYear)}</div>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />{t('dashboard.chart.revenueLabel')}</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={MONTHLY_REVENUE} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtM} tick={{ fontSize: 10, fill: tickColor }} axisLine={false} tickLine={false} width={44} />
                <Tooltip content={<CustomTooltipRevenue t={t} />} />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2}
                  fill="url(#colorRevenue)" dot={false} activeDot={{ r: 4, fill: '#3b82f6' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Pie chart — Invoice status breakdown */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col">
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-0.5">{t('dashboard.chart.breakdown')}</div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mb-3">{t('dashboard.chart.breakdownSub')}</div>
            {invoices.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500">{t('dashboard.chart.noData')}</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                      paddingAngle={3} dataKey="value">
                      {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltipPie />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {pieData.map(d => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.fill }} />
                        {d.name}
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {d.value} <span className="font-normal text-slate-400">
                          ({Math.round(d.value / invoices.length * 100)}%)
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Row 3: Invoice Status + Quick Actions ── */}
        <div className="grid grid-cols-3 gap-4">

          {/* Invoice Status 4-cell */}
          <div className="col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('dashboard.status.title')}</div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{t('dashboard.status.subtitle')}</div>
              </div>
              <Button icon={ArrowRight} size="sm" variant="ghost" onClick={() => navigate('/invoices')}>{t('dashboard.status.viewAll')}</Button>
            </div>
            <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 dark:divide-slate-700">
              {[
                { label: t('dashboard.status.pending'),   sub: t('dashboard.status.pendingSub'),   value: pendingCount,    icon: FileClock,  bg: 'bg-yellow-50 dark:bg-yellow-900/20', ic: 'text-yellow-500', vc: 'text-yellow-600 dark:text-yellow-400', filter: '' },
                { label: t('dashboard.status.issued'),    sub: t('dashboard.status.issuedSub'),    value: issuedCount,     icon: FileCheck2, bg: 'bg-green-50 dark:bg-green-900/20',  ic: 'text-green-500',  vc: 'text-green-600 dark:text-green-400',  filter: '' },
                { label: t('dashboard.status.cancelled'), sub: t('dashboard.status.cancelledSub'), value: cancelled,       icon: FileX2,     bg: 'bg-red-50 dark:bg-red-900/20',      ic: 'text-red-500',    vc: 'text-red-600 dark:text-red-400',      filter: 'cancelled' },
                { label: t('dashboard.status.total'),     sub: t('dashboard.status.totalSub'),     value: invoices.length, icon: MailX,      bg: 'bg-slate-50 dark:bg-slate-700/40',  ic: 'text-slate-400',  vc: 'text-slate-500 dark:text-slate-400',  filter: '' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-4 px-5 py-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.bg}`}>
                    <item.icon size={18} className={item.ic} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xl font-bold ${item.vc}`}>{item.value}</div>
                    <div className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{item.label}</div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{item.sub}</div>
                  </div>
                  <button
                    onClick={() => navigate(`/invoices${item.filter ? `?status=${item.filter}` : ''}`)}
                    className="text-[11px] text-blue-500 dark:text-blue-400 hover:underline shrink-0"
                  >{t('dashboard.status.details')}</button>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col gap-3">
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">{t('dashboard.quick.title')}</div>
            <button onClick={() => navigate('/create')}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 text-sm font-medium transition-colors">
              <FileText size={15} /> {t('dashboard.quick.create')}
            </button>
            <button onClick={() => navigate('/sales-orders')}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors">
              <ShoppingCart size={15} /> {t('dashboard.quick.salesOrders')}
              {pendingSO > 0 && (
                <span className="ml-auto bg-yellow-400 text-yellow-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingSO}</span>
              )}
            </button>
            <button onClick={() => navigate('/invoices')}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors">
              <FileCheck2 size={15} /> {t('dashboard.quick.billingDocs')}
            </button>

            {/* Mini summary */}
            <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-700 space-y-2">
              {[
                { label: t('dashboard.quick.totalDocs'),     value: invoices.length, color: 'text-slate-700 dark:text-slate-200' },
                { label: t('dashboard.quick.issuanceRate'),  value: invoices.length ? `${Math.round(issuedCount / invoices.length * 100)}%` : '—', color: 'text-green-600 dark:text-green-400' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 dark:text-slate-400">{item.label}</span>
                  <span className={`font-bold ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Row 4: Top Customers bar + Recent Invoices ── */}
        <div className="grid grid-cols-3 gap-4">

          {/* Top Customers horizontal bar */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-0.5">{t('dashboard.customers.title')}</div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mb-4">{t('dashboard.customers.subtitle')}</div>
            <div className="space-y-3">
              {TOP_CUSTOMERS.map((c, i) => (
                <div key={c.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-700 dark:text-slate-200 font-medium truncate max-w-[160px]">{c.name}</span>
                    <span className="text-slate-500 dark:text-slate-400 shrink-0 ml-2">{fmtM(c.revenue)} ₫</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(c.revenue / maxRevenue) * 100}%`,
                        background: ['#3b82f6','#22c55e','#a855f7','#f59e0b','#64748b'][i],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Invoices */}
          <div className="col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('dashboard.recent.title')}</div>
              <Button icon={ArrowRight} size="sm" variant="ghost" onClick={() => navigate('/invoices')}>{t('dashboard.recent.viewAll')}</Button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 text-xs text-slate-500 dark:text-slate-400">
                  <th className="text-left px-5 py-2.5 font-medium">{t('dashboard.recent.colBillingDoc')}</th>
                  <th className="text-left px-4 py-2.5 font-medium">{t('dashboard.recent.colCustomer')}</th>
                  <th className="text-left px-4 py-2.5 font-medium">{t('dashboard.recent.colDate')}</th>
                  <th className="text-right px-4 py-2.5 font-medium">{t('dashboard.recent.colTotal')}</th>
                  <th className="text-center px-4 py-2.5 font-medium">{t('dashboard.col.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {recentInvoices.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">{t('dashboard.recent.noData')}</td></tr>
                )}
                {recentInvoices.map(inv => (
                  <tr key={inv.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/billing-preview/${inv.sapBillingDoc}`, { state: { inv } })}>
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                      {inv.sapBillingDoc}
                      {inv.billingDocType && <div className="text-[10px] text-slate-400 font-normal">{inv.billingDocType}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-medium text-slate-800 dark:text-slate-200">{inv.customer?.name || '—'}</div>
                      {inv.customer?.taxCode && <div className="text-[11px] text-slate-400 dark:text-slate-500">MST: {inv.customer.taxCode}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{inv.issueDate || '—'}</td>
                    <td className="px-4 py-3 text-right text-xs font-semibold text-slate-800 dark:text-slate-200">{fmt(inv.totalGrossAmount)}</td>
                    <td className="px-4 py-3 text-center">
                      {inv.status === 'cancelled'
                        ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">{t('dashboard.recent.status.cancelled')}</span>
                        : issuedSet.has(inv.sapBillingDoc)
                          ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{t('dashboard.recent.status.issued')}</span>
                          : <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{t('dashboard.recent.status.pending')}</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
