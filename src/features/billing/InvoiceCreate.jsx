import React, { useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { Plus, Trash2, Save, ArrowLeft, Info, Link2, FileText, AlertCircle } from 'lucide-react'
import { useInvoiceStore } from '../../store/invoiceStore'
import { useSOStore } from '../../store/soStore'
import { toast } from '../../store/toastStore'
import { INVOICE_TEMPLATES, getSeller } from '../../services/sap/mockData'
import Button from '../../components/ui/Button'
import Topbar from '../../components/layout/Topbar'
import { useT } from '../../i18n'

const fmt = (n) => Number(n || 0).toLocaleString('vi-VN')

const inputCls = (err) =>
  `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500
  ${err ? 'border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-900/20' : 'border-slate-300 dark:border-slate-600'}`

const Label = ({ children, required }) => (
  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
    {children} {required && <span className="text-red-500">*</span>}
  </label>
)

const SectionCard = ({ title, subtitle, children }) => (
  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30">
      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</div>
      {subtitle && <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{subtitle}</div>}
    </div>
    <div className="p-5">{children}</div>
  </div>
)

export default function InvoiceCreate() {
  const t = useT()
  const SELLER = getSeller()
  const navigate = useNavigate()
  const location = useLocation()
  const so = location.state?.fromSO ? location.state : null
  const createInvoice = useInvoiceStore(s => s.create)
  const markInvoiced = useSOStore(s => s.markInvoiced)
  const [saving, setSaving] = useState(false)
  const [confirmData, setConfirmData] = useState(null)

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      templateCode: INVOICE_TEMPLATES[0].code,
      series: INVOICE_TEMPLATES[0].series,
      invoiceDate: new Date().toISOString().slice(0, 10),
      issueDate: so?.issueDate ?? new Date().toISOString().slice(0, 10),
      dueDate: so?.dueDate ?? '',
      buyerName: so?.buyerName ?? '',
      paymentMethod: so?.paymentMethod ?? 'Bank Transfer',
      currency: so?.currency ?? 'VND',
      customer: so?.customer ?? {
        code: '', name: '', taxCode: '', address: '',
        phone: '', email: '', bankAccount: '', bankName: '',
      },
      items: so?.items?.length
        ? so.items.map(({ id, ...rest }) => rest)
        : [{ description: '', unit: 'Unit', qty: 1, unitPrice: 0, vatRate: 10 }],
      note: so?.note ?? '',
    }
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchItems       = watch('items')
  const watchTemplate    = watch('templateCode')
  const selectedTemplate = INVOICE_TEMPLATES.find(t => t.code === watchTemplate) ?? INVOICE_TEMPLATES[0]

  // Auto-sync series when template changes
  React.useEffect(() => {
    setValue('series', selectedTemplate.series)
  }, [watchTemplate])

  const subtotal = watchItems.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0), 0)
  const vat = watchItems.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0) * (Number(it.vatRate) || 0) / 100, 0)

  // Step 1: form validated → open confirm modal
  const onSubmit = (data) => setConfirmData(data)

  // Step 2: user confirmed → actually save
  const onConfirm = async () => {
    setSaving(true)
    setConfirmData(null)
    try {
      const inv = await createInvoice({ ...confirmData, soRef: so?.soNumber })
      if (so?.soNumber) await markInvoiced(so.soNumber, inv.sapBillingDoc)
      toast.success(`Invoice ${inv.series}/${inv.number} saved as draft.`)
      navigate(`/preview/${inv.id}`)
    } catch {
      toast.error('Failed to save invoice. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={t('create.title')}
        subtitle={so ? t('create.subtitleSO', { so: so.soNumber }) : t('create.subtitle')}
        actions={
          <Button icon={ArrowLeft} size="sm" variant="ghost"
            onClick={() => navigate(so ? '/sales-orders' : '/invoices')}>
            {t('create.back')}
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl space-y-5">

          {/* Invoice Parameters */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('create.section.params')}</div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{t('create.section.paramsSub')}</div>
              </div>
              {/* Seller badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center">
                  <FileText size={11} className="text-white" />
                </div>
                <div className="text-[11px]">
                  <div className="font-semibold text-blue-700 dark:text-blue-300">{SELLER.name}</div>
                  <div className="text-blue-500 dark:text-blue-400">Tax ID: {SELLER.taxCode}</div>
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-3 gap-4">
                {/* Template */}
                <div className="col-span-1">
                  <Label required>{t('create.label.template')}</Label>
                  <select {...register('templateCode', { required: true })} className={inputCls(errors.templateCode)}>
                    {INVOICE_TEMPLATES.map(tpl => (
                      <option key={tpl.code} value={tpl.code}>
                        {tpl.code} — {tpl.name}
                      </option>
                    ))}
                  </select>
                  <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    {selectedTemplate.nameVi}
                  </div>
                </div>

                {/* Series */}
                <div>
                  <Label required>{t('create.label.series')}</Label>
                  <input
                    {...register('series', { required: true })}
                    className={inputCls(errors.series)}
                    placeholder="e.g. 1C24ABO"
                  />
                  <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    {t('create.label.seriesHint')}
                  </div>
                </div>

                {/* Invoice Date */}
                <div>
                  <Label required>{t('create.label.invoiceDate')}</Label>
                  <input type="date" {...register('invoiceDate', { required: true })} className={inputCls(errors.invoiceDate)} />
                  <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    Date the invoice is formally created
                  </div>
                </div>
              </div>

              {/* Template info row */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { label: 'Template Code', value: selectedTemplate.code },
                  { label: 'Invoice Type', value: selectedTemplate.type },
                  { label: 'Current Series', value: watch('series') || selectedTemplate.series },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-700">
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide">{item.label}</div>
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 font-mono mt-0.5">{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SO reference banner */}
          {so && (
            <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <Link2 size={15} className="text-blue-500 dark:text-blue-400 shrink-0" />
              <div className="flex-1 text-xs text-blue-700 dark:text-blue-300">
                <span className="font-semibold">Pre-filled from Sales Order</span>
                <span className="ml-2 font-mono bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400">
                  SO {so.soNumber}
                </span>
                <span className="text-blue-500 dark:text-blue-400 ml-2">
                  · {so.customer?.name}
                </span>
              </div>
              <span className="text-[11px] text-blue-400 dark:text-blue-500">Review and adjust before saving</span>
            </div>
          )}

          {/* Thông tin hóa đơn */}
          <SectionCard title={t('create.section.info')} subtitle={t('create.section.infoSub')}>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label required>{t('create.issueDate')}</Label>
                <input type="date" {...register('issueDate', { required: true })} className={inputCls(errors.issueDate)} />
              </div>
              <div>
                <Label>{t('create.dueDate')}</Label>
                <input type="date" {...register('dueDate')} className={inputCls()} />
              </div>
              <div>
                <Label required>{t('create.paymentMethod')}</Label>
                <select {...register('paymentMethod')} className={inputCls()}>
                  <option value="Bank Transfer">{t('create.pm.bankTransfer')}</option>
                  <option value="Cash">{t('create.pm.cash')}</option>
                  <option value="Bank Transfer / Cash">{t('create.pm.both')}</option>
                </select>
              </div>
            </div>
          </SectionCard>

          {/* Buyer info */}
          <SectionCard title={t('create.section.buyer')} subtitle={t('create.section.buyerSub')}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('create.buyerName')}</Label>
                <input {...register('buyerName')} placeholder={t('create.buyerNamePh')}
                  className={inputCls()} />
              </div>
              <div>
                <Label required>{t('create.company')}</Label>
                <input {...register('customer.name', { required: true })} placeholder={t('create.companyPh')}
                  className={inputCls(errors.customer?.name)} />
              </div>
              <div>
                <Label required>{t('create.taxId')}</Label>
                <input {...register('customer.taxCode', { required: true })} placeholder={t('create.taxIdPh')}
                  className={inputCls(errors.customer?.taxCode)} />
              </div>
              <div>
                <Label>{t('create.sapCode')}</Label>
                <input {...register('customer.code')} placeholder={t('create.sapCodePh')}
                  className={inputCls()} />
              </div>
              <div>
                <Label>{t('create.phone')}</Label>
                <input {...register('customer.phone')} placeholder={t('create.phonePh')}
                  className={inputCls()} />
              </div>
              <div>
                <Label>{t('create.email')}</Label>
                <input type="email" {...register('customer.email')} placeholder={t('create.emailPh')}
                  className={inputCls()} />
              </div>
              <div className="col-span-2">
                <Label required>{t('create.address')}</Label>
                <input {...register('customer.address', { required: true })} placeholder={t('create.addressPh')}
                  className={inputCls(errors.customer?.address)} />
              </div>
              <div>
                <Label>{t('create.bankAccount')}</Label>
                <input {...register('customer.bankAccount')} placeholder={t('create.bankAccountPh')}
                  className={inputCls()} />
              </div>
              <div>
                <Label>{t('create.bankName')}</Label>
                <input {...register('customer.bankName')} placeholder={t('create.bankNamePh')}
                  className={inputCls()} />
              </div>
            </div>
          </SectionCard>

          {/* Line items */}
          <SectionCard title={t('create.section.items')} subtitle={t('create.section.itemsSub')}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg">
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300 rounded-l-lg w-8">{t('create.col.no')}</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300">{t('create.col.desc')}</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300 w-20">{t('create.col.unit')}</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300 w-20">{t('create.col.qty')}</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300 w-32">{t('create.col.unitPrice')}</th>
                    <th className="text-center px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300 w-20">{t('create.col.vat')}</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300 w-32">{t('create.col.amount')}</th>
                    <th className="w-10 rounded-r-lg"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {fields.map((field, idx) => {
                    const qty = Number(watchItems[idx]?.qty || 0)
                    const price = Number(watchItems[idx]?.unitPrice || 0)
                    const vr = Number(watchItems[idx]?.vatRate || 0)
                    const lineTotal = qty * price
                    return (
                      <tr key={field.id} className="group">
                        <td className="px-3 py-2 text-center text-slate-400 dark:text-slate-500">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <input {...register(`items.${idx}.description`, { required: true })}
                            placeholder={t('create.itemPh')}
                            className={`w-full px-2 py-1.5 border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500
                              ${errors.items?.[idx]?.description ? 'border-red-400 dark:border-red-600' : 'border-slate-200 dark:border-slate-600'}`} />
                        </td>
                        <td className="px-3 py-2">
                          <input {...register(`items.${idx}.unit`)}
                            className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min="1" {...register(`items.${idx}.qty`)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 text-xs text-right" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min="0" {...register(`items.${idx}.unitPrice`)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 text-xs text-right" />
                        </td>
                        <td className="px-3 py-2">
                          <select {...register(`items.${idx}.vatRate`)}
                            className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100">
                            <option value={0}>0%</option>
                            <option value={5}>5%</option>
                            <option value={8}>8%</option>
                            <option value={10}>10%</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-300">{fmt(lineTotal)}</td>
                        <td className="px-3 py-2 text-center">
                          {fields.length > 1 && (
                            <button type="button" onClick={() => remove(idx)}
                              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-start justify-between mt-4">
              <Button type="button" icon={Plus} size="sm" variant="ghost"
                onClick={() => append({ description: '', unit: 'Unit', qty: 1, unitPrice: 0, vatRate: 10 })}>
                {t('create.addLine')}
              </Button>

              <div className="w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>{t('create.subtotal')}</span>
                  <span className="font-medium">{fmt(subtotal)} ₫</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>{t('create.vat')}</span>
                  <span className="font-medium">{fmt(vat)} ₫</span>
                </div>
                <div className="flex justify-between font-bold text-slate-800 dark:text-slate-100 border-t border-slate-200 dark:border-slate-600 pt-2 text-sm">
                  <span>{t('create.totalAmount')}</span>
                  <span className="text-blue-600">{fmt(subtotal + vat)} ₫</span>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Notes */}
          <SectionCard title={t('create.section.notes')} subtitle={t('create.section.notesSub')}>
            <textarea {...register('note')} rows={2}
              placeholder={t('create.notePh')}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500" />
          </SectionCard>

          {/* Actions */}
          <div className="flex items-center gap-3 pb-6">
            <Button type="button" variant="secondary" onClick={() => navigate(so ? '/sales-orders' : '/invoices')}>
              {t('create.cancel')}
            </Button>
            <Button type="submit" variant="primary" icon={Save} loading={saving}>
              {saving ? t('create.saving') : t('create.save')}
            </Button>
            <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 ml-2">
              <Info size={12} />
              {t('create.hint')}
            </div>
          </div>
        </form>
      </div>

      {/* Confirm Modal */}
      {confirmData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setConfirmData(null)}
          />

          {/* dialog */}
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-slate-200 dark:border-slate-700">
            {/* icon */}
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 mx-auto mb-4">
              <FileText size={22} className="text-blue-600 dark:text-blue-400" />
            </div>

            {/* title */}
            <h3 className="text-center text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">
              {t('create.modal.title')}
            </h3>
            <p className="text-center text-xs text-slate-500 dark:text-slate-400 mb-1">
              {t('create.modal.body')}
            </p>

            {/* summary */}
            <div className="mt-4 mb-5 bg-slate-50 dark:bg-slate-700/50 rounded-xl px-4 py-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t('create.modal.customer')}</span>
                <span className="font-medium text-slate-700 dark:text-slate-200 text-right max-w-[180px] truncate">
                  {confirmData.customer?.name || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t('create.modal.issueDate')}</span>
                <span className="font-medium text-slate-700 dark:text-slate-200">{confirmData.issueDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t('create.modal.lines')}</span>
                <span className="font-medium text-slate-700 dark:text-slate-200">{t('create.modal.linesUnit', { n: confirmData.items?.length })}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 dark:border-slate-600 pt-1.5 mt-1">
                <span className="text-slate-500 dark:text-slate-400">{t('create.modal.total')}</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {Number(
                    (confirmData.items || []).reduce((s, it) =>
                      s + (Number(it.qty)||0) * (Number(it.unitPrice)||0) * (1 + (Number(it.vatRate)||0)/100), 0)
                  ).toLocaleString('vi-VN')} ₫
                </span>
              </div>
            </div>

            {/* buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmData(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                {t('create.modal.back')}
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-semibold text-white transition-colors shadow-sm shadow-blue-200 dark:shadow-none"
              >
                {t('create.modal.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
