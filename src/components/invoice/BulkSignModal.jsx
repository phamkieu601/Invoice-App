import React, { useState } from 'react'
import { ShieldCheck, KeyRound, AlertCircle, CheckCircle2, XCircle, Zap, X } from 'lucide-react'
import { saveIssuedInvoice, checkAlreadyIssued } from '../../services/issuedInvoiceService'
import { useNotificationStore } from '../../store/notificationStore'

const MOCK_CERTS = [
  { id: 'cert-001', subject: 'ABEO SOFTWARE CO., LTD', issuer: 'VNPT-CA',    serial: '01:AB:CD:EF:23:45:67:89', validFrom: '2023-01-15', validTo: '2026-01-15', status: 'valid' },
  { id: 'cert-002', subject: 'ABEO SOFTWARE CO., LTD', issuer: 'VIETTEL-CA', serial: '02:FE:DC:BA:98:76:54:32', validFrom: '2022-06-01', validTo: '2025-06-01', status: 'expiring' },
]

const fmtNum = n => Number(n || 0).toLocaleString('vi-VN')
const fmt    = (n, cur = 'VND') => fmtNum(n) + (cur === 'VND' ? ' ₫' : ' ' + cur)

function getTotal(inv) {
  if (inv.totalGrossAmount != null) return inv.totalGrossAmount
  return (inv.items || []).reduce((s, it) =>
    s + (it.netAmount != null ? it.netAmount + it.taxAmount : it.qty * it.unitPrice * (1 + it.vatRate / 100)), 0)
}

