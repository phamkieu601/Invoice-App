import React, { useState } from 'react'
import { AlertCircle, FileX, FileEdit, FilePlus, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { updateInvoiceStatus, updateCqtStatus } from '../../services/issuedInvoiceService'
import { toast } from '../../store/toastStore'

export default function ReversalActionModal({ f2Inv, s1Inv, issuedRecord, onClose, onDone }) {
  const [cqtStatus, setCqtStatus] = useState(issuedRecord?.cqt_status || 'pending')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleToggleCqt = async () => {
    const next = cqtStatus === 'pending' ? 'accepted' : 'pending'
    await updateCqtStatus(f2Inv.sapBillingDoc, next).catch(() => {})
    setCqtStatus(next)
  }

  const handleCancel = async () => {
    setLoading(true)
    try {
      await updateInvoiceStatus(f2Inv.sapBillingDoc, 'cancelled')
      await updateInvoiceStatus(s1Inv.sapBillingDoc, 'cancelled')
      toast.success(`Đã hủy hóa đơn ${f2Inv.sapBillingDoc}`)
      onDone('cancelled')
    } catch (e) {
      toast.error('Lỗi: ' + e.message)
    }
    setLoading(false)
  }

  const handleReplacement = () => {
    navigate(`/billing-preview/${f2Inv.sapBillingDoc}`, {
      state: {
        inv: { ...f2Inv },
        invoiceMode: 'replacement',
        originalBillingDoc: f2Inv.sapBillingDoc,
        s1BillingDoc: s1Inv.sapBillingDoc,
      },
    })
    onClose()
  }

  const handleAdjustment = () => {
    navigate(`/billing-preview/${f2Inv.sapBillingDoc}`, {
      state: {
        inv: { ...f2Inv },
        invoiceMode: 'adjustment',
        originalBillingDoc: f2Inv.sapBillingDoc,
        s1BillingDoc: s1Inv.sapBillingDoc,
      },
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-rose-600 px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <AlertCircle size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <div className="text-white font-semibold text-sm">Xử lý phiếu đảo (S1)</div>
            <div className="text-red-200 text-xs font-mono">{f2Inv.sapBillingDoc} ← {s1Inv.sapBillingDoc}</div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl">×</button>
        </div>

        <div className="p-6 space-y-4">

          {/* Info */}
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Hóa đơn gốc</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{f2Inv.sapBillingDoc} (F2)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Phiếu đảo</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{s1Inv.sapBillingDoc} (S1)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Khách hàng</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{f2Inv.customer?.name || '—'}</span>
            </div>
          </div>

          {/* CQT Status Toggle (Demo) */}
          <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
            <div>
              <div className="text-xs font-semibold text-blue-800 dark:text-blue-300">[Demo] Trạng thái CQT</div>
              <div className={`text-[11px] font-bold mt-0.5 ${cqtStatus === 'accepted' ? 'text-emerald-600' : 'text-amber-600'}`}>
                {cqtStatus === 'accepted' ? '✓ CQT đã chấp nhận' : '⏳ CQT chưa nhận'}
              </div>
            </div>
            <button onClick={handleToggleCqt}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-200 transition-colors">
              <RefreshCw size={11} /> Chuyển
            </button>
          </div>

          {/* Actions */}
          {cqtStatus === 'pending' ? (
            <div className="space-y-2">
              <div className="text-xs text-slate-500 font-medium">CQT chưa nhận → có thể hủy trực tiếp:</div>
              <button onClick={handleCancel} disabled={loading}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                <FileX size={16} /> Hủy hóa đơn
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-slate-500 font-medium">CQT đã chấp nhận → không được hủy, chọn:</div>
              <button onClick={handleReplacement}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
                <FilePlus size={16} />
                <div className="text-left">
                  <div>Hóa đơn thay thế</div>
                  <div className="text-[11px] font-normal opacity-80">Người mua chưa nhận hóa đơn</div>
                </div>
              </button>
              <button onClick={handleAdjustment}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-colors">
                <FileEdit size={16} />
                <div className="text-left">
                  <div>Hóa đơn điều chỉnh</div>
                  <div className="text-[11px] font-normal opacity-80">Người mua đã nhận hóa đơn</div>
                </div>
              </button>
            </div>
          )}
        </div>

        <div className="px-6 pb-5">
          <button onClick={onClose} className="w-full py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
