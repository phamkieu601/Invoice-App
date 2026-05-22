import { sapGet } from './sapClient'

export const getSalesOrders = async ({ search = '', status = '' } = {}) => {
  const data = await sapGet('/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder', {
    $expand: 'to_Item',
    $top: 200,
    $orderby: 'SalesOrderDate desc',
  })
  let results = data.d.results.map(mapSAPSOToLocal)
  if (search) results = results.filter(so =>
    so.customer.name.toLowerCase().includes(search.toLowerCase()) || so.soNumber.includes(search)
  )
  if (status) results = results.filter(so => so.invoiceStatus === status)
  return results
}

export const getSalesOrderByNumber = async (soNumber) => {
  // Try direct key access first; if that fails (e.g. padded key mismatch) fall back to filter
  try {
    const data = await sapGet(`/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder('${soNumber}')`, {
      $expand: 'to_Item',
    })
    return mapSAPSOToLocal(data.d)
  } catch {
    const data = await sapGet('/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder', {
      $filter: `SalesOrder eq '${soNumber}'`,
      $expand: 'to_Item',
      $top: 1,
    })
    const result = data?.d?.results?.[0]
    if (!result) throw new Error(`SO ${soNumber} không tìm thấy`)
    return mapSAPSOToLocal(result)
  }
}

export const markSOInvoiced = async (soNumber, billingDoc) => {
  // Local state only — SAP billing doc creation is a separate flow
  return { soNumber, invoiceStatus: 'invoiced', sapBillingDoc: billingDoc }
}

// SAP dates come as "/Date(1714521600000)/"
const parseSAPDate = (val) => {
  if (!val) return ''
  const m = String(val).match(/\/Date\((\d+)\)\//)
  if (m) return new Date(parseInt(m[1])).toISOString().slice(0, 10)
  return val
}

const mapSAPSOToLocal = (sapSO) => {
  const items = (sapSO.to_Item?.results || []).map((it, idx) => ({
    id: idx + 1,
    description: it.SalesOrderItemText || it.Material || '',
    unit: it.OrderQuantityUnit || 'EA',
    qty: parseFloat(it.OrderQuantity || 1),
    unitPrice: parseFloat(it.NetAmount || 0),
    vatRate: 10,
  }))

  // OverallDeliveryStatus / OverallBillingStatus: A=not started, B=partial, C=completed
  const deliveryStatus = sapSO.OverallDeliveryStatus === 'C' ? 'completed'
    : sapSO.OverallDeliveryStatus === 'B' ? 'partial'
    : sapSO.OverallDeliveryStatus === 'A' ? 'open'
    : 'open'
  const billingStatus = sapSO.OverallBillingStatus === 'C' ? 'billed'
    : sapSO.OverallBillingStatus === 'B' ? 'partial'
    : 'pending'

  return {
    soNumber: sapSO.SalesOrder,
    soDate: parseSAPDate(sapSO.SalesOrderDate),
    deliveryDate: parseSAPDate(sapSO.RequestedDeliveryDate),
    customer: {
      code: sapSO.SoldToParty,
      name: sapSO.SoldToPartyName || sapSO.SoldToParty,
      taxCode: '',
      address: '',
      phone: '',
      email: '',
      bankAccount: '',
      bankName: '',
    },
    buyerName: '',
    paymentMethod: sapSO.CustomerPaymentTerms || 'CK',
    currency: sapSO.TransactionCurrency || 'VND',
    deliveryStatus,
    billingStatus,
    // invoiceStatus kept for tab filtering compat
    invoiceStatus: billingStatus === 'billed' ? 'invoiced' : billingStatus === 'partial' ? 'invoiced' : 'pending',
    sapBillingDoc: null,
    items,
    note: sapSO.CustomerPurchaseOrderNumber || '',
  }
}
