import { mockInvoices } from './mockData'
import { sapGet } from './sapClient'
import { batchGetCustomers } from './bpService'

const USE_MOCK = import.meta.env.VITE_SAP_BASE_URL
  ? false
  : true

let store = [...mockInvoices]

// Locally-created drafts — exist in both mock and SAP modes
let localDrafts = []

// ── Activity log ────────────────────────────────
function addLog(type, payload) {
  try {
    const logs = JSON.parse(localStorage.getItem('invoiceLog') || '[]')
    logs.unshift({ type, time: new Date().toISOString(), ...payload })
    localStorage.setItem('invoiceLog', JSON.stringify(logs.slice(0, 200)))
  } catch {}
}

export function getInvoiceLog() {
  try { return JSON.parse(localStorage.getItem('invoiceLog') || '[]') }
  catch { return [] }
}

// SAP: GET /sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV/A_BillingDocument
export const getInvoices = async ({ search = '', status = '', deliveryFilter = '' } = {}) => {
  if (USE_MOCK) {
    await delay(300)
    return store.filter(inv => {
      const matchSearch = !search || inv.customer.name.toLowerCase().includes(search.toLowerCase()) || inv.id.includes(search)
      const matchStatus = !status || inv.status === status
      return matchSearch && matchStatus
    })
  }

  const data = await sapGet('/sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV/A_BillingDocument', {
    $expand: 'to_Item,to_Partner',
    $top: 50,
    $orderby: 'BillingDocumentDate desc',
  })

  let results = data.d.results.map(doc => mapSAPToLocal(doc))

  // Enrich customer + bill-to info from API_BUSINESS_PARTNER (SAP_COM_0008)
  const allBpIds = [...new Set([
    ...results.map(inv => inv.customer.code),
    ...results.map(inv => inv.payerCode),
  ].filter(Boolean))]
  if (allBpIds.length) {
    const bpCache = await batchGetCustomers(allBpIds)
    results = results.map(inv => {
      const bp      = bpCache.get(inv.customer.code)
      const payerBp = bpCache.get(inv.payerCode)
      return {
        ...inv,
        payer: payerBp?.name || inv.payer,
        customer: bp ? {
          ...inv.customer,
          name:    bp.name    || inv.customer.name,
          taxCode: bp.taxCode || inv.customer.taxCode,
          address: bp.address || inv.customer.address,
          phone:   bp.phone   || inv.customer.phone,
          email:   bp.email   || inv.customer.email,
        } : inv.customer,
      }
    })
  }

  if (deliveryFilter) results = results.filter(inv => inv.deliveryRef === deliveryFilter)
  if (search) results = results.filter(inv =>
    inv.customer.name.toLowerCase().includes(search.toLowerCase()) || inv.id.includes(search) || (inv.deliveryRef || '').includes(search)
  )
  if (status) results = results.filter(inv => inv.status === status)
  return results
}

export const getInvoiceById = async (id) => {
  // Always check local drafts first (works in both mock and SAP mode)
  const localDraft = localDrafts.find(inv => inv.id === id)
  if (localDraft) return localDraft

  if (USE_MOCK) {
    await delay(200)
    return store.find(inv => inv.id === id) || null
  }

  try {
    const data = await sapGet(`/sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV/A_BillingDocument('${id}')`, {
      $expand: 'to_Item,to_Partner',
    })
    return mapSAPToLocal(data.d)
  } catch {
    // Fallback to mock store for non-SAP IDs
    return store.find(inv => inv.id === id) || null
  }
}

export const createInvoice = async (data) => {
  await delay(400)
  const seq = store.length + localDrafts.length + 1
  const newInv = {
    ...data,
    id: `INV-${new Date().getFullYear()}-${String(seq).padStart(3, '0')}`,
    sapBillingDoc: `900000000${seq + 3}`,
    status: 'draft',
    series: data.series || data.templateCode?.split('/')[0] || 'AA',
    number: String(seq).padStart(7, '0'),
    issueDate: data.invoiceDate || data.issueDate,
  }
  if (USE_MOCK) {
    store = [...store, newInv]
  } else {
    localDrafts = [...localDrafts, newInv]
  }
  addLog('create', {
    invoiceId: newInv.id,
    series: newInv.series,
    number: newInv.number,
    customer: newInv.customer?.name,
    customerTaxCode: newInv.customer?.taxCode,
    soRef: newInv.soRef,
    issueDate: newInv.issueDate,
    total: newInv.items?.reduce((s, it) => s + (it.qty||0)*(it.unitPrice||0)*(1+(it.vatRate||0)/100), 0),
    itemCount: newInv.items?.length,
    paymentMethod: newInv.paymentMethod,
  })
  return newInv
}

export const issueInvoice = async (id) => {
  await delay(500)
  const issuedCount = store.filter(inv => inv.status === 'issued').length
  const officialNumber = String(issuedCount + 1).padStart(7, '0')
  const taxAuthorityCode = `${new Date().getFullYear()}${String(issuedCount + 1).padStart(8, '0')}${Math.random().toString(36).slice(2, 6).toUpperCase()}`
  const updated = { status: 'issued', number: officialNumber, taxAuthorityCode, issueDate: new Date().toISOString().slice(0, 10) }

  // Check localDrafts first
  const localIdx = localDrafts.findIndex(inv => inv.id === id)
  if (localIdx !== -1) {
    const issued = { ...localDrafts[localIdx], ...updated }
    localDrafts = localDrafts.map(inv => inv.id === id ? issued : inv)
    addLog('issue', {
      invoiceId: id, number: officialNumber, taxAuthorityCode,
      customer: issued.customer?.name, customerTaxCode: issued.customer?.taxCode,
      series: issued.series, issueDate: updated.issueDate,
      total: issued.items?.reduce((s, it) => s + (it.qty||0)*(it.unitPrice||0)*(1+(it.vatRate||0)/100), 0),
    })
    return issued
  }
  const inv = store.find(inv => inv.id === id)
  store = store.map(inv => inv.id === id ? { ...inv, ...updated } : inv)
  addLog('issue', {
    invoiceId: id, number: officialNumber, taxAuthorityCode,
    customer: inv?.customer?.name, customerTaxCode: inv?.customer?.taxCode,
    series: inv?.series, issueDate: updated.issueDate,
    total: inv?.items?.reduce((s, it) => s + (it.qty||0)*(it.unitPrice||0)*(1+(it.vatRate||0)/100), 0),
  })
  return store.find(inv => inv.id === id)
}

