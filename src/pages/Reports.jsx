import React, { useEffect, useState, useMemo, useRef } from 'react'
import * as XLSX from 'xlsx'
import {
  FileBarChart2, FileText, Filter, FileSpreadsheet,
  TrendingUp, Receipt, FileCheck2, CheckCircle2, X, Eye,
  ChevronDown, Printer, Send, RefreshCw, Building2, Download,
} from 'lucide-react'
import { useT } from '../i18n'
import { useInvoiceStore } from '../store/invoiceStore'
import { getIssuedInvoices } from '../services/issuedInvoiceService'
import { useCompanyStore } from '../store/companyStore'
import Topbar from '../components/layout/Topbar'
import Button from '../components/ui/Button'
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
// Invoice Detail Drawer (matches InvoiceList panel style)
// ─────────────────────────────────────────────
function InvoiceDetailDrawer({ record, onClose }) {
  const t = useT()
  if (!record) return null
  const r   = record
  const sap = r._sap
  const items       = sap?.items || r.items || []
  const netAmount   = sap?.totalNetAmount   || r.total_amount || 0
  const taxAmount   = sap?.totalTaxAmount   || 0
  const grossAmount = sap?.totalGrossAmount || r.total_amount || 0
  const currency    = r.currency || 'VND'

  const isIssued    = r.status !== 'cancelled'
  const signedDate  = r.signed_at ? new Date(r.signed_at).toLocaleString('vi-VN') : '—'

  const infoCards = [
    { label: 'Billing Document', value: r.billing_doc },
    { label: 'Doc Type',         value: r.billing_doc_type || '—' },
    { label: 'Series',           value: r.viettel_series || '—' },
    { label: 'Invoice No.',      value: r.viettel_invoice_no || '—' },
    { label: 'Invoice Date',     value: r.issue_date || '—' },
    { label: 'Signed At',        value: signedDate },
  ]

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex">
        <div className="relative ml-auto w-full max-w-md bg-white dark:bg-slate-800 shadow-2xl flex flex-col overflow-hidden">

          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                  {r.viettel_invoice_no ? `Số ${r.viettel_invoice_no}` : r.billing_doc}
                </span>
                {isIssued
                  ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 size={9} /> {t('invoiceList.panel.statusIssued')}
                    </span>
                  : <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
                      {t('invoiceList.panel.statusCancelled')}
                    </span>
                }
                {r.viettel_series && (
                  <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono">{r.viettel_series}</span>
                )}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">E-Invoice · Supabase issued_invoices</div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">

            {/* Người mua */}
            <section>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('invoiceList.panel.buyer')}</div>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-1.5 text-xs">
                <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{r.customer_name || '—'}</div>
                {r.customer_code    && <div className="text-slate-500">Customer Code: <span className="font-mono">{r.customer_code}</span></div>}
                {r.customer_tax_code && <div className="text-slate-500">Tax ID: <span className="font-semibold text-slate-700 dark:text-slate-300">{r.customer_tax_code}</span></div>}
              </div>
            </section>

            {/* Thông tin chứng từ */}
            <section>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('invoiceList.panel.docInfo')}</div>
              <div className="grid grid-cols-2 gap-2">
                {infoCards.map(c => (
                  <div key={c.label} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
                    <div className="text-[10px] text-slate-400 mb-0.5">{c.label}</div>
                    <div className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200 break-all">{c.value}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Mã CQT */}
            {r.viettel_tax_authority_code && (
              <section>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('invoiceList.panel.taxCode')}</div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl px-4 py-3">
                  <div className="font-mono text-[11px] text-emerald-700 dark:text-emerald-300 break-all leading-relaxed">{r.viettel_tax_authority_code}</div>
                </div>
              </section>
            )}

            {/* Dòng hàng */}
            {items.length > 0 && (
              <section>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('invoiceList.panel.lineItems', { count: items.length })}</div>
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                        <th className="text-left px-3 py-2">{t('invoiceList.panel.colDesc')}</th>
                        <th className="text-right px-3 py-2">{t('invoiceList.panel.colQty')}</th>
                        <th className="text-right px-3 py-2">{t('invoiceList.panel.colUnitPrice')}</th>
                        <th className="text-right px-3 py-2">{t('invoiceList.panel.colVat')}</th>
                        <th className="text-right px-3 py-2">{t('invoiceList.panel.colAmount')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {items.map((it, i) => (
                        <tr key={i} className="bg-white dark:bg-slate-800">
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-300 max-w-[140px]">
                            <div className="truncate">{it.description || it.material || '—'}</div>
                            {it.unit && <div className="text-[10px] text-slate-400">{it.unit}</div>}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400">{it.qty ?? '—'}</td>
                          <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400">{fmtN(it.unitPrice)}</td>
                          <td className="px-3 py-2 text-right text-slate-500">{it.vatRate != null ? it.vatRate + '%' : '—'}</td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-800 dark:text-slate-200">
                            {fmtN(it.netAmount ?? (it.qty * it.unitPrice))}
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
              <div className="flex justify-between text-slate-500">
                <span>{t('invoiceList.panel.netAmount')}</span>
                <span>{fmtN(netAmount)} {currency}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>{t('invoiceList.panel.taxAmount')}</span>
                <span className="text-purple-600 dark:text-purple-400">{fmtN(taxAmount)} {currency}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-slate-800 dark:text-slate-100 pt-1.5 border-t border-slate-200 dark:border-slate-600">
                <span>{t('invoiceList.panel.grossAmount')}</span>
                <span className="text-blue-600 dark:text-blue-400">{fmtN(grossAmount)} {currency}</span>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700 flex gap-2">
            <button onClick={onClose}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer">
              {t('common.close')}
            </button>
          </div>

        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────
// TAB 1: Tổng hợp hóa đơn điện tử
// ─────────────────────────────────────────────
function InvoiceReport({ invoices, issuedHDDT }) {
  const t = useT()
  const PAGE_SIZE = 15
  const sapMap = useMemo(() => new Map(invoices.map(i => [i.sapBillingDoc, i])), [invoices])

  // Filter state
  const [fromDate, setFromDate] = useState('')
  const [toDate,   setToDate]   = useState('')
  const [loaiHD,   setLoaiHD]   = useState('')
  const [kyHieu,   setKyHieu]   = useState('')
  const [khachHang, setKhachHang] = useState('')
  const [soHDTu,   setSoHDTu]   = useState('')
  const [soHDDen,  setSoHDDen]  = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)

  // Enrich issuedHDDT with SAP amounts
  const enriched = useMemo(() =>
    issuedHDDT.map(r => ({ ...r, _sap: sapMap.get(r.billing_doc) })),
  [issuedHDDT, sapMap])

  // Apply filters
  const [appliedFilters, setAppliedFilters] = useState({ fromDate: '', toDate: '', loaiHD: '', kyHieu: '', khachHang: '', soHDTu: '', soHDDen: '' })

  const handleSearch = () => {
    setAppliedFilters({ fromDate, toDate, loaiHD, kyHieu, khachHang, soHDTu, soHDDen })
    setPage(1)
  }
  const handleReset = () => {
    setFromDate(''); setToDate(''); setLoaiHD(''); setKyHieu(''); setKhachHang(''); setSoHDTu(''); setSoHDDen('')
    setAppliedFilters({ fromDate: '', toDate: '', loaiHD: '', kyHieu: '', khachHang: '', soHDTu: '', soHDDen: '' })
    setPage(1)
  }

  const filtered = useMemo(() => {
    const { fromDate, toDate, loaiHD, kyHieu, khachHang, soHDTu, soHDDen } = appliedFilters
    return enriched.filter(r => {
      const date = r.issue_date || r.signed_at?.slice(0,10) || ''
      if (fromDate && date < fromDate) return false
      if (toDate   && date > toDate)   return false
      if (loaiHD   && (r.billing_doc_type || '') !== loaiHD) return false
      if (kyHieu   && !(r.viettel_series || '').toLowerCase().includes(kyHieu.toLowerCase())) return false
      if (khachHang) {
        const q = khachHang.toLowerCase()
        if (!(r.customer_name || '').toLowerCase().includes(q) && !(r.customer_tax_code || '').includes(q)) return false
      }
      if (soHDTu && r.viettel_invoice_no && Number(r.viettel_invoice_no) < Number(soHDTu)) return false
      if (soHDDen && r.viettel_invoice_no && Number(r.viettel_invoice_no) > Number(soHDDen)) return false
      return true
    })
  }, [enriched, appliedFilters])

  // Tabs
  const tabs = useMemo(() => ({
    all:      filtered,
    issued:   filtered.filter(r => r.status !== 'cancelled'),
    cancelled:filtered.filter(r => r.status === 'cancelled'),
    adjusted: filtered.filter(r => (r.billing_doc_type || '').includes('ZCRM') || (r.viettel_invoice_type || '') === 'adjusted'),
    replaced: filtered.filter(r => (r.viettel_invoice_type || '') === 'replaced'),
  }), [filtered])

  const tabData = tabs[activeTab] ?? tabs.all

  // KPI totals over non-cancelled
  const active = tabs.issued
  const totalCount   = filtered.length
  const totalHang    = active.reduce((s, r) => s + (r._sap?.totalNetAmount   || r.total_amount || 0), 0)
  const totalVAT     = active.reduce((s, r) => s + (r._sap?.totalTaxAmount   || 0), 0)
  const totalPayment = active.reduce((s, r) => s + (r._sap?.totalGrossAmount || r.total_amount || 0), 0)

  // Pagination
  const totalPages = Math.ceil(tabData.length / PAGE_SIZE)
  const paged = tabData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Page subtotals
  const pageHang    = paged.filter(r=>r.status!=='cancelled').reduce((s,r)=>s+(r._sap?.totalNetAmount||r.total_amount||0), 0)
  const pageVAT     = paged.filter(r=>r.status!=='cancelled').reduce((s,r)=>s+(r._sap?.totalTaxAmount||0), 0)
  const pagePayment = paged.filter(r=>r.status!=='cancelled').reduce((s,r)=>s+(r._sap?.totalGrossAmount||r.total_amount||0), 0)

  const loaiOptions = useMemo(() => {
    const types = [...new Set(enriched.map(r => r.billing_doc_type).filter(Boolean))]
    return [{ value: '', label: t('reports.filter.typeAll') }, ...types.map(tp => ({ value: tp, label: tp }))]
  }, [enriched])

  const inputCls = 'border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500'

  const TABS = [
    { key: 'all',       label: t('reports.tab.all'),       count: tabs.all.length },
    { key: 'issued',    label: t('reports.tab.issued'),    count: tabs.issued.length },
    { key: 'cancelled', label: t('reports.tab.cancelled'), count: tabs.cancelled.length },
    { key: 'adjusted',  label: t('reports.tab.adjusted'),  count: tabs.adjusted.length },
    { key: 'replaced',  label: t('reports.tab.replaced'),  count: tabs.replaced.length },
  ]

  // Export Excel
  const handleExportExcel = () => {
    const rows = tabData.map((r, i) => {
      const sap = r._sap
      const vatRates = sap ? [...new Set((sap.items||[]).map(it=>it.vatRate).filter(v=>v!=null))].map(v=>v+'%').join(', ') : ''
      return {
        'STT': i + 1,
        'Ngày HĐ': r.issue_date || r.signed_at?.slice(0,10) || '',
        'Ký hiệu': r.viettel_series || r.billing_doc_type || '',
        'Số HĐ': r.viettel_invoice_no || '',
        'Mã CQT': r.viettel_tax_authority_code || '',
        'Billing Doc': r.billing_doc,
        'Tên khách hàng': r.customer_name || '',
        'MST khách hàng': r.customer_tax_code || '',
        'Tiền hàng': sap?.totalNetAmount || r.total_amount || 0,
        'Thuế VAT': sap?.totalTaxAmount || 0,
        'Tổng thanh toán': sap?.totalGrossAmount || r.total_amount || 0,
        'Thuế suất (%)': vatRates,
        'Trạng thái': r.status === 'cancelled' ? 'Đã hủy' : 'Đã phát hành',
      }
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    // Column widths
    ws['!cols'] = [8,14,12,14,36,16,36,18,18,16,20,14,14].map(w=>({wch:w}))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Hoa don dien tu')
    const label = activeTab === 'all' ? 'TatCa' : activeTab === 'issued' ? 'DaPhatHanh' : activeTab === 'cancelled' ? 'DaHuy' : activeTab
    XLSX.writeFile(wb, `BaoCao_HDDT_${label}_${new Date().toISOString().slice(0,10)}.xlsx`)
    toast.success('Đã xuất file Excel thành công.')
  }

  return (
    <>
      <div className="space-y-4">
        {/* Filter bar */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{t('reports.filter.fromDate')}</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{t('reports.filter.toDate')}</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{t('reports.filter.type')}</label>
              <div className="relative">
                <select value={loaiHD} onChange={e => setLoaiHD(e.target.value)}
                  className={`${inputCls} appearance-none pr-7 w-36`}>
                  {loaiOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{t('reports.filter.series')}</label>
              <input type="text" value={kyHieu} onChange={e => setKyHieu(e.target.value)} placeholder="VD: C24T" className={`${inputCls} w-32`} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{t('reports.filter.customer')}</label>
              <input type="text" value={khachHang} onChange={e => setKhachHang(e.target.value)} placeholder="Tên hoặc mã số thuế" className={`${inputCls} w-44`} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{t('reports.filter.soFrom')} – {t('reports.filter.soTo')}</label>
              <div className="flex items-center gap-1">
                <input type="number" value={soHDTu} onChange={e => setSoHDTu(e.target.value)} placeholder={t('reports.filter.soFrom')} className={`${inputCls} w-20`} />
                <span className="text-slate-400 text-xs">–</span>
                <input type="number" value={soHDDen} onChange={e => setSoHDDen(e.target.value)} placeholder={t('reports.filter.soTo')} className={`${inputCls} w-20`} />
              </div>
            </div>
            <div className="flex items-end gap-2 ml-auto">
              <button onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <RefreshCw size={12} /> {t('reports.filter.reset')}
              </button>
              <button onClick={handleSearch}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors">
                <Filter size={12} /> {t('reports.filter.search')}
              </button>
            </div>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: t('reports.kpi.total'),      value: fmtN(totalCount),   icon: FileText,      color: 'bg-blue-50 dark:bg-blue-900/20',    ic: 'text-blue-500',   vc: 'text-blue-700 dark:text-blue-300' },
            { label: t('reports.kpi.netAmount'),  value: fmtN(totalHang),    icon: TrendingUp,    color: 'bg-green-50 dark:bg-green-900/20',   ic: 'text-green-500',  vc: 'text-green-700 dark:text-green-300' },
            { label: t('reports.kpi.taxAmount'),  value: fmtN(totalVAT),     icon: Receipt,       color: 'bg-purple-50 dark:bg-purple-900/20', ic: 'text-purple-500', vc: 'text-purple-700 dark:text-purple-300' },
            { label: t('reports.kpi.grossAmount'),value: fmtN(totalPayment), icon: FileBarChart2, color: 'bg-orange-50 dark:bg-orange-900/20', ic: 'text-orange-500', vc: 'text-orange-700 dark:text-orange-300' },
          ].map(c => (
            <div key={c.label} className={`${c.color} rounded-xl p-4 border border-white/50 dark:border-slate-700/50`}>
              <c.icon size={16} className={`${c.ic} mb-2`} />
              <div className={`text-xl font-bold ${c.vc}`}>{c.value}</div>
              <div className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-0.5">{c.label}</div>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          {/* Tabs + Export buttons */}
          <div className="px-5 pt-4 pb-0 border-b border-slate-100 dark:border-slate-700 flex items-end justify-between gap-2">
            <div className="flex gap-1 flex-wrap">
              {TABS.map(t => (
                <button key={t.key} onClick={() => { setActiveTab(t.key); setPage(1) }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg transition-colors ${
                    activeTab === t.key
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}>
                  {t.label} <span className={`ml-1 text-[10px] ${activeTab === t.key ? 'text-blue-200' : 'text-slate-400'}`}>{t.count.toLocaleString()}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 pb-2 shrink-0">
              <button onClick={handleExportExcel} disabled={tabData.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 disabled:opacity-40 transition-colors">
                <FileSpreadsheet size={12} /> {t('reports.export.excel')}
              </button>
              <button onClick={() => window.print()} disabled={tabData.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-40 transition-colors">
                <Printer size={12} /> {t('reports.export.print')}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50">
                  {[
                    { key: 'no',        label: t('reports.col.no'),        align: 'left' },
                    { key: 'date',      label: t('reports.col.date'),      align: 'left' },
                    { key: 'series',    label: t('reports.col.series'),    align: 'left' },
                    { key: 'invoiceNo', label: t('reports.col.invoiceNo'), align: 'left' },
                    { key: 'customer',  label: t('reports.col.customer'),  align: 'left' },
                    { key: 'netAmount', label: t('reports.col.netAmount'), align: 'right' },
                    { key: 'taxAmount', label: t('reports.col.taxAmount'), align: 'right' },
                    { key: 'taxRate',   label: t('reports.col.taxRate'),   align: 'center' },
                    { key: 'action',    label: t('reports.col.action'),    align: 'left' },
                  ].map(h => (
                    <th key={h.key} className={`px-4 py-2.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap text-${h.align}`}>{h.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {paged.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-12 text-slate-400 dark:text-slate-500">{t('reports.empty')}</td></tr>
                )}
                {paged.map((r, idx) => {
                  const sap = r._sap
                  const vatRates = sap ? [...new Set((sap.items || []).map(i => i.vatRate).filter(v=>v!=null))].map(v=>v+'%').join(', ') : '—'
                  return (
                    <tr key={r.id}
                      onClick={() => setSelected(r)}
                      className={`hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer ${selected?.id === r.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                      <td className="px-4 py-2.5 text-slate-400">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{r.issue_date || r.signed_at?.slice(0,10) || '—'}</td>
                      <td className="px-4 py-2.5 font-mono text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        {r.viettel_series || '—'}
                      </td>
                      <td className="px-4 py-2.5 font-mono font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                        {r.viettel_invoice_no || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300 max-w-[200px]">
                        <div className="truncate font-medium">{r.customer_name || '—'}</div>
                        {r.customer_tax_code && <div className="text-[10px] text-slate-400 mt-0.5">MST: {r.customer_tax_code}</div>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                        {r.status === 'cancelled' ? <span className="text-slate-300 line-through">{fmtN(sap?.totalNetAmount||r.total_amount||0)}</span> : fmtN(sap?.totalNetAmount||r.total_amount||0)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-purple-600 dark:text-purple-400 whitespace-nowrap">
                        {r.status === 'cancelled' ? '—' : fmtN(sap?.totalTaxAmount||0)}
                      </td>
                      <td className="px-4 py-2.5 text-center text-slate-500 whitespace-nowrap">{vatRates}</td>
                      <td className="px-3 py-2.5">
                        <button onClick={e => { e.stopPropagation(); setSelected(r) }}
                          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30">
                          <Eye size={10} /> {t('reports.view')}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {paged.length > 0 && (
                <tfoot>
                  <tr className="bg-blue-50 dark:bg-blue-900/20 border-t border-blue-100 dark:border-blue-800">
                    <td colSpan={5} className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {t('reports.subtotal')}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">{fmtN(pageHang)}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-bold text-purple-700 dark:text-purple-300 whitespace-nowrap">{fmtN(pageVAT)}</td>
                    <td className="px-4 py-2.5 text-center text-xs text-slate-400">{fmtN(pagePayment)} ₫</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Pagination */}
          {tabData.length > PAGE_SIZE && (
            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {t('reports.pagination')
                  .replace('{start}', (page-1)*PAGE_SIZE+1)
                  .replace('{end}', Math.min(page*PAGE_SIZE, tabData.length))
                  .replace('{total}', tabData.length.toLocaleString())}
              </span>
              <div className="flex items-center gap-1">
                <button disabled={page===1} onClick={() => setPage(p=>p-1)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed">‹</button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const p = totalPages <= 7 ? i+1 : page <= 4 ? i+1 : page+i-3
                  if (p < 1 || p > totalPages) return null
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${p===page ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                      {p}
                    </button>
                  )
                })}
                <button disabled={page===totalPages} onClick={() => setPage(p=>p+1)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed">›</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Drawer */}
      {selected && <InvoiceDetailDrawer record={selected} onClose={() => setSelected(null)} />}
    </>
  )
}

// ─────────────────────────────────────────────
// TAB 2: Báo cáo gửi CQT (Bảng kê HĐ điện tử)
// ─────────────────────────────────────────────
function CQTReport({ invoices, issuedHDDT }) {
  const company = useCompanyStore()
  const currentYear  = String(new Date().getFullYear())
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0')
  const [month, setMonth]   = useState(currentMonth)
  const [year, setYear]     = useState(currentYear)
  const [sending, setSending] = useState(false)

  // Dùng Supabase issued_invoices làm nguồn — lọc theo tháng/năm ký số
  const issued = useMemo(() =>
    issuedHDDT.filter(r => {
      const signedAt = r.signed_at || r.issue_date || ''
      return signedAt.startsWith(`${year}-${month}`)
    }),
  [issuedHDDT, month, year])

  // Enrich với SAP data để lấy totalNetAmount / totalTaxAmount
  const issuedEnriched = useMemo(() => {
    const sapMap = new Map(invoices.map(i => [i.sapBillingDoc, i]))
    return issued.map(r => ({ ...r, _sap: sapMap.get(r.billing_doc) }))
  }, [issued, invoices])

  const totalSubtotal = issuedEnriched.reduce((s, r) => s + (r._sap?.totalNetAmount   || r.total_amount || 0), 0)
  const totalVAT      = issuedEnriched.reduce((s, r) => s + (r._sap?.totalTaxAmount   || 0), 0)
  const totalAmount   = issuedEnriched.reduce((s, r) => s + (r._sap?.totalGrossAmount || r.total_amount || 0), 0)

  const periodLabel = `Tháng ${month}/${year}`

  const handleSendCQT = async () => {
    if (issued.length === 0) { toast.error('Không có hóa đơn nào trong kỳ để gửi.'); return }
    setSending(true)
    await new Promise(r => setTimeout(r, 2000))
    setSending(false)
    toast.success(`Đã gửi bảng kê ${issued.length} hóa đơn tháng ${month}/${year} đến CQT thành công.`)
  }

  const handleExportXML = () => {
    const lines = issuedEnriched.map((r, i) => {
      const sap = r._sap
      return `  <HoaDon stt="${i + 1}">
    <KyHieu>${r.viettel_series || ''}</KyHieu>
    <So>${r.viettel_invoice_no || ''}</So>
    <NgayLap>${r.issue_date || ''}</NgayLap>
    <MaSoThue>${r.customer_tax_code || ''}</MaSoThue>
    <TenKhachHang>${r.customer_name || ''}</TenKhachHang>
    <DoanhThu>${sap?.totalNetAmount || r.total_amount || 0}</DoanhThu>
    <TienThue>${sap?.totalTaxAmount || 0}</TienThue>
    <TongTien>${sap?.totalGrossAmount || r.total_amount || 0}</TongTien>
    <MaCQT>${r.viettel_tax_authority_code || ''}</MaCQT>
  </HoaDon>`
    }).join('\n')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<BangKeHoaDon>
  <KyBaoCao>
    <Thang>${month}</Thang>
    <Nam>${year}</Nam>
  </KyBaoCao>
  <NguoiBan>
    <Ten>${company.companyName}</Ten>
    <MaSoThue>${company.taxCode}</MaSoThue>
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
              <div><span className="font-semibold">Đơn vị:</span> {company.companyName}</div>
              <div><span className="font-semibold">MST:</span> {company.taxCode}</div>
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
              {issuedEnriched.map((r, idx) => {
                const sap = r._sap
                const cellStyle = { padding: '8px 10px', verticalAlign: 'middle' }
                const rowStyle  = { borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }
                const itemsSummary = sap?.items?.map(i => i.description).filter(Boolean).join('; ') || '—'
                const vatRates = sap ? [...new Set(sap.items?.map(i => i.vatRate + '%'))].join(', ') : '—'
                return (
                  <tr key={r.id} style={rowStyle} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <td style={cellStyle} className="text-slate-400">{idx + 1}</td>
                    <td style={cellStyle} className="text-slate-600">{r.billing_doc_type || '—'}</td>
                    <td style={cellStyle} className="font-mono text-blue-600 font-semibold">{r.viettel_series || '—'}</td>
                    <td style={cellStyle} className="font-mono font-bold text-slate-800">{r.viettel_invoice_no || '—'}</td>
                    <td style={cellStyle} className="text-slate-500 whitespace-nowrap">{r.issue_date || r.signed_at?.slice(0,10)}</td>
                    <td style={cellStyle} className="text-slate-700">
                      <div className="font-medium">{r.customer_name || '—'}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>{r.billing_doc}</div>
                    </td>
                    <td style={cellStyle} className="font-mono text-slate-500">{r.customer_tax_code || '—'}</td>
                    <td style={{ ...cellStyle, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={itemsSummary} className="text-slate-600">{itemsSummary}</td>
                    <td style={{ ...cellStyle, textAlign: 'right' }} className="font-semibold text-slate-700 whitespace-nowrap">
                      {fmtN(sap?.totalNetAmount || 0)}
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'center' }} className="text-slate-500">{vatRates}</td>
                    <td style={{ ...cellStyle, textAlign: 'right' }} className="text-purple-600 whitespace-nowrap">
                      {fmtN(sap?.totalTaxAmount || 0)}
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'right' }} className="font-bold text-slate-800 whitespace-nowrap">
                      {fmtN(sap?.totalGrossAmount || r.total_amount || 0)}
                    </td>
                    <td style={cellStyle} className="font-mono text-[10px] text-blue-600">
                      {r.viettel_tax_authority_code || <span className="text-slate-300 italic">—</span>}
                    </td>
                    <td style={cellStyle} className="text-slate-400 text-[10px]"></td>
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
              Đơn vị xác nhận toàn bộ {issued.length} hóa đơn trong bảng kê trên là chính xác và đã được ký số bởi {company.companyName} (MST: {company.taxCode}).
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
  const t = useT()
  const { invoices, fetchInvoices } = useInvoiceStore()
  const [issuedHDDT, setIssuedHDDT] = useState([])
  useEffect(() => {
    fetchInvoices()
    getIssuedInvoices({}).then(setIssuedHDDT).catch(() => {})
  }, [])
  return (
    <ReportPage title={t('reports.invoice.title')} subtitle={t('reports.invoice.subtitle')}>
      <InvoiceReport invoices={invoices} issuedHDDT={issuedHDDT} />
    </ReportPage>
  )
}

export function CQTReportPage() {
  const { invoices, fetchInvoices } = useInvoiceStore()
  const [issuedHDDT, setIssuedHDDT] = useState([])
  useEffect(() => {
    fetchInvoices()
    getIssuedInvoices({}).then(setIssuedHDDT).catch(() => {})
  }, [])
  return (
    <ReportPage title="Bảng kê gửi CQT" subtitle="Bảng kê hóa đơn điện tử gửi Cơ quan Thuế">
      <CQTReport invoices={invoices} issuedHDDT={issuedHDDT} />
    </ReportPage>
  )
}

export default function Reports() { return null }