// ── Step indicator ─────────────────────────────────────────────────────────
function StepBar({ step }) {
  const steps = [
    { key: 'select',     label: '1. Chứng thư & PIN' },
    { key: 'processing', label: '2. Đang ký số' },
    { key: 'done',       label: '3. Kết quả' },
  ]
  return (
    <div className="flex border-b border-slate-100 dark:border-slate-700">
      {steps.map(s => (
        <div key={s.key} className={`flex-1 text-center py-2.5 text-xs font-medium border-b-2 transition-colors ${
          step === s.key
            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
            : step === 'done' || (step === 'processing' && s.key === 'select')
              ? 'border-slate-300 text-slate-400'
              : 'border-transparent text-slate-400'
        }`}>{s.label}</div>
      ))}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export default function BulkSignModal({ invoices, onClose, onComplete }) {
  const [step, setStep]               = useState('select')
  const [selectedCert, setSelectedCert] = useState(MOCK_CERTS[0].id)
  const [pin, setPin]                 = useState('')
  const [pinError, setPinError]       = useState('')
  const [currentIdx, setCurrentIdx]   = useState(0)
  const [results, setResults]         = useState([])
  const addNotification = useNotificationStore(s => s.add)

  const cert     = MOCK_CERTS.find(c => c.id === selectedCert)
  const daysLeft = cert ? Math.ceil((new Date(cert.validTo) - new Date()) / 86400000) : 0

  const handleStart = () => {
    if (!pin || pin.length < 4) { setPinError('PIN phải có ít nhất 4 ký tự'); return }
    setPinError('')
    runBatch()
  }

  const runBatch = async () => {
    setStep('processing')
    const acc = []
    for (let i = 0; i < invoices.length; i++) {
      setCurrentIdx(i)
      const inv = invoices[i]
      try {
        await checkAlreadyIssued(inv.sapBillingDoc)
        await new Promise(r => setTimeout(r, 1200)) // simulate signing
        const yr2          = String(new Date().getFullYear()).slice(-2)
        const mockSeries   = `C${yr2}T`
        const mockNo       = String(Date.now()).slice(-6)
        const taxCode      = `${new Date().getFullYear()}${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}VN`
        const items        = inv.items || []
        const subtotal     = items.reduce((s, it) => s + (it.netAmount ?? it.qty * it.unitPrice), 0)
        const vatTotal     = items.reduce((s, it) => s + (it.taxAmount ?? it.qty * it.unitPrice * (it.vatRate / 100)), 0)
        const total        = inv.totalGrossAmount ?? (subtotal + vatTotal)

        await saveIssuedInvoice({
          billingDoc:              inv.sapBillingDoc,
          billingDocType:          inv.billingDocType,
          issueDate:               inv.issueDate,
          dueDate:                 inv.dueDate,
          customerName:            inv.customer?.name,
          customerTaxCode:         inv.customer?.taxCode,
          customerCode:            inv.customer?.code,
          customerAddress:         inv.customer?.address,
          paymentMethod:           inv.paymentMethod,
          deliveryRef:             inv.deliveryRef,
          netAmount:               subtotal,
          taxAmount:               vatTotal,
          totalAmount:             total,
          currency:                inv.currency,
          viettelInvoiceNo:        mockNo,
          viettelSeries:           mockSeries,
          viettelTaxAuthorityCode: taxCode,
          items,
        })

        addNotification({
          type: 'invoice', variant: 'success',
          title: `E-Invoice Issued · ${inv.sapBillingDoc}`,
          body:  `${inv.customer?.name || '—'} · ${fmt(total, inv.currency)}`,
        })
        acc.push({ inv, status: 'success', total })
      } catch (e) {
        acc.push({ inv, status: 'error', error: e.message })
      }
      setResults([...acc])
    }
    setStep('done')
  }

  const successCount = results.filter(r => r.status === 'success').length
  const errorCount   = results.filter(r => r.status === 'error').length
  const pct          = invoices.length ? Math.round((results.length / invoices.length) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <div className="text-white font-semibold text-sm">Ký số hàng loạt</div>
            <div className="text-blue-200 text-xs">{invoices.length} hóa đơn</div>
          </div>
          {step !== 'processing' && (
            <button onClick={onClose} className="ml-auto p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors">
              <X size={16} />
            </button>
          )}
        </div>

        <StepBar step={step} />

        {/* ── Step 1: Select cert + PIN ── */}
        {step === 'select' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Invoice list preview */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Danh sách hóa đơn ({invoices.length})
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl divide-y divide-slate-100 dark:divide-slate-700 max-h-36 overflow-y-auto">
                {invoices.map((inv, i) => (
                  <div key={inv.sapBillingDoc} className="flex items-center gap-2.5 px-3 py-2 text-xs">
                    <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-500 text-[9px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 shrink-0">{inv.sapBillingDoc}</span>
                    <span className="text-slate-500 truncate flex-1">{inv.customer?.name || '—'}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200 shrink-0">{fmt(getTotal(inv), inv.currency)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cert selection */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Chứng thư số</div>
              <div className="space-y-2">
                {MOCK_CERTS.map(c => (
                  <label key={c.id} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                    selectedCert === c.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'
                  }`}>
                    <input type="radio" name="cert" value={c.id} checked={selectedCert === c.id}
                      onChange={() => setSelectedCert(c.id)} className="mt-0.5 accent-blue-600" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">{c.subject}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          c.status === 'valid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {c.status === 'valid' ? '● Còn hiệu lực' : '⚠ Sắp hết hạn'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">CA: <span className="font-medium">{c.issuer}</span> · {c.serial.slice(0, 14)}...</div>
                      <div className="text-[11px] text-slate-400">{c.validFrom} → {c.validTo}
                        {c.status === 'expiring' && <span className="text-yellow-600 ml-1">({daysLeft} ngày)</span>}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* PIN */}
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                <KeyRound size={12} /> PIN / Mật khẩu token
              </label>
              <input
                type="password" value={pin}
                onChange={e => { setPin(e.target.value); setPinError('') }}
                placeholder="Nhập PIN chứng thư số..."
                onKeyDown={e => e.key === 'Enter' && handleStart()}
                className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {pinError && (
                <div className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle size={11} /> {pinError}
                </div>
              )}
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 text-xs text-amber-800 dark:text-amber-300 flex gap-2">
              <AlertCircle size={13} className="shrink-0 mt-0.5" />
              Sau khi xác nhận, tất cả hóa đơn sẽ được ký số, gửi CQT và lưu vào hệ thống. Không thể hoàn tác.
            </div>
          </div>
        )}

        {/* ── Step 2: Processing ── */}
        {step === 'processing' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Progress header */}
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{pct}%</div>
              <div className="text-sm text-slate-500">
                Đang xử lý {Math.min(currentIdx + 1, invoices.length)} / {invoices.length} hóa đơn
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Current invoice being processed */}
            {invoices[currentIdx] && results.length < invoices.length && (
              <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
                <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">
                    {invoices[currentIdx].sapBillingDoc}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {invoices[currentIdx].customer?.name}
                  </div>
                </div>
                <div className="ml-auto text-[11px] text-blue-500 font-medium whitespace-nowrap">Đang ký số...</div>
              </div>
            )}

            {/* Completed so far */}
            {results.length > 0 && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {[...results].reverse().map(r => (
                  <div key={r.inv.sapBillingDoc} className={`flex items-center gap-2.5 text-xs px-3 py-2 rounded-lg ${
                    r.status === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/10' : 'bg-red-50 dark:bg-red-900/10'
                  }`}>
                    {r.status === 'success'
                      ? <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                      : <XCircle     size={13} className="text-red-500 shrink-0" />}
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{r.inv.sapBillingDoc}</span>
                    <span className="text-slate-500 truncate flex-1">{r.inv.customer?.name}</span>
                    {r.status === 'success'
                      ? <span className="text-emerald-600 font-semibold shrink-0">{fmt(r.total, r.inv.currency)}</span>
                      : <span className="text-red-500 shrink-0 truncate max-w-[120px]">{r.error}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Done ── */}
        {step === 'done' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Summary banner */}
            <div className={`rounded-2xl p-5 text-center ${
              errorCount === 0
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
            }`}>
              <div className={`text-3xl font-bold ${errorCount === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {successCount}/{invoices.length}
              </div>
              <div className={`text-sm font-semibold mt-1 ${errorCount === 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                {errorCount === 0
                  ? 'Tất cả hóa đơn đã ký số thành công'
                  : `${successCount} thành công · ${errorCount} lỗi`}
              </div>
            </div>

            {/* Results list */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {results.map(r => (
                <div key={r.inv.sapBillingDoc} className={`flex items-center gap-2.5 text-xs px-3 py-2.5 rounded-xl ${
                  r.status === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/10' : 'bg-red-50 dark:bg-red-900/10'
                }`}>
                  {r.status === 'success'
                    ? <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    : <XCircle     size={14} className="text-red-500 shrink-0" />}
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 shrink-0">{r.inv.sapBillingDoc}</span>
                  <span className="text-slate-500 truncate flex-1">{r.inv.customer?.name}</span>
                  {r.status === 'success'
                    ? <span className="font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">{fmt(r.total, r.inv.currency)}</span>
                    : <span className="text-red-500 shrink-0">{r.error}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2 shrink-0">
          {step === 'select' && (
            <>
              <button onClick={onClose}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                Hủy
              </button>
              <button onClick={handleStart}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors shadow-sm cursor-pointer">
                <Zap size={14} /> Ký {invoices.length} hóa đơn
              </button>
            </>
          )}
          {step === 'processing' && (
            <div className="text-xs text-slate-400 flex items-center gap-2 py-1">
              <div className="w-3 h-3 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" />
              Vui lòng không đóng cửa sổ...
            </div>
          )}
          {step === 'done' && (
            <button onClick={() => onComplete(results)}
              className="px-5 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors cursor-pointer">
              Đóng
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
