import { sapGet } from './sapClient'

// SAP_COM_0106 — Delivery Processing Integration
// OData: API_OUTBOUND_DELIVERY_SRV / A_OutbDeliveryHeader

const parseSAPDate = (val) => {
  if (!val) return ''
  const m = String(val).match(/\/Date\((\d+)\)\//)
  if (m) return new Date(parseInt(m[1])).toISOString().slice(0, 10)
  return val
}

function mapStatus(d) {
  // OverallSDProcessStatus: ' '/''/'A' = open, 'B' = partial, 'C' = completed
  const s = d.OverallSDProcessStatus || ''
  if (s === 'C') return 'completed'
  if (s === 'B') return 'partial'
  // Fallback: check goods movement status
  const g = d.OverallGoodsMovementStatus || ''
  if (g === 'C') return 'completed'
  if (g === 'B') return 'partial'
  return 'open'
}

const mapDeliveryHeader = (d) => ({
  deliveryDoc:  d.DeliveryDocument,
  deliveryDate: parseSAPDate(d.ActualGoodsMovementDate || d.PlannedGoodsIssueDate),
  shipDate:     parseSAPDate(d.PlannedGoodsIssueDate),
  soldToParty:  d.SoldToParty || '',
  shipToParty:  d.ShipToParty || '',
  customerName: d.SoldToPartyName || d.SoldToParty || '',
  soRef:        d.ReferenceSDDocument || '',
  status:       mapStatus(d),
  totalQty:     parseFloat(d.TotalNetWeight || 0),
  currency:     d.TransactionCurrency || 'VND',
  items:        null, // loaded lazily on expand
})

const mapItems = (results) =>
  results.map((it, idx) => ({
    id:          idx + 1,
    material:    it.Material || '',
    description: it.DeliveryDocumentItemText || it.Material || '',
    qty:         parseFloat(it.ActualDeliveryQuantity || it.DeliveryQuantity || 0),
    unit:        it.DeliveryQuantityUnit || 'EA',
  }))

export const getDeliveries = async ({ search = '', status = '' } = {}) => {
  const data = await sapGet('/sap/opu/odata/sap/API_OUTBOUND_DELIVERY_SRV/A_OutbDeliveryHeader', {
    $top: 100,
    $orderby: 'PlannedGoodsIssueDate desc',
    $select: 'DeliveryDocument,ReferenceSDDocument,SoldToParty,SoldToPartyName,ShipToParty,ActualGoodsMovementDate,PlannedGoodsIssueDate,OverallSDProcessStatus,OverallGoodsMovementStatus,TransactionCurrency,TotalNetWeight',
  })
  let results = (data.d?.results || []).map(mapDeliveryHeader)
  if (search) results = results.filter(d =>
    d.deliveryDoc.includes(search) ||
    d.customerName.toLowerCase().includes(search.toLowerCase()) ||
    d.soRef.includes(search)
  )
  if (status) results = results.filter(d => d.status === status)
  return results
}

export const getDeliveryItems = async (deliveryDoc) => {
  const data = await sapGet(
    `/sap/opu/odata/sap/API_OUTBOUND_DELIVERY_SRV/A_OutbDeliveryHeader('${deliveryDoc}')/to_DeliveryDocumentItem`,
    { $select: 'DeliveryDocument,DeliveryDocumentItem,Material,DeliveryDocumentItemText,ActualDeliveryQuantity,DeliveryQuantity,DeliveryQuantityUnit' }
  )
  return mapItems(data.d?.results || [])
}
