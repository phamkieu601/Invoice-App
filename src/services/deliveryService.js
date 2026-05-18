import { sapGet } from './sapClient'

// SAP_COM_0106 — Delivery Processing Integration
// OData: API_OUTBOUND_DELIVERY_SRV / A_OutbDeliveryHeader

const parseSAPDate = (val) => {
  if (!val) return ''
  const m = String(val).match(/\/Date\((\d+)\)\//)
  if (m) return new Date(parseInt(m[1])).toISOString().slice(0, 10)
  return val
}

const mapDelivery = (d) => {
  // SO reference: header field or first item's ReferenceSDDocument
  const items = d.to_DeliveryDocumentItem?.results || []
  const soRef = d.ReferenceSDDocument
    || items.find(it => it.ReferenceSDDocument)?.ReferenceSDDocument
    || ''

  return {
  deliveryDoc: d.DeliveryDocument,
  deliveryDate: parseSAPDate(d.ActualGoodsMovementDate || d.PlannedGoodsIssueDate),
  shipDate: parseSAPDate(d.PlannedGoodsIssueDate),
  soldToParty: d.SoldToParty || '',
  shipToParty: d.ShipToParty || '',
  customerName: d.SoldToPartyName || d.SoldToParty || '',
  soRef,
  status: d.OverallSDProcessStatus === 'C' ? 'completed'
    : d.OverallSDProcessStatus === 'B' ? 'partial'
    : 'open',
  totalWeight: parseFloat(d.TotalGrossWeight || 0),
  weightUnit: d.WeightUnit || 'KG',
  currency: d.TransactionCurrency || 'VND',
  items: items.map((it, idx) => ({
    id: idx + 1,
    material: it.Material || '',
    description: it.DeliveryDocumentItemText || it.Material || '',
    qty: parseFloat(it.ActualDeliveryQuantity || it.DeliveryQuantity || 0),
    unit: it.DeliveryQuantityUnit || 'EA',
  })),
  }
}

export const getDeliveries = async ({ search = '', status = '' } = {}) => {
  const data = await sapGet('/sap/opu/odata/sap/API_OUTBOUND_DELIVERY_SRV/A_OutbDeliveryHeader', {
    $expand: 'to_DeliveryDocumentItem',
    $top: 50,
    $orderby: 'PlannedGoodsIssueDate desc',
  })
  let results = (data.d?.results || []).map(mapDelivery)
  if (search) results = results.filter(d =>
    d.deliveryDoc.includes(search) ||
    d.customerName.toLowerCase().includes(search.toLowerCase()) ||
    d.soRef.includes(search)
  )
  if (status) results = results.filter(d => d.status === status)
  return results
}
