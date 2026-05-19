// Issued e-invoice records stored in Supabase
// Table: issued_invoices
// Schema:
//   id uuid PK, created_at timestamptz,
//   billing_doc text, billing_doc_type text,
//   issue_date text, due_date text, signed_at timestamptz,
//   customer_name text, customer_tax_code text, customer_code text, customer_address text,
//   payment_method text,
//   delivery_ref text,
//   net_amount numeric, tax_amount numeric, total_amount numeric, currency text,
//   viettel_invoice_no text, viettel_series text, viettel_tax_authority_code text,
//   status text,   -- 'issued' | 'cancelled'
//   items jsonb

import { supabase, isSupabaseConfigured } from '../lib/supabase'

// ── Mock store for when Supabase is not configured ─────────────────────────
const _mockStore = []

export async function saveIssuedInvoice(inv) {
  const record = {
    billing_doc:                inv.billingDoc,
    billing_doc_type:           inv.billingDocType || null,
    issue_date:                 inv.issueDate || null,
    due_date:                   inv.dueDate || null,
    signed_at:                  new Date().toISOString(),
    customer_name:              inv.customerName || null,
    customer_tax_code:          inv.customerTaxCode || null,
    customer_code:              inv.customerCode || null,
    customer_address:           inv.customerAddress || null,
    payment_method:             inv.paymentMethod || null,
    delivery_ref:               inv.deliveryRef || null,
    net_amount:                 inv.netAmount || 0,
    tax_amount:                 inv.taxAmount || 0,
    total_amount:               inv.totalAmount || 0,
    currency:                   inv.currency || 'VND',
    viettel_invoice_no:         inv.viettelInvoiceNo || null,
    viettel_series:             inv.viettelSeries || null,
    viettel_tax_authority_code: inv.viettelTaxAuthorityCode || null,
    status:                     'issued',
    items:                      inv.items || [],
  }

  if (!isSupabaseConfigured()) {
    const mock = { id: Math.random().toString(36).slice(2) + Date.now().toString(36), created_at: new Date().toISOString(), ...record }
    _mockStore.unshift(mock)
    return mock
  }

  const { data, error } = await supabase
    .from('issued_invoices')
    .insert(record)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getIssuedInvoices({ search = '' } = {}) {
  if (!isSupabaseConfigured()) {
    if (!search) return [..._mockStore]
    const q = search.toLowerCase()
    return _mockStore.filter(r =>
      r.billing_doc?.toLowerCase().includes(q) ||
      r.customer_name?.toLowerCase().includes(q) ||
      r.viettel_invoice_no?.toLowerCase().includes(q)
    )
  }

  let query = supabase
    .from('issued_invoices')
    .select('*')
    .order('signed_at', { ascending: false })
    .limit(100)

  if (search) {
    query = query.or(
      `billing_doc.ilike.%${search}%,customer_name.ilike.%${search}%,viettel_invoice_no.ilike.%${search}%`
    )
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data || []
}

export async function checkAlreadyIssued(billingDoc) {
  if (!isSupabaseConfigured()) {
    return _mockStore.some(r => r.billing_doc === billingDoc && r.status !== 'cancelled')
  }

  const { data } = await supabase
    .from('issued_invoices')
    .select('id')
    .eq('billing_doc', billingDoc)
    .neq('status', 'cancelled')
    .limit(1)

  return (data?.length || 0) > 0
}
