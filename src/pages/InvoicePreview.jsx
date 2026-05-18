import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, Send, XCircle, ShieldCheck, KeyRound, CheckCircle2, AlertCircle, ChevronDown, Mail, Paperclip } from 'lucide-react'
import { useInvoiceStore } from '../store/invoiceStore'
import { useCompanyStore } from '../store/companyStore'
import { calcTotals } from '../services/mockData'
import { toast } from '../store/toastStore'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Topbar from '../components/layout/Topbar'

const EMAILJS_SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const EMAILJS_PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY
const EMAILJS_CONFIGURED  = EMAILJS_SERVICE_ID && EMAILJS_SERVICE_ID !== 'your_service_id'

function EmailModal({ inv, total, seller, onClose }) {
  const [to, setTo] = useState(inv.customer.email || '')
  const [cc, setCc] = useState('')
  const [subject, setSubject] = useState(`Hóa đơn điện tử ${inv.series}/${inv.number} — ${seller.name}`)
  const [body, setBody] = useState(
    `Kính gửi ${inv.customer.name},\n\nVui lòng xem hóa đơn điện tử số ${inv.series}/${inv.number} ngày ${inv.issueDate} với tổng giá trị ${Number(total).toLocaleString('vi-VN')} VNĐ.\n\nMã tra cứu: ${inv.taxAuthorityCode || '(chờ cập nhật)'}\n\nMọi thắc mắc xin liên hệ: ${seller.phone} hoặc ${seller.email}.\n\nTrân trọng,\n${seller.name}`
  )
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSend = async () => {
    if (!to) return
    setError('')
    setSending(true)
    try {
      if (EMAILJS_CONFIGURED) {
        const emailjs = await import('@emailjs/browser')
        await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          {
            to_email:       to,
            cc_email:       cc,
            to_name:        inv.customer.name,
            subject:        subject,
            message:        body,
            invoice_number: `${inv.series}/${inv.number}`,
            invoice_date:   inv.issueDate,
            invoice_total:  Number(total).toLocaleString('vi-VN') + ' VNĐ',
            tax_code:       inv.taxAuthorityCode || '',
            from_name:      seller.name,
            from_email:     seller.email,
            from_phone:     seller.phone,
          },
          EMAILJS_PUBLIC_KEY
        )
      } else {
        // EmailJS chưa cấu hình — giả lập để demo
        await new Promise(r => setTimeout(r, 1500))
      }
      setSent(true)
    } catch (e) {
      setError('Gửi thất bại: ' + (e?.text || e?.message || 'Lỗi không xác định'))
    }
    setSending(false)
  }

  if (sent) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm no-print">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={28} className="text-green-500" />
        </div>
        <div className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">Email đã được gửi!</div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-5">Hóa đơn đã gửi đến <span className="font-semibold text-slate-700 dark:text-slate-200">{to}</span></div>
        <button onClick={onClose} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors">
          Đóng
        </button>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm no-print">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <Mail size={16} className="text-white" />
          </div>
          <div>
            <div className="text-white font-semibold text-sm">Gửi hóa đơn qua Email</div>
            <div className="text-emerald-200 text-xs">{inv.series}/{inv.number} · {inv.customer.name}</div>
          </div>
          <button onClick={onClose} className="ml-auto text-white/70 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-3">
          {/* EmailJS not configured warning */}
          {!EMAILJS_CONFIGURED && (
            <div className="flex gap-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg px-3 py-2 text-xs text-yellow-800 dark:text-yellow-300">
              <AlertCircle size={13} className="shrink-0 mt-0.5" />
              <span>EmailJS chưa cấu hình — email sẽ được giả lập (demo). Xem hướng dẫn cài đặt bên dưới.</span>
            </div>
          )}

          {/* Attachment badge */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2 text-xs">
            <Paperclip size={12} className="text-slate-400" />
            <span className="text-slate-600 dark:text-slate-300 font-medium">
              HoaDon_{inv.series}_{inv.number}.pdf
            </span>
            <span className="ml-auto text-slate-400">PDF · ~120KB</span>
          </div>

          {/* To */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Đến *</label>
            <input value={to} onChange={e => setTo(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="email@khachhang.com" />
          </div>

          {/* CC */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">CC</label>
            <input value={cc} onChange={e => setCc(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="cc@company.com (tùy chọn)" />
          </div>

          {/* Subject */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Tiêu đề</label>
            <input value={subject} onChange={e => setSubject(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>

          {/* Body */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Nội dung</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={6}
              className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
          </div>
        </div>

        {error && (
          <div className="mx-5 flex gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg px-3 py-2 text-xs text-red-700 dark:text-red-300">
            <AlertCircle size={13} className="shrink-0 mt-0.5" />{error}
          </div>
        )}
        <div className="px-5 pb-5 flex gap-3 justify-end">
          <button onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            Hủy
          </button>
          <button onClick={handleSend} disabled={!to || sending}
            className="px-5 py-2 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors disabled:opacity-60 flex items-center gap-2">
            {sending ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Đang gửi...</> : <><Mail size={13} /> Gửi Email</>}
          </button>
        </div>
      </div>
    </div>
  )
}

const MOCK_CERTS = [
  {
    id: 'cert-001',
    subject: 'ABEO SOFTWARE CO., LTD',
    issuer: 'VNPT-CA',
    serial: '01:AB:CD:EF:23:45:67:89',
    validFrom: '2023-01-15',
    validTo: '2026-01-15',
    status: 'valid',
    keyUsage: 'Digital Signature, Non Repudiation',
  },
  {
    id: 'cert-002',
    subject: 'ABEO SOFTWARE CO., LTD',
    issuer: 'VIETTEL-CA',
    serial: '02:FE:DC:BA:98:76:54:32',
    validFrom: '2022-06-01',
    validTo: '2025-06-01',
    status: 'expiring',
    keyUsage: 'Digital Signature',
  },
]

function SigningModal({ inv, total, onClose, onConfirm }) {
  const [selectedCert, setSelectedCert] = useState(MOCK_CERTS[0].id)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [signing, setSigning] = useState(false)
  const [step, setStep] = useState('select') // select | confirm | signing

  const cert = MOCK_CERTS.find(c => c.id === selectedCert)

  const handleNext = () => {
    if (!pin || pin.length < 4) { setPinError('PIN must be at least 4 characters'); return }
    setPinError('')
    setStep('confirm')
  }

  const handleSign = async () => {
    setStep('signing')
    setSigning(true)
    await new Promise(r => setTimeout(r, 1800))
    setSigning(false)
    onConfirm()
  }

  const daysLeft = cert ? Math.ceil((new Date(cert.validTo) - new Date()) / 86400000) : 0

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
            <div className="text-blue-200 text-xs">Invoice {inv.series}/{inv.number}</div>
          </div>
          <button onClick={onClose} className="ml-auto text-white/70 hover:text-white text-xl leading-none">×</button>
        </div>

        {/* Steps indicator */}
        <div className="flex border-b border-slate-100 dark:border-slate-700">
          {[
            { key: 'select', label: '1. Chọn chứng thư' },
            { key: 'confirm', label: '2. Xác nhận ký' },
          ].map((s, i) => (
            <div key={s.key} className={`flex-1 text-center py-2.5 text-xs font-medium border-b-2 transition-colors ${
              step === s.key || (step === 'signing' && s.key === 'confirm')
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : step === 'confirm' && s.key === 'select'
                ? 'border-transparent text-slate-400 dark:text-slate-500'
                : 'border-transparent text-slate-400 dark:text-slate-500'
            }`}>{s.label}</div>
          ))}
        </div>

        <div className="p-6">

          {/* ── Step 1: Select cert + PIN ── */}
          {step === 'select' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 block">
                  Chứng thư số (USB Token / HSM)
                </label>
                <div className="space-y-2">
                  {MOCK_CERTS.map(c => (
                    <label key={c.id} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                      selectedCert === c.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                    }`}>
                      <input type="radio" name="cert" value={c.id} checked={selectedCert === c.id}
                        onChange={() => setSelectedCert(c.id)} className="mt-0.5 accent-blue-600" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">{c.subject}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            c.status === 'valid'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                          }`}>
                            {c.status === 'valid' ? '● Còn hiệu lực' : '⚠ Sắp hết hạn'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          CA: <span className="font-medium">{c.issuer}</span> · Serial: {c.serial.slice(0, 14)}...
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500">
                          Hiệu lực: {c.validFrom} → {c.validTo}
                          {c.status === 'expiring' && <span className="text-yellow-600 dark:text-yellow-400 ml-1">({daysLeft} ngày còn lại)</span>}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 block">
                  <KeyRound size={12} className="inline mr-1" />PIN / Mật khẩu token
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={e => { setPin(e.target.value); setPinError('') }}
                  placeholder="Nhập PIN chứng thư số..."
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={e => e.key === 'Enter' && handleNext()}
                />
                {pinError && <div className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={11} />{pinError}</div>}
              </div>
            </div>
          )}

          {/* ── Step 2: Confirm + sign ── */}
          {(step === 'confirm' || step === 'signing') && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-xs space-y-2">
                <div className="font-semibold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-blue-500" /> Thông tin xác nhận ký
                </div>
                {[
                  { label: 'Hóa đơn', value: `${inv.series}/${inv.number}` },
                  { label: 'Khách hàng', value: inv.customer.name },
                  { label: 'Tổng tiền', value: Number(total).toLocaleString('vi-VN') + ' ₫' },
                  { label: 'Ngày ký', value: new Date().toLocaleDateString('vi-VN') },
                  { label: 'Chứng thư', value: `${cert?.subject} (${cert?.issuer})` },
                  { label: 'Serial', value: cert?.serial },
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
                  <div className="text-sm text-slate-600 dark:text-slate-300 font-medium">Đang ký số...</div>
                  <div className="text-xs text-slate-400">Vui lòng không đóng cửa sổ</div>
                </div>
              )}

              {step === 'confirm' && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-3 py-2 text-xs text-yellow-800 dark:text-yellow-300 flex gap-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  Sau khi ký số, hóa đơn sẽ được phát hành và không thể chỉnh sửa.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer buttons */}
        {step !== 'signing' && (
          <div className="px-6 pb-5 flex gap-3 justify-end">
            <button onClick={step === 'confirm' ? () => setStep('select') : onClose}
              className="px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              {step === 'confirm' ? 'Quay lại' : 'Hủy'}
            </button>
            <button
              onClick={step === 'select' ? handleNext : handleSign}
              disabled={signing}
              className="px-5 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-60 flex items-center gap-2">
              <ShieldCheck size={14} />
              {step === 'select' ? 'Tiếp theo' : 'Xác nhận ký số'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const UNITS = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']
const TENS = ['', 'mười', 'hai mươi', 'ba mươi', 'bốn mươi', 'năm mươi', 'sáu mươi', 'bảy mươi', 'tám mươi', 'chín mươi']

function readThree(n) {
  if (n === 0) return ''
  const h = Math.floor(n / 100)
  const t = Math.floor((n % 100) / 10)
  const u = n % 10
  let s = h > 0 ? UNITS[h] + ' trăm' : ''
  if (t === 0 && u > 0) {
    s += (h > 0 ? ' lẻ ' : '') + UNITS[u]
  } else if (t === 1) {
    s += (s ? ' ' : '') + 'mười'
    if (u === 5) s += ' lăm'
    else if (u > 0) s += ' ' + UNITS[u]
  } else if (t > 1) {
    s += (s ? ' ' : '') + TENS[t]
    if (u === 1) s += ' mốt'
    else if (u === 5) s += ' lăm'
    else if (u > 0) s += ' ' + UNITS[u]
  }
  return s.trim()
}

function numberToWords(n) {
  if (!n || n === 0) return 'Không đồng'
  const b = Math.floor(n / 1_000_000_000)
  const m = Math.floor((n % 1_000_000_000) / 1_000_000)
  const k = Math.floor((n % 1_000_000) / 1_000)
  const r = n % 1_000
  const parts = []
  if (b > 0) parts.push(readThree(b) + ' tỷ')
  if (m > 0) parts.push(readThree(m) + ' triệu')
  if (k > 0) parts.push(readThree(k) + ' nghìn')
  if (r > 0) parts.push(readThree(r))
  const result = parts.join(' ')
  return result.charAt(0).toUpperCase() + result.slice(1) + ' đồng chẵn.'
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `Ngày ${d} tháng ${m} năm ${y}`
}

const fmtNum = (n) => Number(n || 0).toLocaleString('vi-VN')

export default function InvoicePreview() {
  const company = useCompanyStore()
  const SELLER = {
    name:        company.companyName,
    taxCode:     company.taxCode,
    address:     company.address,
    bankAccount: company.bankAccount,
    bankName:    `${company.bankName}${company.bankBranch ? ' — ' + company.bankBranch : ''}`,
    phone:       company.phone,
    email:       company.email,
    website:     company.website,
    legalRep:    company.legalRep,
    legalRepTitle: company.legalRepTitle,
  }

  const { id } = useParams()
  const navigate = useNavigate()
  const { current: inv, loading, fetchById, issue, cancel } = useInvoiceStore()
  const [showSignModal, setShowSignModal] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)

  useEffect(() => {
    if (inv?.id === id) return   // already loaded by create flow — skip re-fetch
    fetchById(id)
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500 p-12">
      <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin mr-3" />
      Đang tải hóa đơn...
    </div>
  )
  if (!inv) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 p-12">
      <div className="text-slate-300 dark:text-slate-600 text-5xl">📄</div>
      <div className="text-slate-500 dark:text-slate-400 font-medium">Không tìm thấy hóa đơn</div>
      <button onClick={() => navigate('/invoices')}
        className="text-xs text-blue-600 hover:underline">← Quay lại danh sách</button>
    </div>
  )

  const { subtotal, vat, total } = calcTotals(inv.items)

  const handleSignConfirmed = async () => {
    setShowSignModal(false)
    try {
      await issue(inv.id)
      toast.success(`Hóa đơn ${inv.series}/${inv.number} đã được ký số và phát hành thành công.`)
    } catch {
      toast.error('Ký số thất bại. Vui lòng thử lại.')
    }
  }

  const handleCancel = async () => {
    setShowCancelConfirm(false)
    try {
      await cancel(inv.id)
      toast.warning(`Hóa đơn ${inv.series}/${inv.number} đã bị hủy.`)
    } catch {
      toast.error('Hủy hóa đơn thất bại. Vui lòng thử lại.')
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={`Invoice ${inv.series}/${inv.status === 'draft' ? '---' : inv.number}`}
        subtitle={`Customer: ${inv.customer.name} · Date: ${inv.issueDate}`}
        actions={
          <div className="flex items-center gap-2 no-print">
            <Badge status={inv.status} />
            <Button icon={ArrowLeft} size="sm" variant="ghost" onClick={() => navigate('/invoices')}>
              Back
            </Button>
            <Button icon={Printer} size="sm" variant="secondary" onClick={() => window.print()}>
              Print / PDF
            </Button>
            {inv.status === 'issued' && (
              <Button icon={Mail} size="sm" variant="secondary" onClick={() => setShowEmailModal(true)}>
                Gửi Email
              </Button>
            )}
            {inv.status === 'draft' && (
              <>
                <Button icon={ShieldCheck} size="sm" variant="success" onClick={() => setShowSignModal(true)}>
                  Ký số &amp; Phát hành
                </Button>
                <Button icon={XCircle} size="sm" variant="danger" onClick={() => setShowCancelConfirm(true)}>
                  Hủy
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-6 bg-slate-100 dark:bg-slate-900">
      {/* Outer green border frame */}
      <div id="invoice-doc" className="max-w-4xl mx-auto bg-white"
        style={{ border: '4px solid #2d6a2d', padding: '4px' }}>
        <div style={{ border: '1.5px solid #2d6a2d', padding: '20px 24px', position: 'relative', overflow: 'hidden' }}>

          {/* Watermark */}
          {(inv.status === 'draft' || inv.status === 'cancelled') && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none', zIndex: 10,
            }}>
              <span style={{
                fontSize: '120px', fontWeight: 900,
                color: 'rgba(239,68,68,0.12)',
                transform: 'rotate(-35deg)', letterSpacing: '0.05em', userSelect: 'none',
                whiteSpace: 'nowrap',
              }}>{inv.status === 'cancelled' ? 'ĐÃ HỦY' : 'NHÁP'}</span>
            </div>
          )}

          {/* ── HEADER ── */}
          <div className="flex items-start justify-between mb-1">
            {/* Logo */}
            <div style={{ width: '180px' }}>
              <div className="font-black text-3xl leading-none" style={{ color: '#e53012', fontFamily: 'Arial, sans-serif' }}>
                viettel
              </div>
              <div className="text-xs text-slate-500 mt-1">Theo cách của bạn</div>
            </div>

            {/* Title */}
            <div className="text-center flex-1 px-4">
              <div className="flex items-center justify-center gap-2">
                <span className="font-bold text-xl tracking-wide text-black">
                  {inv.templateCode?.startsWith('01') ? 'HÓA ĐƠN GIÁ TRỊ GIA TĂNG'
                   : inv.templateCode?.startsWith('07') ? 'HÓA ĐƠN XUẤT KHẨU'
                   : 'HÓA ĐƠN BÁN HÀNG'}
                </span>
                {inv.status === 'draft' && (
                  <span style={{
                    background: '#ef4444', color: 'white', fontSize: '10px', fontWeight: 700,
                    padding: '1px 7px', borderRadius: '4px', letterSpacing: '0.05em', lineHeight: '18px',
                  }}>NHÁP</span>
                )}
                {inv.status === 'cancelled' && (
                  <span style={{
                    background: '#64748b', color: 'white', fontSize: '10px', fontWeight: 700,
                    padding: '1px 7px', borderRadius: '4px', letterSpacing: '0.05em', lineHeight: '18px',
                  }}>ĐÃ HỦY</span>
                )}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {inv.status === 'draft'
                  ? <span style={{ color: '#ef4444', fontStyle: 'italic' }}>Bản nháp — chưa có hiệu lực pháp lý</span>
                  : 'Bản thể hiện của hóa đơn điện tử'}
              </div>
              <div className="text-xs text-slate-600 mt-0.5">{formatDate(inv.issueDate)}</div>
              <div className="text-xs mt-1">
                <span className="font-semibold">Mã cơ quan thuế: </span>
                <span style={{ color: inv.status === 'issued' ? '#000' : '#94a3b8', fontStyle: inv.status !== 'issued' ? 'italic' : 'normal' }}>
                  {inv.status === 'issued' ? (inv.taxAuthorityCode || '—') : '(cấp sau khi phát hành)'}
                </span>
              </div>
              {inv.templateCode && (
                <div className="text-xs text-slate-500 mt-0.5">Mẫu số: <span className="font-semibold text-slate-700">{inv.templateCode}</span></div>
              )}
            </div>

            {/* Ký hiệu / Số */}
            <div style={{ width: '180px' }} className="text-right text-xs">
              <table className="ml-auto text-xs">
                <tbody>
                  <tr>
                    <td className="text-slate-600 pr-2">Ký hiệu:</td>
                    <td className="font-bold text-black">{inv.series}</td>
                  </tr>
                  <tr>
                    <td className="text-slate-600 pr-2">Số:</td>
                    <td className="font-bold" style={{ color: inv.status === 'draft' ? '#94a3b8' : '#e53012' }}>
                      {inv.status === 'draft' ? '---' : inv.number}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <hr style={{ borderColor: '#2d6a2d', borderWidth: '1px', margin: '8px 0' }} />

          {/* ── SELLER INFO ── */}
          <div className="text-xs mb-1">
            <div><span className="font-bold">Tên người bán: </span><span className="font-bold uppercase">{SELLER.name}</span></div>
            <div><span className="font-bold">Mã số thuế: </span>{SELLER.taxCode}</div>
            <div><span className="font-bold">Địa chỉ: </span>{SELLER.address}</div>
            <div className="flex gap-6">
              <div><span className="font-bold">Số TK: </span>{SELLER.bankAccount} — <span className="font-semibold">{SELLER.bankName}</span></div>
            </div>
            <div className="flex gap-6">
              <div><span className="font-bold">Điện thoại: </span>{SELLER.phone}</div>
              <div><span className="font-bold">Email: </span>{SELLER.email}</div>
            </div>
          </div>

          <hr style={{ borderColor: '#2d6a2d', borderWidth: '1px', margin: '8px 0' }} />

          {/* ── BUYER INFO ── */}
          <div className="text-xs mb-1 space-y-0.5">
            <div><span className="font-bold">Họ tên người mua hàng: </span>{inv.buyerName}</div>
            <div><span className="font-bold">Tên đơn vị: </span>{inv.customer.name}</div>
            <div className="flex justify-between">
              <div><span className="font-bold">MST: </span>{inv.customer.taxCode}</div>
              <div><span className="font-bold">Điện thoại: </span>{inv.customer.phone}</div>
            </div>
            <div><span className="font-bold">Địa chỉ: </span>{inv.customer.address}</div>
            <div className="flex justify-between">
              <div>
                <span className="font-bold">Số TK: </span>
                {inv.customer.bankAccount || '—'}
                {inv.customer.bankName ? <span> — <span className="font-semibold">{inv.customer.bankName}</span></span> : ''}
              </div>
              <div><span className="font-bold">Email: </span>{inv.customer.email || '—'}</div>
            </div>
            <div className="flex justify-between">
              <div><span className="font-bold">Hình thức thanh toán: </span>{inv.paymentMethod}</div>
              <div><span className="font-bold">Đồng tiền: </span>{inv.currency}</div>
            </div>
            {inv.dueDate && (
              <div><span className="font-bold">Hạn thanh toán: </span>
                <span style={{ color: new Date(inv.dueDate) < new Date() && inv.status !== 'cancelled' ? '#ef4444' : 'inherit' }}>
                  {inv.dueDate}
                </span>
              </div>
            )}
          </div>

          {/* ── ITEMS TABLE ── */}
          <table className="w-full text-xs mt-2" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle} className="text-center w-7">STT</th>
                <th style={thStyle} className="text-center">Tên hàng hóa, dịch vụ</th>
                <th style={thStyle} className="text-center w-16">Đơn vị tính</th>
                <th style={thStyle} className="text-center w-12">Số lượng</th>
                <th style={thStyle} className="text-center w-24">Đơn giá</th>
                <th style={thStyle} className="text-center w-24">Thành tiền</th>
                <th style={thStyle} className="text-center w-14">Thuế suất</th>
                <th style={thStyle} className="text-center w-24">Tiền thuế GTGT</th>
              </tr>
              <tr>
                {['1','2','3','4','5','6=4×5','7','8=6×7'].map((n,i) => (
                  <td key={i} style={tdStyle} className="text-center text-slate-500">{n}</td>
                ))}
              </tr>
            </thead>
            <tbody>
              {inv.items.map((item, idx) => {
                const lineTotal = item.qty * item.unitPrice
                const lineVAT = lineTotal * (item.vatRate / 100)
                return (
                  <tr key={item.id || idx}>
                    <td style={tdStyle} className="text-center">{idx + 1}</td>
                    <td style={tdStyle}>{item.description}</td>
                    <td style={tdStyle} className="text-center">{item.unit}</td>
                    <td style={tdStyle} className="text-right">{item.qty}</td>
                    <td style={tdStyle} className="text-right">{fmtNum(item.unitPrice)}</td>
                    <td style={tdStyle} className="text-right">{fmtNum(lineTotal)}</td>
                    <td style={tdStyle} className="text-center">{item.vatRate}%</td>
                    <td style={tdStyle} className="text-right">{fmtNum(lineVAT)}</td>
                  </tr>
                )
              })}
              {Array.from({ length: Math.max(0, 4 - inv.items.length) }).map((_, i) => (
                <tr key={'empty-' + i}>
                  {Array(8).fill(0).map((__, j) => <td key={j} style={tdStyle}>&nbsp;</td>)}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} style={{ ...tdStyle, fontWeight: 'bold', textAlign: 'right' }}>Cộng tiền hàng:</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtNum(subtotal)}</td>
                <td colSpan={2} style={tdStyle}></td>
              </tr>
              {/* Group VAT by rate */}
              {Object.entries(
                inv.items.reduce((acc, it) => {
                  const key = `${it.vatRate}%`
                  acc[key] = (acc[key] || 0) + it.qty * it.unitPrice * it.vatRate / 100
                  return acc
                }, {})
              ).map(([rate, vatAmt]) => (
                <tr key={rate}>
                  <td colSpan={5} style={{ ...tdStyle, textAlign: 'right' }}>Thuế suất GTGT {rate}:</td>
                  <td style={tdStyle}></td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{rate}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtNum(vatAmt)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={5} style={{ ...tdStyle, fontWeight: 'bold', textAlign: 'right' }}>Tổng tiền thanh toán:</td>
                <td colSpan={3} style={{ ...tdStyle, fontWeight: 'bold', textAlign: 'right', color: '#e53012' }}>
                  {fmtNum(total)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Số tiền bằng chữ */}
          <div className="text-xs mt-2 p-2 bg-slate-50 rounded" style={{ border: '1px solid #e2e8f0' }}>
            <span className="font-bold">Số tiền viết bằng chữ: </span>
            <span className="italic">{numberToWords(total)}</span>
          </div>

          {/* Ghi chú */}
          {inv.note && (
            <div className="text-xs mt-1.5">
              <span className="font-bold">Ghi chú: </span>{inv.note}
            </div>
          )}

          {/* ── SIGNATURES + QR ── */}
          <div className="flex gap-2 mt-5">

            {/* Signatures — 3 columns */}
            <div className="flex-1 grid grid-cols-3 gap-3 text-xs text-center">

              {/* Buyer */}
              <div>
                <div className="font-bold text-[11px]">Người mua hàng</div>
                <div className="text-slate-400 italic text-[10px]">(Ký điện tử, chữ ký số)</div>
                <div className="mt-1 h-16 rounded border flex items-center justify-center"
                  style={{ borderStyle: 'dashed', borderColor: '#cbd5e1' }}>
                  <span className="text-slate-300 text-[9px] italic">Chưa ký</span>
                </div>
                <div className="mt-1 text-[10px] text-slate-500">{inv.buyerName}</div>
              </div>

              {/* Tax authority */}
              <div>
                <div className="font-bold text-[11px]">Cơ Quan Thuế</div>
                <div className="text-slate-400 italic text-[10px]">(Ký điện tử, chữ ký số)</div>
                <div className="mt-1 h-16 rounded border flex flex-col items-center justify-center gap-0.5"
                  style={{ borderStyle: inv.status === 'issued' ? 'solid' : 'dashed', borderColor: inv.status === 'issued' ? '#3b82f6' : '#cbd5e1', background: inv.status === 'issued' ? '#eff6ff' : 'transparent' }}>
                  {inv.status === 'issued' ? (
                    <>
                      <div className="text-blue-600 font-bold text-[10px]">✓ Đã cấp mã</div>
                      <div className="text-blue-500 text-[9px] font-mono">{inv.taxAuthorityCode?.slice(0, 12)}…</div>
                      <div className="text-slate-400 text-[9px]">{inv.issueDate}</div>
                    </>
                  ) : (
                    <span className="text-slate-300 text-[9px] italic">Cấp sau phát hành</span>
                  )}
                </div>
                {inv.status === 'issued' && <div className="mt-1 text-[10px] text-slate-500">Tổng cục Thuế</div>}
              </div>

              {/* Seller */}
              <div>
                <div className="font-bold text-[11px]">Người bán hàng</div>
                <div className="text-slate-400 italic text-[10px]">(Ký điện tử, chữ ký số)</div>
                <div className="mt-1 h-16 rounded border flex flex-col items-center justify-center gap-0.5 px-1"
                  style={{ borderStyle: inv.status === 'issued' ? 'solid' : 'dashed', borderColor: inv.status === 'issued' ? '#22c55e' : '#cbd5e1', background: inv.status === 'issued' ? '#f0fdf4' : 'transparent' }}>
                  {inv.status === 'issued' ? (
                    <>
                      <div className="text-green-600 font-bold text-[10px]">✓ Đã ký số</div>
                      <div className="text-slate-600 text-[9px] font-semibold text-center leading-tight">{SELLER.name}</div>
                      <div className="text-slate-400 text-[9px]">CA: VNPT-CA · {inv.issueDate}</div>
                    </>
                  ) : (
                    <span className="text-slate-300 text-[9px] italic">Chưa ký</span>
                  )}
                </div>
                {inv.status === 'issued' && <div className="mt-1 text-[10px] text-slate-500">{SELLER.name}</div>}
              </div>
            </div>

            {/* QR Code block — only for issued */}
            {inv.status === 'issued' && (
              <div className="shrink-0 flex flex-col items-center gap-1 text-[9px] text-slate-500 w-20">
                {/* Mock QR pattern */}
                <div style={{ width: 72, height: 72, background: '#fff', border: '1px solid #ccc', padding: 3 }}>
                  <svg viewBox="0 0 21 21" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    {/* QR finder patterns */}
                    <rect x="0" y="0" width="7" height="7" fill="#000"/><rect x="1" y="1" width="5" height="5" fill="#fff"/><rect x="2" y="2" width="3" height="3" fill="#000"/>
                    <rect x="14" y="0" width="7" height="7" fill="#000"/><rect x="15" y="1" width="5" height="5" fill="#fff"/><rect x="16" y="2" width="3" height="3" fill="#000"/>
                    <rect x="0" y="14" width="7" height="7" fill="#000"/><rect x="1" y="15" width="5" height="5" fill="#fff"/><rect x="2" y="16" width="3" height="3" fill="#000"/>
                    {/* Mock data cells */}
                    {[8,9,10,11,12].map(x => [8,9,10,11,12].map(y => Math.random() > 0.5 ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#000"/> : null))}
                    {[8,9,13,14,16,17,19,20].map(x => <rect key={`t${x}`} x={x} y="0" width="1" height="1" fill="#000"/>)}
                    {[8,10,12,14,16,18,20].map(y => <rect key={`r${y}`} x="20" y={y} width="1" height="1" fill="#000"/>)}
                  </svg>
                </div>
                <div className="text-center text-[8px] text-slate-500 leading-tight">Tra cứu<br/>hóa đơn</div>
              </div>
            )}
          </div>

          {/* Mã tra cứu — only for issued */}
          {inv.status === 'issued' && (
            <div className="mt-3 p-2 rounded text-[10px]" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
              <div className="flex flex-wrap gap-x-6 gap-y-0.5">
                <div><span className="font-bold text-blue-700">Mã CQT: </span>
                  <span className="font-mono text-blue-800 font-semibold">{inv.taxAuthorityCode}</span>
                </div>
                <div><span className="font-bold text-blue-700">Tra cứu: </span>
                  <span className="text-blue-600">{SELLER.website}/tracuu?code={inv.taxAuthorityCode?.slice(0,8)}</span>
                </div>
              </div>
            </div>
          )}

          {/* ── FOOTER ── */}
          <div className="mt-3 text-center" style={{ borderTop: '1px dashed #aaa', paddingTop: '6px' }}>
            <div className="text-[10px] text-slate-400">(Cần kiểm tra, đối chiếu khi lập, giao, nhận hóa đơn)</div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Đơn vị cung cấp dịch vụ HĐĐT: <span className="font-semibold">{SELLER.name}</span> · MST: {SELLER.taxCode} · {SELLER.website}
            </div>
          </div>

        </div>
      </div>
      </div>

      {/* Email modal */}
      {showEmailModal && (
        <EmailModal inv={inv} total={total} seller={SELLER} onClose={() => setShowEmailModal(false)} />
      )}

      {/* Digital signing modal */}
      {showSignModal && (
        <SigningModal
          inv={inv}
          total={total}
          onClose={() => setShowSignModal(false)}
          onConfirm={handleSignConfirmed}
        />
      )}

      {/* Cancel confirm modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm no-print">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <XCircle size={18} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Hủy hóa đơn</div>
                <div className="text-xs text-slate-400 dark:text-slate-500">{inv.series}/{inv.number}</div>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
              Bạn có chắc chắn muốn hủy hóa đơn này không? Hành động này không thể hoàn tác.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowCancelConfirm(false)}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                Không
              </button>
              <button onClick={handleCancel}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors">
                Xác nhận hủy
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

const thStyle = {
  border: '1px solid #555',
  padding: '4px 6px',
  fontWeight: 'bold',
  backgroundColor: '#f0f0f0',
}

const tdStyle = {
  border: '1px solid #999',
  padding: '4px 6px',
}