export const cancelInvoice = async (id) => {
  await delay(300)
  const localIdx = localDrafts.findIndex(inv => inv.id === id)
  if (localIdx !== -1) {
    const target = localDrafts.find(inv => inv.id === id)
    localDrafts = localDrafts.map(inv => inv.id === id ? { ...inv, status: 'cancelled' } : inv)
    addLog('cancel', {
      invoiceId: id, series: target?.series, number: target?.number,
      customer: target?.customer?.name, customerTaxCode: target?.customer?.taxCode,
      issueDate: target?.issueDate,
      total: target?.items?.reduce((s, it) => s + (it.qty||0)*(it.unitPrice||0)*(1+(it.vatRate||0)/100), 0),
    })
    return localDrafts.find(inv => inv.id === id)
  }
  const target = store.find(inv => inv.id === id)
  store = store.map(inv => inv.id === id ? { ...inv, status: 'cancelled' } : inv)
  addLog('cancel', {
    invoiceId: id, series: target?.series, number: target?.number,
    customer: target?.customer?.name, customerTaxCode: target?.customer?.taxCode,
    issueDate: target?.issueDate,
    total: target?.items?.reduce((s, it) => s + (it.qty||0)*(it.unitPrice||0)*(1+(it.vatRate||0)/100), 0),
  })
  return store.find(inv => inv.id === id)
}

const delay = (ms) => new Promise(r => setTimeout(r, ms))

const mapSAPToLocal = (doc) => {
  const items = (doc.to_Item?.results || []).map((it, idx) => {
    const qty     = parseFloat(it.BillingQuantity || 1)
    const netAmt  = parseFloat(it.NetAmount || 0)
    const taxAmt  = parseFloat(it.TaxAmount || 0)
    // Derive unit price from line total ÷ qty when NetPriceAmount absent
    const unitPrice = netAmt > 0 && qty > 0 ? netAmt / qty : 0
    const vatRate   = netAmt > 0 ? Math.round((taxAmt / netAmt) * 100) : 0

    return {
      id: idx + 1,
      description: it.BillingDocumentItemText || it.Material || '',
      unit: it.BillingQuantityUnit || 'EA',
      qty,
      unitPrice,
      vatRate,
      netAmount: netAmt,
      taxAmount: taxAmt,
    }
  })

  const totalNetAmount   = parseFloat(doc.TotalNetAmount || 0)
  const totalTaxAmount   = parseFloat(doc.TotalTaxAmount ?? doc.TaxAmount ?? 0)
  const totalGrossAmount = totalNetAmount + totalTaxAmount

  // Extract sold-to party from to_Partner expansion
  // SP = sold-to party (Auftraggeber in German), AG is the German code but SAP Public Cloud uses SP
  const partners = doc.to_Partner?.results || []
  const spPartner = partners.find(p => p.PartnerFunction === 'SP') || partners.find(p => p.PartnerFunction === 'AG') || {}
  const rgPartner = partners.find(p => p.PartnerFunction === 'RG') || {}

  const addressParts = [].filter(Boolean)

  return {
    id: doc.BillingDocument,
    sapBillingDoc: doc.BillingDocument,
    billingDocType: doc.BillingDocumentType || '',
    status: doc.BillingDocumentIsCancelled === 'X' ? 'cancelled' : 'issued',
    issueDate: parseSAPDate(doc.BillingDocumentDate),
    dueDate: parseSAPDate(doc.PaymentDueDate || doc.BillingDocumentDate),
    currency: doc.TransactionCurrency || 'VND',
    paymentMethod: doc.CustomerPaymentTerms || '',
    templateCode: '01GTKT0/001',
    series: '',
    number: doc.BillingDocument,
    taxAuthorityCode: '',
    buyerName: spPartner.AddressPersonFullName || '',
    payer: doc.PayerPartyName || rgPartner.AddressPersonFullName || rgPartner.PartnerName || '',
    payerCode: doc.Payer || rgPartner.Customer || '',
    deliveryRef: doc.ReferenceSDDocument || doc.to_Item?.results?.[0]?.ReferenceSDDocument || '',
    totalNetAmount,
    totalTaxAmount,
    totalGrossAmount,
    customer: {
      code: doc.SoldToParty || '',
      name: doc.SoldToPartyName || spPartner.AddressPersonFullName || spPartner.Customer || doc.SoldToParty || '',
      taxCode: '',
      address: '',
      phone: '',
      email: '',
      bankAccount: '',
      bankName: '',
    },
    items,
    note: doc.CustomerPurchaseOrderNumber || '',
  }
}

// SAP dates come as "/Date(1714521600000)/"
const parseSAPDate = (val) => {
  if (!val) return ''
  const m = String(val).match(/\/Date\((\d+)\)\//)
  if (m) return new Date(parseInt(m[1])).toISOString().slice(0, 10)
  return val
}
