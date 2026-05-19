import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  FileText, CheckCircle2, Clock, AlertTriangle, Zap,
  ArrowRight, RefreshCw, Wifi, WifiOff, Shield, ShieldOff,
  Server, Activity, Send,
} from 'lucide-react'
import { useInvoiceStore } from '../store/invoiceStore'
import { getIssuedInvoices } from '../services/issuedInvoiceService'
import Button from '../components/ui/Button'
import Topbar from '../components/layout/Topbar'
import { useT } from '../i18n'
import { useThemeStore } from '../store/themeStore'

const fmtNum  = n => Number(n || 0).toLocaleString('vi-VN')
const fmtAmt  = n => fmtNum(n) + ' ₫'
const fmtMini = n => {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(0) + 'M'
  if (n >= 1_000)         return (n / 1_000).toFixed(0) + 'K'
  return String(n)
}

// ── Mock data generators ────────────────────────────────────────────────────
const HOURS = Array.from({ length: 24 }, (_, i) => ({
  hour: `${String(i).padStart(2, '0')}:00`,
  today:    Math.floor(Math.random() * 30),
  yesterday:Math.floor(Math.random() * 25),
}))

const MONTH_CMP = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'].map(m => ({
  month:   m,
  current: Math.floor(Math.random() * 120 + 40),
  prev:    Math.floor(Math.random() * 100 + 30),
}))

// ── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, accent, onClick }) {
  const colors = {
    blue:   { bg: 'bg-blue-50 dark:bg-blue-900/20',   ic: 'text-blue-600 dark:text-blue-400',   val: 'text-blue-700 dark:text-blue-300',   border: 'border-blue-100 dark:border-blue-800' },
    amber:  { bg: 'bg-amber-50 dark:bg-amber-900/20', ic: 'text-amber-600 dark:text-amber-400', val: 'text-amber-700 dark:text-amber-300', border: 'border-amber-100 dark:border-amber-800' },
    green:  { bg: 'bg-emerald-50 dark:bg-emerald-900/20', ic: 'text-emerald-600 dark:text-emerald-400', val: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-100 dark:border-emerald-800' },
    red:    { bg: 'bg-red-50 dark:bg-red-900/20',     ic: 'text-red-600 dark:text-red-400',     val: 'text-red-700 dark:text-red-300',     border: 'border-red-200 dark:border-red-800' },
    slate:  { bg: 'bg-slate-50 dark:bg-slate-700/40', ic: 'text-slate-500 dark:text-slate-400', val: 'text-slate-700 dark:text-slate-200', border: 'border-slate-100 dark:border-slate-700' },
  }
  const c = colors[accent] || colors.slate
  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white dark:bg-slate-800 rounded-xl border ${c.border} p-4 hover:shadow-md transition-shadow group`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${c.bg}`}>
          <Icon size={17} className={c.ic} />
        </div>
        <ArrowRight size={13} className="text-slate-300 dark:text-slate-600 group-hover:text-slate-400 transition-colors mt-1" />
      </div>
      <div className={`text-2xl font-bold leading-none ${c.val}`}>{value}</div>
      <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1.5">{label}</div>
      {sub && <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 leading-snug">{sub}</div>}
    </button>
  )
}

