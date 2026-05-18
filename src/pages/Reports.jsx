import React, { useEffect, useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import {
  FileBarChart2, FileSpreadsheet, Download, Filter,
  TrendingUp, Receipt, FileCheck2, FileClock, FileX2,
  ChevronDown, Printer, Send, RefreshCw, Building2,
} from 'lucide-react'
import { useInvoiceStore } from '../store/invoiceStore'
import { calcTotals, getSeller, INVOICE_TEMPLATES } from '../services/mockData'
// Evaluated fresh on each module load — reflects latest company settings saved to localStorage
const SELLER = getSeller()
import Topbar from '../components/layout/Topbar'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { useThemeStore } from '../store/themeStore'
import { toast } from '../store/toastStore'

const fmt  = (n) => Number(n || 0).toLocaleString('vi-VN') + ' ₫'
const fmtN = (n) => Number(n || 0).toLocaleString('vi-VN')
const fmtM = (n) => {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(0) + 'M'
  return fmtN(n)
}


const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
const YEARS  = ['2024', '2025', '2026']
const QUARTERS = [
  { value: 'Q1', label: 'Quý I (T1–T3)',   months: ['01','02','03'] },
  { value: 'Q2', label: 'Quý II (T4–T6)',  months: ['04','05','06'] },
  { value: 'Q3', label: 'Quý III (T7–T9)', months: ['07','08','09'] },
  { value: 'Q4', label: 'Quý IV (T10–T12)',months: ['10','11','12'] },
]

function SelectBox({ value, onChange, options, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="appearance-none w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 pr-8 text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  )
}

// ─────────────────────────────────────────────
// TAB 1: Báo cáo hóa đơn
// ─────────────────────────────────────────────
function InvoiceReport({ invoices }) {
  const { dark } = useThemeStore()
  const [period, setPeriod] = useState('month')
  const [month, setMonth]   = useState('05')
  const [quarter, setQuarter] = useState('Q2')
  const [year, setYear]     = useState('2024')
  const [statusFilter, setStatusFilter] = useState('')

  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      if (!inv.issueDate) return false
      const [y, m] = inv.issueDate.split('-')
      const matchYear = y === year
      const matchPeriod =
        period === 'year' ? true
        : period === 'quarter' ? QUARTERS.find(q => q.value === quarter)?.months.includes(m)
        : m === month
      const matchStatus = !statusFilter || inv.status === statusFilter
      return matchYear && matchPeriod && matchStatus
    })
  }, [invoices, period, month, quarter, year, statusFilter])

  const issued    = filtered.filter(i => i.status === 'issued')
  const draft     = filtered.filter(i => i.status === 'draft')
  const cancelled = filtered.filter(i => i.status === 'cancelled')

  const totalRevenue = issued.reduce((s, i) => s + calcTotals(i.items).subtotal, 0)
  const totalVAT     = issued.reduce((s, i) => s + calcTotals(i.items).vat, 0)
  const totalAmount  = issued.reduce((s, i) => s + calcTotals(i.items).total, 0)

  // Bar chart by template type
  const byTemplate = INVOICE_TEMPLATES.map(t => {
    const invs = issued.filter(i => i.templateCode === t.code)
    return {
      name: t.type,
      label: t.name,
      count: invs.length,
      revenue: invs.reduce((s, i) => s + calcTotals(i.items).total, 0),
    }
  })

  const periodLabel = period === 'month'
    ? `Tháng ${month}/${year}`
    : period === 'quarter'
    ? `${QUARTERS.find(q => q.value === quarter)?.label} năm ${year}`
    : `Năm ${year}`

  const gridColor = dark ? '#334155' : '#e2e8f0'
  const tickColor = dark ? '#94a3b8' : '#64748b'

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-3 flex flex-wrap items-center gap-3">
        <Filter size={13} className="text-slate-400 shrink-0" />
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Kỳ báo cáo:</span>
        <SelectBox value={period} onChange={setPeriod} className="w-28"
          options={[{ value: 'month', label: 'Theo tháng' }, { value: 'quarter', label: 'Theo quý' }, { value: 'year', label: 'Cả năm' }]} />
        {period === 'month' && (
          <SelectBox value={month} onChange={setMonth} className="w-28"
            options={MONTHS.map(m => ({ value: m, label: `Tháng ${m}` }))} />
        )}
        {period === 'quarter' && (
          <SelectBox value={quarter} onChange={setQuarter} className="w-40"
            options={QUARTERS.map(q => ({ value: q.value, label: q.label }))} />
        )}
        <SelectBox value={year} onChange={setYear} className="w-24"
          options={YEARS.map(y => ({ value: y, label: `Năm ${y}` }))} />
        <div className="w-px h-4 bg-slate-200 dark:bg-slate-600" />
        <SelectBox value={statusFilter} onChange={setStatusFilter} className="w-32"
          options={[{ value: '', label: 'Tất cả TT' }, { value: 'issued', label: 'Đã phát hành' }, { value: 'draft', label: 'Nháp' }, { value: 'cancelled', label: 'Đã hủy' }]} />
        <div className="ml-auto flex gap-2">
          <Button icon={Printer} size="sm" variant="secondary" onClick={() => window.print()}>In báo cáo</Button>
          <Button icon={Download} size="sm" variant="primary" onClick={() => toast.info('Xuất Excel — tính năng sẽ hỗ trợ trong phiên bản tiếp theo.')}>Xuất Excel</Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tổng phát hành',  value: issued.length,  sub: `${draft.length} nháp · ${cancelled.length} hủy`, icon: FileCheck2, color: 'bg-blue-50 dark:bg-blue-900/20',   ic: 'text-blue-600',   vc: 'text-blue-700 dark:text-blue-300' },
          { label: 'Doanh thu (trước thuế)', value: fmt(totalRevenue), sub: periodLabel, icon: TrendingUp,  color: 'bg-green-50 dark:bg-green-900/20',  ic: 'text-green-600',  vc: 'text-green-700 dark:text-green-300' },
          { label: 'Thuế GTGT',        value: fmt(totalVAT),     sub: 'Từ HĐ đã phát hành',     icon: Receipt,      color: 'bg-purple-50 dark:bg-purple-900/20', ic: 'text-purple-600', vc: 'text-purple-700 dark:text-purple-300' },
          { label: 'Tổng thanh toán',  value: fmt(totalAmount),  sub: 'Bao gồm thuế GTGT',      icon: FileBarChart2, color: 'bg-orange-50 dark:bg-orange-900/20', ic: 'text-orange-600', vc: 'text-orange-700 dark:text-orange-300' },
        ].map(c => (
          <div key={c.label} className={`${c.color} rounded-xl p-4 border border-white/50 dark:border-slate-700/50`}>
            <c.icon size={16} className={`${c.ic} mb-2`} />
            <div className={`text-xl font-bold ${c.vc}`}>{c.value}</div>
            <div className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-0.5">{c.label}</div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Chart + breakdown */}
      <div className="grid grid-cols-3 gap-4">
        {/* Bar chart by type */}
        <div className="col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-0.5">Phân loại theo mẫu hóa đơn</div>
          <div className="text-xs text-slate-400 dark:text-slate-500 mb-4">{periodLabel} · HĐ đã phát hành</div>
          {issued.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-xs text-slate-400">Không có dữ liệu trong kỳ này</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byTemplate} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtM} tick={{ fontSize: 10, fill: tickColor }} axisLine={false} tickLine={false} width={44} />
                <Tooltip formatter={(v, n) => [fmtM(v) + ' ₫', 'Doanh thu']}
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                  {byTemplate.map((_, i) => <Cell key={i} fill={['#3b82f6','#22c55e','#a855f7'][i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Status breakdown */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">Trạng thái hóa đơn</div>
          <div className="space-y-4">
            {[
              { label: 'Đã phát hành', count: issued.length,    color: '#22c55e', icon: FileCheck2 },
              { label: 'Nháp',         count: draft.length,     color: '#eab308', icon: FileClock },
              { label: 'Đã hủy',       count: cancelled.length, color: '#ef4444', icon: FileX2 },
            ].map(s => (
              <div key={s.label}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <s.icon size={12} style={{ color: s.color }} />{s.label}
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{s.count}</span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${filtered.length ? (s.count / filtered.length) * 100 : 0}%`, background: s.color }} />
                </div>
              </div>
            ))}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
              Tổng: <span className="font-bold text-slate-700 dark:text-slate-200">{filtered.length}</span> hóa đơn trong kỳ
            </div>
          </div>
        </div>
      </div>

      {/* Detail table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Chi tiết hóa đơn</div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{periodLabel} · {filtered.length} hóa đơn</div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400">
                {['STT','Ký hiệu/Số','Ngày lập','Người mua','Tên đơn vị','MST','DT trước thuế','Thuế GTGT','Tổng TT','Trạng thái'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="text-center py-10 text-slate-400 dark:text-slate-500">Không có dữ liệu trong kỳ này</td></tr>
              )}
              {filtered.map((inv, idx) => {
                const { subtotal, vat, total } = calcTotals(inv.items)
                return (
                  <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                    <td className="px-4 py-2.5 text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-2.5 font-mono font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {inv.series}/{inv.status === 'draft' ? '---' : inv.number}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{inv.issueDate}</td>
                    <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{inv.buyerName || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300 max-w-[160px] truncate">{inv.customer.name}</td>
                    <td className="px-4 py-2.5 text-slate-500 font-mono whitespace-nowrap">{inv.customer.taxCode}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">{fmtN(subtotal)}</td>
                    <td className="px-4 py-2.5 text-right text-purple-600 dark:text-purple-400 whitespace-nowrap">{fmtN(vat)}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">{fmtN(total)}</td>
                    <td className="px-4 py-2.5"><Badge status={inv.status} /></td>
                  </tr>
                )
              })}
            </tbody>
            {issued.length > 0 && (
              <tfoot>
                <tr className="bg-blue-50 dark:bg-blue-900/20 font-semibold text-xs">
                  <td colSpan={6} className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">Tổng cộng (HĐ phát hành):</td>
                  <td className="px-4 py-2.5 text-right text-slate-800 dark:text-slate-100 whitespace-nowrap">{fmtN(totalRevenue)}</td>
                  <td className="px-4 py-2.5 text-right text-purple-600 dark:text-purple-400 whitespace-nowrap">{fmtN(totalVAT)}</td>
                  <td className="px-4 py-2.5 text-right text-blue-700 dark:text-blue-300 whitespace-nowrap">{fmtN(totalAmount)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// TAB 2: Báo cáo gửi CQT (Bảng kê HĐ điện tử)
// ─────────────────────────────────────────────
function CQTReport({ invoices }) {
  const [month, setMonth]   = useState('05')
  const [year, setYear]     = useState('2024')
  const [sending, setSending] = useState(false)

  const issued = useMemo(() =>
    invoices.filter(inv => {
      if (inv.status !== 'issued' || !inv.issueDate) return false
      const [y, m] = inv.issueDate.split('-')
      return y === year && m === month
    }),
  [invoices, month, year])

  const totalSubtotal = issued.reduce((s, i) => s + calcTotals(i.items).subtotal, 0)
  const totalVAT      = issued.reduce((s, i) => s + calcTotals(i.items).vat, 0)
  const totalAmount   = issued.reduce((s, i) => s + calcTotals(i.items).total, 0)

  const periodLabel = `Tháng ${month}/${year}`

  const handleSendCQT = async () => {
    if (issued.length === 0) { toast.error('Không có hóa đơn nào trong kỳ để gửi.'); return }
    setSending(true)
    await new Promise(r => setTimeout(r, 2000))
    setSending(false)
    toast.success(`Đã gửi bảng kê ${issued.length} hóa đơn tháng ${month}/${year} đến CQT thành công.`)
  }

  const handleExportXML = () => {
    // Generate minimal XML structure for tax authority
    const lines = issued.map((inv, i) => {
      const { subtotal, vat, total } = calcTotals(inv.items)
      return `  <HoaDon stt="${i + 1}">
    <KyHieu>${inv.series}</KyHieu>
    <So>${inv.number}</So>
    <NgayLap>${inv.issueDate}</NgayLap>
    <MaSoThue>${inv.customer.taxCode}</MaSoThue>
    <TenKhachHang>${inv.customer.name}</TenKhachHang>
    <DoanhThu>${subtotal}</DoanhThu>
    <ThueSuat>10</ThueSuat>
    <TienThue>${vat}</TienThue>
    <TongTien>${total}</TongTien>
    <MaCQT>${inv.taxAuthorityCode || ''}</MaCQT>
  </HoaDon>`
    }).join('\n')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<BangKeHoaDon>
  <KyBaoCao>
    <Thang>${month}</Thang>
    <Nam>${year}</Nam>
  </KyBaoCao>
  <NguoiBan>
    <Ten>${SELLER.name}</Ten>
    <MaSoThue>${SELLER.taxCode}</MaSoThue>
  </NguoiBan>
  <DanhSachHoaDon>
${lines}
  </DanhSachHoaDon>
  <TongHop>
    <TongDoanhThu>${totalSubtotal}</TongDoanhThu>
    <TongTienThue>${totalVAT}</TongTienThue>
    <TongThanhToan>${totalAmount}</TongThanhToan>
  </TongHop>
</BangKeHoaDon>`

    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `BangKe_HoaDon_T${month}_${year}.xml`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Đã xuất file XML bảng kê hóa đơn.')
  }

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-base font-bold text-slate-800 dark:text-slate-100">
              BẢNG KÊ HÓA ĐƠN ĐIỆN TỬ GỬI CƠ QUAN THUẾ
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Theo Nghị định 123/2020/NĐ-CP · Thông tư 78/2021/TT-BTC
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-600 dark:text-slate-300">
              <div><span className="font-semibold">Đơn vị:</span> {SELLER.name}</div>
              <div><span className="font-semibold">MST:</span> {SELLER.taxCode}</div>
              <div><span className="font-semibold">Kỳ:</span> {periodLabel}</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SelectBox value={month} onChange={setMonth} className="w-28"
              options={MONTHS.map(m => ({ value: m, label: `Tháng ${m}` }))} />
            <SelectBox value={year} onChange={setYear} className="w-24"
              options={YEARS.map(y => ({ value: y, label: `Năm ${y}` }))} />
            <Button icon={Download} size="sm" variant="secondary" onClick={handleExportXML}>
              Xuất XML
            </Button>
            <Button icon={Printer} size="sm" variant="secondary" onClick={() => window.print()}>
              In bảng kê
            </Button>
            <button onClick={handleSendCQT} disabled={sending || issued.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 transition-colors">
              {sending
                ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Đang gửi...</>
                : <><Send size={12} /> Gửi CQT</>
              }
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Số hóa đơn trong kỳ', value: issued.length + ' HĐ',   color: 'text-blue-700 dark:text-blue-300',   bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Tổng doanh thu (trước thuế)', value: fmt(totalSubtotal), color: 'text-green-700 dark:text-green-300', bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Tổng thuế GTGT phải nộp',     value: fmt(totalVAT),     color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-50 dark:bg-purple-900/20' },
        ].map(c => (
          <div key={c.label} className={`${c.bg} rounded-xl px-5 py-4 border border-white/50 dark:border-slate-700/50`}>
            <div className={`text-xl font-bold ${c.color}`}>{c.value}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Main table — bảng kê CQT */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Bảng kê hóa đơn {periodLabel}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">{issued.length} hóa đơn đã phát hành</div>
          </div>
          {issued.length > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-full font-semibold border border-green-200 dark:border-green-800">
              <FileCheck2 size={10} /> Sẵn sàng gửi CQT
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-700">
                {[
                  { label: 'STT',               w: '40px' },
                  { label: 'Ký hiệu mẫu',       w: '100px' },
                  { label: 'Ký hiệu HĐ',        w: '90px' },
                  { label: 'Số HĐ',             w: '80px' },
                  { label: 'Ngày lập',          w: '90px' },
                  { label: 'Tên người mua',     w: '' },
                  { label: 'MST người mua',     w: '110px' },
                  { label: 'Mặt hàng',          w: '180px' },
                  { label: 'DT chưa thuế',      w: '110px' },
                  { label: 'Thuế suất',         w: '80px' },
                  { label: 'Tiền thuế GTGT',    w: '110px' },
                  { label: 'Tổng TT',           w: '110px' },
                  { label: 'Mã CQT',            w: '140px' },
                  { label: 'Ghi chú',           w: '100px' },
                ].map(h => (
                  <th key={h.label} style={{ width: h.w, padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}
                    className="dark:text-slate-400 dark:border-slate-600">
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {issued.length === 0 && (
                <tr>
                  <td colSpan={14} style={{ padding: '48px 16px', textAlign: 'center', color: '#94a3b8' }}>
                    Không có hóa đơn đã phát hành trong {periodLabel}
                  </td>
                </tr>
              )}
              {issued.map((inv, idx) => {
                const { subtotal, vat, total } = calcTotals(inv.items)
                const itemsSummary = inv.items.map(i => i.description).join('; ')
                const vatRates = [...new Set(inv.items.map(i => i.vatRate + '%'))].join(', ')
                const rowStyle = { borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }
                const cellStyle = { padding: '8px 10px', verticalAlign: 'middle' }
                return (
                  <tr key={inv.id} style={rowStyle}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <td style={cellStyle} className="text-slate-400 dark:text-slate-500">{idx + 1}</td>
                    <td style={cellStyle} className="text-slate-600 dark:text-slate-300">{inv.templateCode || '01GTKT0/001'}</td>
                    <td style={cellStyle} className="font-mono text-blue-600 dark:text-blue-400 font-semibold">{inv.series}</td>
                    <td style={cellStyle} className="font-mono font-bold text-slate-800 dark:text-slate-100">{inv.number}</td>
                    <td style={cellStyle} className="text-slate-500 dark:text-slate-400 whitespace-nowrap">{inv.issueDate}</td>
                    <td style={cellStyle} className="text-slate-700 dark:text-slate-200">
                      <div className="font-medium">{inv.customer.name}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>{inv.buyerName}</div>
                    </td>
                    <td style={cellStyle} className="font-mono text-slate-500 dark:text-slate-400">{inv.customer.taxCode}</td>
                    <td style={{ ...cellStyle, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={itemsSummary} className="text-slate-600 dark:text-slate-300">
                      {itemsSummary}
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'right' }} className="font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      {fmtN(subtotal)}
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'center' }} className="text-slate-500 dark:text-slate-400">{vatRates}</td>
                    <td style={{ ...cellStyle, textAlign: 'right' }} className="text-purple-600 dark:text-purple-400 whitespace-nowrap">
                      {fmtN(vat)}
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'right' }} className="font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                      {fmtN(total)}
                    </td>
                    <td style={cellStyle} className="font-mono text-[10px] text-blue-600 dark:text-blue-400">
                      {inv.taxAuthorityCode || <span className="text-slate-300 italic">—</span>}
                    </td>
                    <td style={cellStyle} className="text-slate-400 dark:text-slate-500 text-[10px]">
                      {inv.note || ''}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {issued.length > 0 && (
              <tfoot>
                <tr style={{ background: '#eff6ff', borderTop: '2px solid #3b82f6' }}
                  className="dark:bg-blue-900/20 dark:border-blue-700">
                  <td colSpan={8} style={{ padding: '10px', textAlign: 'right', fontWeight: 700, fontSize: 12 }}
                    className="text-slate-700 dark:text-slate-200">
                    TỔNG CỘNG
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, fontSize: 12 }}
                    className="text-slate-800 dark:text-slate-100 whitespace-nowrap">
                    {fmtN(totalSubtotal)}
                  </td>
                  <td />
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, fontSize: 12 }}
                    className="text-purple-700 dark:text-purple-300 whitespace-nowrap">
                    {fmtN(totalVAT)}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, fontSize: 13, color: '#2563eb' }}
                    className="whitespace-nowrap">
                    {fmtN(totalAmount)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Footer note */}
        {issued.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 flex items-start gap-2">
            <Building2 size={12} className="text-slate-400 shrink-0 mt-0.5" />
            <div className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
              Bảng kê hóa đơn điện tử gửi Cơ quan Thuế theo quy định tại Điều 22 Nghị định 123/2020/NĐ-CP.
              Đơn vị xác nhận toàn bộ {issued.length} hóa đơn trong bảng kê trên là chính xác và đã được ký số bởi {SELLER.name} (MST: {SELLER.taxCode}).
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Shared page wrapper
// ─────────────────────────────────────────────
function ReportPage({ title, subtitle, children }) {
  const { fetchInvoices } = useInvoiceStore()
  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={title}
        subtitle={subtitle}
        actions={
          <Button icon={RefreshCw} size="sm" variant="secondary" onClick={fetchInvoices}>
            Làm mới
          </Button>
        }
      />
      <div className="flex-1 overflow-auto p-6 bg-slate-100 dark:bg-slate-900">
        {children}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Named exports — one per route
// ─────────────────────────────────────────────
export function InvoiceReportPage() {
  const { invoices, fetchInvoices } = useInvoiceStore()
  useEffect(() => { fetchInvoices() }, [])
  return (
    <ReportPage title="Tổng hợp hóa đơn" subtitle="Báo cáo hóa đơn điện tử theo kỳ">
      <InvoiceReport invoices={invoices} />
    </ReportPage>
  )
}

export function CQTReportPage() {
  const { invoices, fetchInvoices } = useInvoiceStore()
  useEffect(() => { fetchInvoices() }, [])
  return (
    <ReportPage title="Bảng kê gửi CQT" subtitle="Bảng kê hóa đơn điện tử gửi Cơ quan Thuế">
      <CQTReport invoices={invoices} />
    </ReportPage>
  )
}

export default function Reports() { return null }
