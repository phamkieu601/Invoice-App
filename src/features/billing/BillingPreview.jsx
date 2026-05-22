import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, Printer, ShieldCheck, KeyRound, CheckCircle2,
  AlertCircle, Mail, MailCheck, Paperclip, Send,
} from 'lucide-react'
import { useCompanyStore } from '../../store/companyStore'
import { saveIssuedInvoice, checkAlreadyIssued, cancelByDeliveryRef, updateInvoiceStatus, setMailSent } from '../../services/issuedInvoiceService'
import { injectMockS1 } from '../../services/sap/invoiceService'
import { toast } from '../../store/toastStore'
import Topbar from '../../components/layout/Topbar'
import Button from '../../components/ui/Button'
import { useT } from '../../i18n'
import { useNotificationStore } from '../../store/notificationStore'

// ── Helpers ────────────────────────────────────────────────────────────────
const fmtNum = n => Number(n || 0).toLocaleString('vi-VN')
const fmt    = (n, cur = 'VND') => fmtNum(n) + (cur === 'VND' ? ' ₫' : ' ' + cur)

function formatDate(str) {
  if (!str) return ''
  const [y, m, d] = str.split('-')
  if (!d) return str
  return `Ngày ${d} tháng ${m} năm ${y}`
}

const UNITS = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']
const TENS  = ['', 'mười', 'hai mươi', 'ba mươi', 'bốn mươi', 'năm mươi', 'sáu mươi', 'bảy mươi', 'tám mươi', 'chín mươi']
function readThree(n) {
  if (n === 0) return ''
  const h = Math.floor(n / 100), t = Math.floor((n % 100) / 10), u = n % 10
  let s = h > 0 ? UNITS[h] + ' trăm' : ''
  if (t === 0 && u > 0) s += (h > 0 ? ' lẻ ' : '') + UNITS[u]
  else if (t === 1) { s += (s ? ' ' : '') + 'mười'; if (u === 5) s += ' lăm'; else if (u > 0) s += ' ' + UNITS[u] }
  else if (t > 1) { s += (s ? ' ' : '') + TENS[t]; if (u === 1) s += ' mốt'; else if (u === 5) s += ' lăm'; else if (u > 0) s += ' ' + UNITS[u] }
  return s.trim()
}
function numberToWords(n) {
  if (!n) return 'Không đồng'
  const b = Math.floor(n / 1e9), m = Math.floor((n % 1e9) / 1e6), k = Math.floor((n % 1e6) / 1e3), r = n % 1e3
  const parts = []
  if (b > 0) parts.push(readThree(b) + ' tỷ')
  if (m > 0) parts.push(readThree(m) + ' triệu')
  if (k > 0) parts.push(readThree(k) + ' nghìn')
  if (r > 0) parts.push(readThree(r))
  const res = parts.join(' ')
  return res.charAt(0).toUpperCase() + res.slice(1) + ' đồng chẵn.'
}

const thStyle = { border: '1px solid #555', padding: '4px 6px', fontWeight: 'bold', backgroundColor: '#f0f0f0' }
const tdStyle = { border: '1px solid #999', padding: '4px 6px' }

// ── Mock certs (same as InvoicePreview) ────────────────────────────────────
const MOCK_CERTS = [
  { id: 'cert-001', subject: 'ABEO SOFTWARE CO., LTD', issuer: 'VNPT-CA',    serial: '01:AB:CD:EF:23:45:67:89', validFrom: '2024-01-15', validTo: '2027-01-15', status: 'valid' },
  { id: 'cert-002', subject: 'ABEO SOFTWARE CO., LTD', issuer: 'VIETTEL-CA', serial: '02:FE:DC:BA:98:76:54:32', validFrom: '2022-06-01', validTo: '2025-06-01', status: 'expired' },
]