// ── Connection status dot ────────────────────────────────────────────────────
function ConnDot({ ok }) {
  return (
    <span className={`inline-flex w-2 h-2 rounded-full shrink-0 ${ok ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
  )
}

// ── Urgent row ───────────────────────────────────────────────────────────────
function UrgentRow({ label, count, accent, onClick }) {
  const colors = {
    red:   'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
    blue:  'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
  }
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer rounded-lg" onClick={onClick}>
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${colors[accent]}`}>{count}</span>
      <span className="text-xs text-slate-700 dark:text-slate-200 flex-1">{label}</span>
      <ArrowRight size={13} className="text-slate-300 shrink-0" />
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { invoices, fetchInvoices } = useInvoiceStore()
  const { dark } = useThemeStore()
  const navigate = useNavigate()
  const t = useT()
  const [issuedList, setIssuedList] = useState([])
  const [lastSync] = useState(() => {
    const d = new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  })

  useEffect(() => {
    fetchInvoices()
    getIssuedInvoices({}).then(setIssuedList).catch(() => {})
  }, [])

  const today      = new Date().toISOString().slice(0, 10)
  const issuedSet  = new Set(issuedList.map(r => r.billing_doc))

  // KPI derivations
  const todayInvs   = invoices.filter(i => i.issueDate === today)
  const todayCount  = todayInvs.length
  const todayAmt    = todayInvs.reduce((s, i) => s + (i.totalGrossAmount || 0), 0)
  const pendingSign = invoices.filter(i => i.status !== 'cancelled' && !issuedSet.has(i.sapBillingDoc)).length
  const waitingCQT  = Math.floor(issuedList.length * 0.08)   // mock: 8% chờ CQT
  const issuedCount = issuedList.filter(r => r.status !== 'cancelled').length
  const errorCQT    = Math.floor(issuedList.length * 0.03)    // mock: 3% lỗi

  // Donut data
  const donutData = [
    { name: 'Pending Signing',  value: pendingSign, fill: '#f59e0b' },
    { name: 'Awaiting Tax Auth',value: waitingCQT,  fill: '#3b82f6' },
    { name: 'Issued',           value: issuedCount, fill: '#22c55e' },
    { name: 'CQT Error',        value: errorCQT,    fill: '#ef4444' },
  ].filter(d => d.value > 0)

  const donutTotal = donutData.reduce((s, d) => s + d.value, 0)

  const gridColor = dark ? '#334155' : '#e2e8f0'
  const tickColor = dark ? '#94a3b8' : '#94a3b8'

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Dashboard"
        subtitle={`Updated at ${lastSync}`}
        actions={
          <Button icon={RefreshCw} size="sm" variant="secondary"
            onClick={() => { fetchInvoices(); getIssuedInvoices({}).then(setIssuedList).catch(() => {}) }}>
            Refresh
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-5 space-y-5 bg-slate-100 dark:bg-slate-900">

        {/* ── Row 1: KPI Cards ── */}
        <div className="grid grid-cols-5 gap-3">
          <KpiCard
            label="Today's Invoices"
            value={todayCount}
            sub={todayCount > 0 ? fmtAmt(todayAmt) : 'No documents yet'}
            icon={FileText}
            accent="slate"
            onClick={() => navigate('/invoices')}
          />
          <KpiCard
            label="Pending Signing"
            value={pendingSign}
            sub="Received from SAP, not signed"
            icon={Clock}
            accent="amber"
            onClick={() => navigate('/invoices')}
          />
          <KpiCard
            label="Awaiting Tax Auth."
            value={waitingCQT}
            sub="Signed, waiting for CQT response"
            icon={Send}
            accent="blue"
            onClick={() => navigate('/issued-invoices')}
          />
          <KpiCard
            label="Issued"
            value={issuedCount}
            sub="Valid tax authority code"
            icon={CheckCircle2}
            accent="green"
            onClick={() => navigate('/issued-invoices')}
          />
          <KpiCard
            label="CQT Errors"
            value={errorCQT}
            sub={errorCQT > 0 ? 'Requires immediate action' : 'No errors'}
            icon={AlertTriangle}
            accent={errorCQT > 0 ? 'red' : 'slate'}
            onClick={() => navigate('/issued-invoices')}
          />
        </div>

        {/* ── Row 2: Charts ── */}
        <div className="grid grid-cols-3 gap-4">

          {/* Donut — trạng thái trong ngày */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-0.5">Invoices by Status</div>
            <div className="text-[11px] text-slate-400 mb-3">Current distribution</div>
            {donutTotal === 0 ? (
              <div className="h-40 flex items-center justify-center text-xs text-slate-400">No data available</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={42} outerRadius={62}
                      paddingAngle={2} dataKey="value" startAngle={90} endAngle={-270}>
                      {donutData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v + ' docs', n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-1">
                  {donutData.map(d => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.fill }} />
                        {d.name}
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {d.value}
                        <span className="font-normal text-slate-400 ml-1">
                          ({Math.round(d.value / donutTotal * 100)}%)
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Line — HĐ theo giờ trong ngày */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-0.5">Invoices by Hour</div>
            <div className="text-[11px] text-slate-400 mb-3">Today vs yesterday</div>
            <ResponsiveContainer width="100%" height={185}>
              <LineChart data={HOURS} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 9, fill: tickColor }} axisLine={false} tickLine={false}
                  interval={3} />
                <YAxis tick={{ fontSize: 9, fill: tickColor }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v, n) => [v + ' docs', n === 'today' ? 'Today' : 'Yesterday']} />
                <Line type="monotone" dataKey="today"     stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                <Line type="monotone" dataKey="yesterday" stroke="#cbd5e1" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-1 justify-center text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 inline-block" /> Today</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-slate-300 inline-block border-dashed" /> Yesterday</span>
            </div>
          </div>

          {/* Bar — so sánh tháng này vs tháng trước */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-0.5">Monthly Comparison</div>
            <div className="text-[11px] text-slate-400 mb-3">This month vs last month</div>
            <ResponsiveContainer width="100%" height={185}>
              <BarChart data={MONTH_CMP} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={6}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: tickColor }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: tickColor }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v, n) => [v + ' docs', n === 'current' ? 'This month' : 'Last month']} />
                <Bar dataKey="prev"    fill="#e2e8f0" radius={[2,2,0,0]} />
                <Bar dataKey="current" fill="#3b82f6" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-1 justify-center text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500 inline-block" /> This month</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-slate-200 inline-block" /> Last month</span>
            </div>
          </div>
        </div>

        {/* ── Row 3: Urgent table + Connection status ── */}
        <div className="grid grid-cols-3 gap-4">

          {/* Bảng cần xử lý ngay */}
          <div className="col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-red-500" />
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Requires Immediate Action</span>
              </div>
              <Button icon={ArrowRight} size="sm" variant="ghost" onClick={() => navigate('/issued-invoices')}>
                View All
              </Button>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-slate-700/50 p-2">
              <UrgentRow
                label="Invoices with CQT error, not retried"
                count={errorCQT}
                accent="red"
                onClick={() => navigate('/issued-invoices')}
              />
              <UrgentRow
                label="Invoices pending signing for over 30 minutes"
                count={Math.max(0, pendingSign - 2)}
                accent="amber"
                onClick={() => navigate('/invoices')}
              />
              <UrgentRow
                label="Invoices with tax code, not yet sent to customer"
                count={waitingCQT}
                accent="blue"
                onClick={() => navigate('/issued-invoices')}
              />
            </div>

            {/* Recent issued table */}
            {issuedList.length > 0 && (
              <>
                <div className="px-5 py-2.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recently Issued</span>
                </div>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700/40">
                    {issuedList.slice(0, 4).map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer"
                        onClick={() => navigate('/issued-invoices')}>
                        <td className="px-5 py-2.5 font-mono font-semibold text-blue-600 dark:text-blue-400">{inv.billing_doc}</td>
                        <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300 max-w-[180px] truncate">{inv.customer_name || '—'}</td>
                        <td className="px-4 py-2.5 text-slate-400">
                          {inv.signed_at ? new Date(inv.signed_at).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-700 dark:text-slate-200">
                          {fmtMini(inv.total_amount)} ₫
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>

          {/* Trạng thái kết nối */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col gap-0">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={14} className="text-slate-500" />
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Connection Status</span>
            </div>

            <div className="space-y-3 flex-1">
              {[
                { label: 'SAP S/4HANA',  ok: true,  icon: Server,    okLabel: 'Connected',    errLabel: 'Disconnected' },
                { label: 'CQT Gateway',  ok: true,  icon: Wifi,      okLabel: 'Online',       errLabel: 'Offline' },
                { label: 'HSM Signing',  ok: true,  icon: Shield,    okLabel: 'Active',       errLabel: 'Error' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-700/50">
                  <div className="flex items-center gap-2">
                    <item.icon size={13} className="text-slate-400 shrink-0" />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ConnDot ok={item.ok} />
                    <span className={`text-[11px] font-semibold ${item.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                      {item.ok ? item.okLabel : item.errLabel}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Last sync */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
              <div className="text-[10px] text-slate-400 mb-2 font-semibold uppercase tracking-wide">Last SAP Sync</div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200">{lastSync}</span>
                <span className="text-[11px] text-slate-400">
                  {fmtNum(invoices.length)} docs
                </span>
              </div>
              <div className="mt-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1">
                <div className="bg-emerald-500 h-1 rounded-full" style={{ width: '100%' }} />
              </div>
            </div>

            {/* Quick actions */}
            <div className="mt-4 space-y-2">
              <button onClick={() => navigate('/invoices')}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                <span className="flex items-center gap-1.5"><Zap size={11} /> Bulk Issue</span>
                <ArrowRight size={11} />
              </button>
              <button onClick={() => navigate('/issued-invoices')}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <span className="flex items-center gap-1.5"><CheckCircle2 size={11} /> View Issued</span>
                <ArrowRight size={11} />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
