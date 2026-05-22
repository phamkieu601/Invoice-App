import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, RefreshCw, FileText, Loader2, WifiOff, Database,
  CheckCircle2, Eye, Mail, MailCheck,
} from 'lucide-react'
import { getIssuedInvoices, setMailSent, clearMailSent } from '../../services/issuedInvoiceService'
import { isSupabaseConfigured } from '../../lib/supabase'
import { useInvoiceStore } from '../../store/invoiceStore'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import Pagination from '../../components/ui/Pagination'
import Topbar from '../../components/layout/Topbar'
import { useT } from '../../i18n'

const fmt = (n, currency = 'VND') => {
  const num = Number(n || 0)
  if (currency === 'USD') return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2 })
  if (currency === 'EUR') return 'EUR ' + num.toLocaleString('de-DE', { minimumFractionDigits: 2 })
  return num.toLocaleString('vi-VN') + ' ' + (currency || 'VND')
}

const fmtDate = iso => {
  if (!iso) return '-'
  try { return new Date(iso).toLocaleDateString('vi-VN') } catch { return iso }
}

export default function IssuedInvoiceList() {
  const navigate = useNavigate()
  const t = useT()
  const sapInvoices = useInvoiceStore(s => s.invoices)
  const fetchInvoices = useInvoiceStore(s => s.fetchInvoices)
  const [invoices, setInvoices]   = useState([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [search, setSearch]       = useState('')
  const [page, setPage]           = useState(1)
  const pageSize = 15

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await getIssuedInvoices({ search })
      setInvoices(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { load() }, [load])
  useEffect(() => { fetchInvoices({}) }, [fetchInvoices])
  useEffect(() => { setPage(1) }, [search])

  const sapByBillingDoc = new Map(sapInvoices.map(inv => [inv.sapBillingDoc, inv]))
  const paged = invoices.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={t('issuedList.title')}
        subtitle={t('issuedList.subtitle')}
        actions={
          <div className="flex items-center gap-2">
            {isSupabaseConfigured() ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                  {t('issuedList.supabaseBadge')}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                <Database size={11} className="text-amber-500" />
                <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">{t('issuedList.demoBadge')}</span>
              </div>
            )}
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              {t('issuedList.refresh')}
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
            <WifiOff size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!isSupabaseConfigured() && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-xs">
            <Database size={14} className="shrink-0" />
            <span>{t('issuedList.noSupabase')}</span>
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          {/* Search */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('issuedList.search')}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <span className="text-xs text-slate-400">{t('issuedList.countLabel').replace('{n}', invoices.length)}</span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('issuedList.col.billingDoc')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('issuedList.col.invoiceNo')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('issuedList.col.customer')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('issuedList.col.date')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('issuedList.col.signedAt')}</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('issuedList.col.total')}</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('issuedList.col.status')}</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Mail</th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={8} className="text-center py-16">
                      <Loader2 size={24} className="animate-spin mx-auto text-slate-400 mb-2" />
                      <p className="text-slate-400 text-sm">{t('issuedList.loading')}</p>
                    </td>
                  </tr>
                )}
                {!loading && invoices.length === 0 && (
                  <tr>
                    <td colSpan={9}>
                      <EmptyState
                        icon={FileText}
                        title={t('issuedList.empty')}
                        description={t('issuedList.emptyDesc')}
                      />
                    </td>
                  </tr>
                )}
                {!loading && paged.map(inv => {
                  const sapInv = sapByBillingDoc.get(inv.billing_doc)
                  const customer = {
                    name:    inv.customer_name || sapInv?.customer?.name || '',
                    taxCode: inv.customer_tax_code || sapInv?.customer?.taxCode || '',
                    code:    inv.customer_code || sapInv?.customer?.code || '',
                    address: inv.customer_address || sapInv?.customer?.address || '',
                    phone:   sapInv?.customer?.phone || '',
                    email:   sapInv?.customer?.email || '',
                    bankAccount: sapInv?.customer?.bankAccount || '',
                    bankName:    sapInv?.customer?.bankName || '',
                  }
                  const previewInv = {
                    ...(sapInv || {}),
                    sapBillingDoc:     inv.billing_doc,
                    billingDocType:    inv.billing_doc_type || sapInv?.billingDocType,
                    issueDate:         inv.issue_date || sapInv?.issueDate,
                    dueDate:           inv.due_date || sapInv?.dueDate || null,
                    currency:          inv.currency || sapInv?.currency || 'VND',
                    deliveryRef:       inv.delivery_ref || sapInv?.deliveryRef,
                    paymentMethod:     inv.payment_method || sapInv?.paymentMethod || null,
                    totalGrossAmount:  inv.total_amount || sapInv?.totalGrossAmount,
                    buyerName:         sapInv?.buyerName || '',
                    customer,
                    items:             inv.items?.length ? inv.items : (sapInv?.items || []),
                  }

                  return (
                  <tr key={inv.id}
                    className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                      {inv.billing_doc}
                      {inv.billing_doc_type === 'replacement' && (
                        <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">Thay thế</span>
                      )}
                      {inv.billing_doc_type === 'adjustment' && (
                        <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Điều chỉnh</span>
                      )}
                      {inv.billing_doc_type && inv.billing_doc_type !== 'replacement' && inv.billing_doc_type !== 'adjustment' && (
                        <div className="text-[10px] text-slate-400 font-normal mt-0.5">{inv.billing_doc_type}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {inv.viettel_invoice_no ? (
                        <div>
                          <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 size={11} /> {inv.viettel_invoice_no}
                          </span>
                          {inv.viettel_series && (
                            <div className="text-[10px] text-slate-400 mt-0.5 font-mono">{inv.viettel_series}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {customer.name || customer.code || '-'}
                      </div>
                      {customer.taxCode && (
                        <div className="text-[10px] text-slate-400 mt-0.5">MST: {customer.taxCode}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {inv.issue_date || '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {inv.signed_at
                        ? new Date(inv.signed_at).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {fmt(inv.total_amount, inv.currency)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {inv.status === 'cancelled'
                        ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">{t('issuedList.status.cancelled')}</span>
                        : <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 size={9} /> {t('issuedList.status.issued')}
                          </span>
                      }
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(() => {
                        const sentAt = inv.mail_sent_at
                        return (
                          <button
                            title={sentAt ? `Đã gửi: ${new Date(sentAt).toLocaleString('vi-VN')}` : 'Chưa gửi mail — click để đánh dấu'}
                            onClick={async () => {
                              try {
                                if (sentAt) await clearMailSent(inv.billing_doc)
                                else await setMailSent(inv.billing_doc)
                                load()
                              } catch (e) {
                                alert('Lỗi: ' + e.message)
                              }
                            }}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
                              sentAt
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-400 hover:bg-blue-50 hover:text-blue-600'
                            }`}
                          >
                            {sentAt ? <><MailCheck size={11} /> Đã gửi</> : <><Mail size={11} /> Chưa gửi</>}
                          </button>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => navigate(`/billing-preview/${inv.billing_doc}`, {
                          state: {
                            inv: previewInv,
                            issued: true,
                            taxAuthorityCode: inv.viettel_tax_authority_code,
                          },
                        })}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer"
                      >
                        <Eye size={10} /> {t('issuedList.view')}
                      </button>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {invoices.length > pageSize && (
            <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700">
              <Pagination
                page={page}
                pageSize={pageSize}
                total={invoices.length}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