// ── Signing Modal ──────────────────────────────────────────────────────────
function SigningModal({ inv, total, seller, onClose, onConfirm }) {
  const [selectedCert, setSelectedCert] = useState(MOCK_CERTS[0].id)
  const [pin, setPin]           = useState('')
  const [pinError, setPinError] = useState('')
  const [pinWarning, setPinWarning] = useState('')
  const [failCount, setFailCount]   = useState(0)
  const [locked, setLocked]         = useState(false)

  const [step, setStep]         = useState('select') // select | confirm | signing

  const cert = MOCK_CERTS.find(c => c.id === selectedCert)
  const daysLeft = cert ? Math.ceil((new Date(cert.validTo) - new Date()) / 86400000) : 0

  const CORRECT_PIN = '1234'
  const MAX_ATTEMPTS = 3

  const handleNext = () => {
    if (locked) return
    if (!pin || pin.length < 4) { setPinError('PIN phải có ít nhất 4 ký tự'); return }
    if (pin !== CORRECT_PIN) {
      const next = failCount + 1
      setFailCount(next)
      setPin('')
      if (next >= MAX_ATTEMPTS) {
        setLocked(true)
        setPinError('')
        setPinWarning('')
        return
      }
      const remaining = MAX_ATTEMPTS - next
      if (remaining === 1) {
        setPinWarning(`🚨 Cảnh báo nghiêm trọng: Còn ${remaining} lần thử. Token sẽ bị khóa nếu nhập sai thêm!`)
      } else if (remaining === 2) {
        setPinWarning(`⚠️ Cảnh báo: PIN không đúng. Còn ${remaining} lần thử.`)
      } else {
        setPinWarning('')
      }
      setPinError('PIN không đúng. Vui lòng thử lại.')
      return
    }
    setPinError('')
    setPinWarning('')
    setStep('confirm')
  }

  const handleSign = async () => {
    setStep('signing')
    await new Promise(r => setTimeout(r, 1800))

    if (cert?.status === 'expired' || new Date(cert?.validTo) < new Date()) {
      onConfirm({ cert, error: `Chứng thư số đã hết hạn (${cert.validTo}). Không thể ký số.` })
      return
    }
    onConfirm({ cert })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm no-print">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <ShieldCheck size={18} className="text-white" />
          </div>
          <div>
            <div className="text-white font-semibold text-sm">Ký số hóa đơn điện tử</div>
            <div className="text-blue-200 text-xs font-mono">{inv.sapBillingDoc}</div>
          </div>
          {step !== 'signing' && (
            <button onClick={onClose} className="ml-auto text-white/70 hover:text-white text-xl leading-none">×</button>
          )}
        </div>

        {/* Steps */}
        <div className="flex border-b border-slate-100 dark:border-slate-700">
          {[{ key: 'select', label: '1. Chọn chứng thư' }, { key: 'confirm', label: '2. Xác nhận ký' }].map(s => (
            <div key={s.key} className={`flex-1 text-center py-2.5 text-xs font-medium border-b-2 transition-colors ${
              step === s.key || (step === 'signing' && s.key === 'confirm')
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-400'
            }`}>{s.label}</div>
          ))}
        </div>

        <div className="p-6">
          {/* Step 1 */}
          {step === 'select' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 block">Chứng thư số (USB Token / HSM)</label>
                <div className="space-y-2">
                  {MOCK_CERTS.map(c => (
                    <label key={c.id} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                      selectedCert === c.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'
                    }`}>
                      <input type="radio" name="cert" value={c.id} checked={selectedCert === c.id} onChange={() => setSelectedCert(c.id)} className="mt-0.5 accent-blue-600" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">{c.subject}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            c.status === 'valid' ? 'bg-green-100 text-green-700'
                            : c.status === 'expired' ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {c.status === 'valid' ? '● Còn hiệu lực' : c.status === 'expired' ? '✕ Đã hết hạn' : '⚠ Sắp hết hạn'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">CA: <span className="font-medium">{c.issuer}</span> · {c.serial.slice(0, 14)}...</div>
                        <div className="text-[11px] text-slate-400">{c.validFrom} → {c.validTo}{c.status === 'expiring' && <span className="text-yellow-600 ml-1">({daysLeft} ngày)</span>}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 block">
                  <KeyRound size={12} className="inline mr-1" />PIN / Mật khẩu token
                </label>
                {locked ? (
                  <div className="w-full rounded-lg px-4 py-3 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle size={14} /> Token đã bị khóa do nhập sai PIN {MAX_ATTEMPTS} lần. Vui lòng liên hệ quản trị viên để mở khóa.
                  </div>
                ) : (
                  <>
                    <input type="password" value={pin} onChange={e => { setPin(e.target.value); setPinError(''); setPinWarning('') }}
                      placeholder="Nhập PIN chứng thư số..."
                      className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyDown={e => e.key === 'Enter' && handleNext()} />
                    {pinError && <div className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={11} />{pinError}</div>}
                    {pinWarning && <div className={`text-xs mt-1.5 px-3 py-2 rounded-lg flex items-start gap-1.5 ${failCount >= 4 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-semibold' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'}`}>{pinWarning}</div>}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Step 2 + signing */}
          {(step === 'confirm' || step === 'signing') && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-xs space-y-2">
                <div className="font-semibold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-blue-500" /> Thông tin xác nhận ký
                </div>
                {[
                  { label: 'Billing Document', value: inv.sapBillingDoc },
                  { label: 'Khách hàng',       value: inv.customer?.name || '—' },
                  { label: 'Tổng tiền',         value: fmt(total, inv.currency) },
                  { label: 'Ngày ký',           value: new Date().toLocaleDateString('vi-VN') },
                  { label: 'Chứng thư',         value: `${cert?.subject} (${cert?.issuer})` },
                  { label: 'Serial',            value: cert?.serial },
                ].map(r => (
                  <div key={r.label} className="flex justify-between gap-4">
                    <span className="text-slate-500 dark:text-slate-400 shrink-0">{r.label}</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 text-right">{r.value}</span>
                  </div>
                ))}
              </div>

              {step === 'signing' && (
                <div className="flex flex-col items-center gap-3 py-3">
                  <div className="w-10 h-10 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
                  <div className="text-sm text-slate-600 dark:text-slate-300 font-medium">Đang ký số & gửi CQT...</div>
                  <div className="text-xs text-slate-400">Vui lòng không đóng cửa sổ</div>
                </div>
              )}

              {step === 'confirm' && (
                <>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-3 py-2 text-xs text-yellow-800 dark:text-yellow-300 flex gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    Sau khi ký số, hóa đơn sẽ được gửi CQT và lưu vào hệ thống. Không thể hoàn tác.
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {step !== 'signing' && (
          <div className="px-6 pb-5 flex gap-3 justify-end">
            <button onClick={step === 'confirm' ? () => setStep('select') : onClose}
              className="px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer">
              {step === 'confirm' ? 'Quay lại' : 'Hủy'}
            </button>
            <button onClick={step === 'select' ? handleNext : handleSign}
              disabled={step === 'select' && locked}
              className="px-5 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              <ShieldCheck size={14} />
              {step === 'select' ? 'Tiếp theo' : 'Xác nhận ký số'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Mail Modal ─────────────────────────────────────────────────────────────
function MailModal({ inv, total, taxAuthorityCode, seller, onClose, onSent }) {
  const [to, setTo]   = useState(inv.customer?.email || '')
  const [err, setErr] = useState('')

  const subject = `Hóa đơn điện tử ${inv.sapBillingDoc} - ${seller.name}`
  const body = [
    `Kính gửi Quý khách hàng ${inv.customer?.name || ''},`,
    '',
    `Chúng tôi xin gửi hóa đơn giá trị gia tăng điện tử như sau:`,
    `  - Số hóa đơn     : ${inv.sapBillingDoc}`,
    `  - Ngày lập       : ${inv.issueDate || ''}`,
    `  - Tổng tiền      : ${Number(total || 0).toLocaleString('vi-VN')} ${inv.currency || 'VND'}`,
    `  - Mã cơ quan thuế: ${taxAuthorityCode}`,
    '',
    `Trân trọng,`,
    seller.name,
    seller.email || '',
    seller.phone || '',
  ].join('\n')

  const handleSend = () => {
    if (!to || !/\S+@\S+\.\S+/.test(to)) { setErr('Vui lòng nhập email hợp lệ'); return }
    window.open(`mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
    onSent?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <Mail size={18} className="text-white" />
          </div>
          <div>
            <div className="text-white font-semibold text-sm">Gửi hóa đơn cho khách hàng</div>
            <div className="text-blue-200 text-xs font-mono">{inv.sapBillingDoc}</div>
          </div>
          <button onClick={onClose} className="ml-auto text-white/70 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 block">Email khách hàng</label>
            <input
              type="email"
              value={to}
              onChange={e => { setTo(e.target.value); setErr('') }}
              placeholder="example@company.com"
              className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              autoFocus
            />
            {err && <div className="text-xs text-red-500 mt-1">{err}</div>}
          </div>

          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 text-xs space-y-1 text-slate-600 dark:text-slate-300">
            <div><span className="font-semibold">Tiêu đề:</span> {subject}</div>
            <div><span className="font-semibold">Khách hàng:</span> {inv.customer?.name || '—'}</div>
            <div><span className="font-semibold">Số tiền:</span> {Number(total || 0).toLocaleString('vi-VN')} {inv.currency || 'VND'}</div>
          </div>

          <div className="text-[11px] text-slate-400 flex items-start gap-1.5">
            <Paperclip size={11} className="shrink-0 mt-0.5" />
            Sẽ mở ứng dụng mail mặc định với nội dung soạn sẵn. Đính kèm PDF thủ công nếu cần.
          </div>
        </div>

        <div className="px-6 pb-5 flex gap-3 justify-end">
          <button onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer">
            Hủy
          </button>
          <button onClick={handleSend}
            className="px-5 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors flex items-center gap-2 cursor-pointer">
            <Send size={14} /> Mở Mail
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function BillingPreview() {
  const { billingDoc } = useParams()
  const navigate       = useNavigate()
  const location       = useLocation()
  const company        = useCompanyStore()
  const t              = useT()

  // Invoice data passed from InvoiceList via location.state
  const inv               = location.state?.inv
  const invoiceMode       = location.state?.invoiceMode       // 'replacement' | 'adjustment' | undefined
  const originalBillingDoc = location.state?.originalBillingDoc
  const s1BillingDoc      = location.state?.s1BillingDoc

  const SELLER = {
    name:       company.companyName,
    taxCode:    company.taxCode,
    address:    company.address,
    bankAccount:company.bankAccount,
    bankName:   `${company.bankName}${company.bankBranch ? ' — ' + company.bankBranch : ''}`,
    phone:      company.phone,
    email:      company.email,
    website:    company.website,
    legalRep:   company.legalRep,
    legalRepTitle: company.legalRepTitle,
  }

  const invoiceCfg = (() => {
    try { return { seriesPrefix: 'C', taxRate: '10', signatureLabel: 'Người ký hóa đơn', invoiceNote: 'Đề nghị thanh toán theo thông tin ngân hàng trên hóa đơn.', requireApproval: false, ...JSON.parse(localStorage.getItem('invoiceConfig') || '{}') } }
    catch { return { seriesPrefix: 'C', taxRate: '10', signatureLabel: 'Người ký hóa đơn', invoiceNote: 'Đề nghị thanh toán theo thông tin ngân hàng trên hóa đơn.', requireApproval: false } }
  })()

  const isS1         = inv?.billingDocType === 'S1'
  const isReplacement = invoiceMode === 'replacement'
  const isAdjustment  = invoiceMode === 'adjustment'
  // New virtual billingDoc so it doesn't conflict with the original issued record
  const virtualBillingDoc = isReplacement
    ? `${originalBillingDoc}-REP`
    : isAdjustment
      ? `${originalBillingDoc}-ADJ`
      : null

  const alreadyIssued = location.state?.issued === true
  const bulkQueue     = location.state?.bulkQueue || []
  const addNotification = useNotificationStore(s => s.add)

  useEffect(() => {
    if (!isS1) return
    if (inv?.cancelledBillingDoc) updateInvoiceStatus(inv.cancelledBillingDoc, 'cancelled').catch(() => {})
    updateInvoiceStatus(inv.sapBillingDoc, 'cancelled').catch(() => {})
  }, [])

  const [showSignModal, setShowSignModal] = useState(false)
  const [showMailModal, setShowMailModal] = useState(false)
  const [issued, setIssued]               = useState(alreadyIssued)
  const [mailSentAt, setMailSentAt]       = useState(null)

  useEffect(() => {
    if (!inv?.sapBillingDoc) return
    import('../../services/issuedInvoiceService').then(({ getIssuedInvoices }) =>
      getIssuedInvoices({ search: inv.sapBillingDoc }).then(rows => {
        const rec = rows.find(r => r.billing_doc === inv.sapBillingDoc)
        if (rec?.mail_sent_at) setMailSentAt(rec.mail_sent_at)
      }).catch(() => {})
    )
  }, [inv?.sapBillingDoc])
  const [taxAuthorityCode]                = useState(
    location.state?.taxAuthorityCode ||
    `${new Date().getFullYear()}${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}VN`
  )

  if (!inv) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 p-12">
      <div className="text-slate-300 dark:text-slate-600 text-5xl">📄</div>
      <div className="text-slate-500 dark:text-slate-400 font-medium">{t('preview.notFound')}</div>
      <button onClick={() => navigate('/invoices')} className="text-xs text-blue-600 hover:underline cursor-pointer">
        {t('preview.back')}
      </button>
    </div>
  )

  // Compute totals
  const items = inv.items || []
  const subtotal = items.reduce((s, it) => s + (it.netAmount ?? it.qty * it.unitPrice), 0)
  const vatTotal = items.reduce((s, it) => s + (it.taxAmount ?? it.qty * it.unitPrice * (it.vatRate / 100)), 0)
  const total    = inv.totalGrossAmount ?? (subtotal + vatTotal)

  const handleSignConfirmed = async ({ cert, error: certError }) => {
    setShowSignModal(false)
    const yr2 = String(new Date().getFullYear()).slice(-2)
    const mockSeries = `${invoiceCfg.seriesPrefix}${yr2}T`
    const mockInvoiceNo = String(Date.now()).slice(-6)
    const saveBillingDoc = virtualBillingDoc || inv.sapBillingDoc
    const invoicePayload = {
      billingDoc:              saveBillingDoc,
      billingDocType:          isReplacement ? 'replacement' : isAdjustment ? 'adjustment' : inv.billingDocType,
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
      viettelInvoiceNo:        mockInvoiceNo,
      viettelSeries:           mockSeries,
      viettelTaxAuthorityCode: taxAuthorityCode,
      items,
    }
    try {
      if (certError) throw new Error(certError)
      if (!invoiceMode) await checkAlreadyIssued(inv.sapBillingDoc)
      await saveIssuedInvoice({ ...invoicePayload, status: 'issued' })
      // Thay thế: HD gốc vô hiệu → cancelled
      // Điều chỉnh: HD gốc vẫn hợp lệ → giữ nguyên
      if (isReplacement && originalBillingDoc) {
        await updateInvoiceStatus(originalBillingDoc, 'cancelled').catch(() => {})
      }
      setIssued(true)
      const modeLabel = isReplacement ? 'thay thế' : isAdjustment ? 'điều chỉnh' : ''
      toast.success(`Hóa đơn ${modeLabel ? modeLabel + ' ' : ''}${saveBillingDoc} đã ký số và gửi CQT thành công!`)
      addNotification({
        type:    'invoice',
        variant: 'success',
        title:   `E-Invoice Issued · ${inv.sapBillingDoc}`,
        body:    `${inv.customer?.name || '—'} · ${fmtNum(total)} ${inv.currency || 'VND'}`,
      })
    } catch (e) {
      try {
        await saveIssuedInvoice({ ...invoicePayload, status: 'signing_failed' })
        toast.error('Ký số thất bại — ' + e.message)
      } catch (saveErr) {
        toast.error('Ký số thất bại và không thể lưu trạng thái — ' + saveErr.message)
      }
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={isReplacement ? `Hóa đơn thay thế · ${originalBillingDoc}` : isAdjustment ? `Hóa đơn điều chỉnh · ${originalBillingDoc}` : `Billing Document · ${inv.sapBillingDoc}`}
        actions={
          <div className="flex items-center gap-2 no-print">
            <Button icon={ArrowLeft} size="sm" variant="ghost" onClick={() => navigate(issued ? '/issued-invoices' : '/invoices')}>
              {t('preview.back')}
            </Button>
            <Button icon={Printer} size="sm" variant="secondary" onClick={() => window.print()}>
              {t('preview.print')}
            </Button>
            {isS1 && (
              <span className="text-xs text-red-600 font-medium px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">Chứng từ hủy (S1) — Không phát hành HĐĐT</span>
            )}
            {!isS1 && !issued && !invoiceCfg.requireApproval && (
              <Button icon={ShieldCheck} size="sm" variant="success" onClick={() => setShowSignModal(true)}>
                {t('preview.issue')}
              </Button>
            )}
            {!isS1 && !issued && invoiceCfg.requireApproval && (
              <span className="text-xs text-amber-600 font-medium px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">Chờ duyệt trước khi ký</span>
            )}
            {issued && !invoiceMode && (
              <button
                onClick={() => { injectMockS1(inv.sapBillingDoc, inv); navigate('/invoices') }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors cursor-pointer"
                title="[Test] Tạo S1 giả để test luồng đảo phiếu"
              >
                [Test] Inject S1
              </button>
            )}
            {issued && (
              <button
                onClick={() => setShowMailModal(true)}
                title={mailSentAt ? `Đã gửi: ${new Date(mailSentAt).toLocaleString('vi-VN')}` : 'Chưa gửi email'}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  mailSentAt
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {mailSentAt ? <><MailCheck size={13} /> Đã gửi mail</> : <><Mail size={13} /> Gửi Email</>}
              </button>
            )}
            {issued && bulkQueue.length > 0 && (
              <Button icon={ArrowRight} size="sm" variant="primary"
                onClick={() => navigate(`/billing-preview/${bulkQueue[0].sapBillingDoc}`, { state: { inv: bulkQueue[0], bulkQueue: bulkQueue.slice(1) } })}>
                Next · {bulkQueue[0].sapBillingDoc} ({bulkQueue.length} left)
              </Button>
            )}
          </div>
        }
      />


      <div className="flex-1 overflow-auto p-6 bg-slate-100 dark:bg-slate-900">
        <div id="invoice-doc" className="max-w-4xl mx-auto bg-white">
          <div id="invoice-inner" style={{ border: '4px solid #2d6a2d', padding: '4px', fontSize: '12px', fontFamily: 'Arial, sans-serif' }}>
          <div style={{ border: '1.5px solid #2d6a2d', padding: '20px 24px', position: 'relative', overflow: 'hidden' }}>

            {/* Watermark — only before issue */}
            {!issued && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 10 }}>
                <span style={{ fontSize: '100px', fontWeight: 900, color: 'rgba(239,68,68,0.08)', transform: 'rotate(-35deg)', letterSpacing: '0.05em', userSelect: 'none', whiteSpace: 'nowrap' }}>
                  CHỜ KÝ
                </span>
              </div>
            )}

            {/* ── HEADER ── */}
            <div className="flex items-start justify-between mb-1">
              <div style={{ width: '180px' }}>
                <div className="font-black text-3xl leading-none" style={{ color: '#e53012', fontFamily: 'Arial, sans-serif' }}>viettel</div>
                <div className="text-xs text-slate-500 mt-1">Theo cách của bạn</div>
              </div>
              <div className="text-center flex-1 px-4">
                <div className="flex items-center justify-center gap-2">
                  <span className="font-bold text-xl tracking-wide text-black" style={{ whiteSpace: 'nowrap' }}>
                    {isReplacement ? 'HÓA ĐƠN THAY THẾ' : isAdjustment ? 'HÓA ĐƠN ĐIỀU CHỈNH' : 'HÓA ĐƠN GIÁ TRỊ GIA TĂNG'}
                  </span>
                </div>
                <div className="text-xs text-slate-600 mt-0.5">{formatDate(inv.issueDate)}</div>
                {(isReplacement || isAdjustment) && (
                  <div className="text-xs mt-1 text-red-700 font-medium">
                    {isReplacement ? 'Thay thế hóa đơn' : 'Điều chỉnh hóa đơn'}{' '}
                    <span className="font-mono font-bold">{originalBillingDoc}</span>
                    {s1BillingDoc && <span className="text-slate-500 font-normal"> (S1: {s1BillingDoc})</span>}
                  </div>
                )}
                <div className="text-xs mt-1">
                  <span className="font-semibold">Mã cơ quan thuế: </span>
                  <span style={{ color: issued ? '#000' : '#94a3b8', fontStyle: issued ? 'normal' : 'italic' }}>
                    {issued ? taxAuthorityCode : '(cấp sau khi ký số)'}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Billing Doc: <span className="font-semibold font-mono text-slate-700">{inv.sapBillingDoc}</span></div>
              </div>
              <div style={{ width: '180px' }} className="text-right text-xs">
                <table className="ml-auto text-xs">
                  <tbody>
                    <tr><td className="text-slate-600 pr-2">Ký hiệu:</td><td className="font-bold text-black">{invoiceCfg.seriesPrefix}{new Date().getFullYear().toString().slice(-2)}T</td></tr>
                    <tr><td className="text-slate-600 pr-2">Số:</td>
                      <td className="font-bold" style={{ color: issued ? '#e53012' : '#94a3b8' }}>{issued ? '001' : '---'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <hr style={{ borderColor: '#2d6a2d', borderWidth: '1px', margin: '8px 0' }} />

            {/* Seller */}
            <div className="text-xs mb-1">
              <div><span className="font-bold">Tên người bán: </span><span className="font-bold uppercase">{SELLER.name || 'ABEO SOFTWARE CO., LTD'}</span></div>
              <div><span className="font-bold">Mã số thuế: </span>{SELLER.taxCode || '—'}</div>
              <div><span className="font-bold">Địa chỉ: </span>{SELLER.address || '—'}</div>
              <div><span className="font-bold">Số TK: </span>{SELLER.bankAccount || '—'} — <span className="font-semibold">{SELLER.bankName || '—'}</span></div>
              <div className="flex gap-6">
                <div><span className="font-bold">Điện thoại: </span>{SELLER.phone || '—'}</div>
                <div><span className="font-bold">Email: </span>{SELLER.email || '—'}</div>
              </div>
            </div>

            <hr style={{ borderColor: '#2d6a2d', borderWidth: '1px', margin: '8px 0' }} />

            {/* Buyer */}
            <div className="text-xs mb-1 space-y-0.5">
              <div><span className="font-bold">Tên đơn vị: </span>{inv.customer?.name || '—'}</div>
              <div className="flex justify-between">
                <div><span className="font-bold">MST: </span>{inv.customer?.taxCode || '—'}</div>
                <div><span className="font-bold">Mã KH: </span><span className="font-mono">{inv.customer?.code || '—'}</span></div>
              </div>
              <div><span className="font-bold">Địa chỉ: </span>{inv.customer?.address || '—'}</div>
              <div className="flex justify-between">
                <div><span className="font-bold">Hình thức thanh toán: </span>{inv.paymentMethod || '—'}</div>
                <div><span className="font-bold">Đồng tiền: </span>{inv.currency || 'VND'}</div>
              </div>
              {inv.deliveryRef && <div><span className="font-bold">Phiếu giao hàng: </span><span className="font-mono">{inv.deliveryRef}</span></div>}
              {inv.dueDate && <div><span className="font-bold">Hạn thanh toán: </span>{inv.dueDate}</div>}
            </div>

            {/* Items table */}
            <table className="w-full text-xs mt-2" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle} className="text-center w-7">STT</th>
                  <th style={thStyle} className="text-center">Tên hàng hóa, dịch vụ</th>
                  <th style={thStyle} className="text-center w-16">Đơn vị</th>
                  <th style={thStyle} className="text-center w-12">Số lượng</th>
                  <th style={thStyle} className="text-center w-24">Đơn giá</th>
                  <th style={thStyle} className="text-center w-24">Thành tiền</th>
                  <th style={thStyle} className="text-center w-14">Thuế suất</th>
                  <th style={thStyle} className="text-center w-24">Tiền thuế GTGT</th>
                </tr>
                <tr>{['1','2','3','4','5','6=4×5','7','8=6×7'].map((n,i) => <td key={i} style={tdStyle} className="text-center text-slate-500">{n}</td>)}</tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const lineNet = it.netAmount  ?? it.qty * it.unitPrice
                  const lineTax = it.taxAmount  ?? lineNet * (it.vatRate / 100)
                  return (
                    <tr key={idx}>
                      <td style={tdStyle} className="text-center">{idx + 1}</td>
                      <td style={tdStyle}>{it.description || it.material || '—'}</td>
                      <td style={tdStyle} className="text-center">{it.unit || '—'}</td>
                      <td style={tdStyle} className="text-right">{it.qty}</td>
                      <td style={tdStyle} className="text-right">{fmtNum(it.unitPrice)}</td>
                      <td style={tdStyle} className="text-right">{fmtNum(lineNet)}</td>
                      <td style={tdStyle} className="text-center">{it.vatRate != null ? `${it.vatRate}%` : '—'}</td>
                      <td style={tdStyle} className="text-right">{fmtNum(lineTax)}</td>
                    </tr>
                  )
                })}
                {Array.from({ length: Math.max(0, 4 - items.length) }).map((_, i) => (
                  <tr key={'e'+i}>{Array(8).fill(0).map((__,j) => <td key={j} style={tdStyle}>&nbsp;</td>)}</tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} style={{ ...tdStyle, fontWeight: 'bold', textAlign: 'right' }}>Cộng tiền hàng:</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtNum(subtotal)}</td>
                  <td colSpan={2} style={tdStyle} />
                </tr>
                <tr>
                  <td colSpan={5} style={{ ...tdStyle, fontWeight: 'bold', textAlign: 'right' }}>Tổng thuế GTGT:</td>
                  <td style={tdStyle} />
                  <td style={tdStyle} />
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtNum(vatTotal)}</td>
                </tr>
                <tr>
                  <td colSpan={5} style={{ ...tdStyle, fontWeight: 'bold', textAlign: 'right' }}>Tổng tiền thanh toán:</td>
                  <td colSpan={3} style={{ ...tdStyle, fontWeight: 'bold', textAlign: 'right', color: '#e53012' }}>{fmtNum(total)}</td>
                </tr>
              </tfoot>
            </table>

            {/* Amount in words */}
            <div className="text-xs mt-2 p-2 bg-slate-50 rounded" style={{ border: '1px solid #e2e8f0' }}>
              <span className="font-bold">Số tiền viết bằng chữ: </span>
              <span className="italic">{numberToWords(total)}</span>
            </div>

            {/* Invoice note */}
            {invoiceCfg.invoiceNote && (
              <div className="text-xs mt-1.5 italic text-slate-500">{invoiceCfg.invoiceNote}</div>
            )}

            {/* Signatures */}
            <div className="flex gap-2 mt-5">
              <div className="flex-1 grid grid-cols-3 gap-3 text-xs text-center">
                {/* Buyer */}
                <div>
                  <div className="font-bold text-[11px]">Người mua hàng</div>
                  <div className="text-slate-400 italic text-[10px]">(Ký điện tử, chữ ký số)</div>
                  <div className="mt-1 h-16 rounded border flex items-center justify-center" style={{ borderStyle: 'dashed', borderColor: '#cbd5e1' }}>
                    <span className="text-slate-300 text-[9px] italic">Chưa ký</span>
                  </div>
                  <div className="mt-1 text-[10px] text-slate-500">{inv.customer?.name || '—'}</div>
                </div>
                {/* CQT */}
                <div>
                  <div className="font-bold text-[11px]">Cơ Quan Thuế</div>
                  <div className="text-slate-400 italic text-[10px]">(Ký điện tử, chữ ký số)</div>
                  <div className="mt-1 h-16 rounded border flex flex-col items-center justify-center gap-0.5"
                    style={{ borderStyle: issued ? 'solid' : 'dashed', borderColor: issued ? '#3b82f6' : '#cbd5e1', background: issued ? '#eff6ff' : 'transparent' }}>
                    {issued
                      ? <><div className="text-blue-600 font-bold text-[10px]">✓ Đã cấp mã</div><div className="text-blue-500 text-[9px] font-mono">{taxAuthorityCode.slice(0, 12)}…</div></>
                      : <span className="text-slate-300 text-[9px] italic">Cấp sau ký số</span>}
                  </div>
                </div>
                {/* Seller */}
                <div>
                  <div className="font-bold text-[11px]">{invoiceCfg.signatureLabel}</div>
                  <div className="text-slate-400 italic text-[10px]">(Ký điện tử, chữ ký số)</div>
                  <div className="mt-1 h-16 rounded border flex flex-col items-center justify-center gap-0.5 px-1"
                    style={{ borderStyle: issued ? 'solid' : 'dashed', borderColor: issued ? '#22c55e' : '#cbd5e1', background: issued ? '#f0fdf4' : 'transparent' }}>
                    {issued
                      ? <><div className="text-green-600 font-bold text-[10px]">✓ Đã ký số</div><div className="text-slate-600 text-[9px] font-semibold text-center leading-tight">{SELLER.name}</div><div className="text-slate-400 text-[9px]">CA: VNPT-CA · {inv.issueDate}</div></>
                      : <span className="text-slate-300 text-[9px] italic">Chưa ký</span>}
                  </div>
                  {issued && <div className="mt-1 text-[10px] text-slate-500">{SELLER.name}</div>}
                </div>
              </div>

              {/* QR — only after issue */}
              {issued && (
                <div className="shrink-0 flex flex-col items-center gap-1 text-[9px] text-slate-500 w-20">
                  <div style={{ width: 72, height: 72, background: '#fff', border: '1px solid #ccc', padding: 3 }}>
                    <svg viewBox="0 0 21 21" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                      <rect x="0" y="0" width="7" height="7" fill="#000"/><rect x="1" y="1" width="5" height="5" fill="#fff"/><rect x="2" y="2" width="3" height="3" fill="#000"/>
                      <rect x="14" y="0" width="7" height="7" fill="#000"/><rect x="15" y="1" width="5" height="5" fill="#fff"/><rect x="16" y="2" width="3" height="3" fill="#000"/>
                      <rect x="0" y="14" width="7" height="7" fill="#000"/><rect x="1" y="15" width="5" height="5" fill="#fff"/><rect x="2" y="16" width="3" height="3" fill="#000"/>
                    </svg>
                  </div>
                  <div className="text-center text-[8px] text-slate-500 leading-tight">Tra cứu<br/>hóa đơn</div>
                </div>
              )}
            </div>

            {/* CQT code bar */}
            {issued && (
              <div className="mt-3 p-2 rounded text-[10px]" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                <div className="flex flex-wrap gap-x-6 gap-y-0.5">
                  <div><span className="font-bold text-blue-700">Mã CQT: </span><span className="font-mono text-blue-800 font-semibold">{taxAuthorityCode}</span></div>
                  <div><span className="font-bold text-blue-700">Billing Doc: </span><span className="font-mono">{inv.sapBillingDoc}</span></div>
                </div>
              </div>
            )}

            <div className="mt-3 text-center" style={{ borderTop: '1px dashed #aaa', paddingTop: '6px' }}>
              <div className="text-[10px] text-slate-400">(Cần kiểm tra, đối chiếu khi lập, giao, nhận hóa đơn)</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Đơn vị cung cấp: <span className="font-semibold">{SELLER.name || 'ABEO SOFTWARE'}</span> · MST: {SELLER.taxCode || '—'}
              </div>
            </div>
          </div>
          </div>{/* #invoice-inner */}
        </div>
      </div>

      {showMailModal && (
        <MailModal
          inv={inv}
          total={total}
          taxAuthorityCode={taxAuthorityCode}
          seller={SELLER}
          onClose={() => setShowMailModal(false)}
          onSent={() => {
            const now = new Date().toISOString()
            setMailSentAt(now)
            setMailSent(inv.sapBillingDoc, now).catch(() => {})
          }}
        />
      )}
      {showSignModal && (
        <SigningModal
          inv={inv}
          total={total}
          seller={SELLER}
          onClose={() => setShowSignModal(false)}
          onConfirm={handleSignConfirmed}
        />
      )}
    </div>
  )
}
