// SAP_COM_0008 — API_BUSINESS_PARTNER
// Endpoint: A_BusinessPartner('{id}') + A_BusinessPartnerAddress + A_BPTaxNumber
// Vietnam MST stored in TaxNumber1 or to_BPTaxNumber where BPTaxType = 'VN0'

import { sapGet } from './sapClient'

// Simple in-memory cache — reset on page reload
const _cache = new Map()

// SAP BP IDs are 10-char zero-padded; billing doc SoldToParty may be trimmed
function padId(id) {
  return String(id).padStart(10, '0')
}

function pickTaxCode(bp) {
  return bp.TaxNumber1 || bp.TaxNumber2 || ''
}

function pickAddress(bp) {
  const addrs = bp.to_BusinessPartnerAddress?.results || []
  const addr  = addrs[0] || {}
  const parts = [
    addr.StreetName,
    addr.HouseNumber,
    addr.CityName,
    addr.Region,
    addr.Country,
  ].filter(Boolean)

  // Phone/email are in sub-navigation entities — try common flat fields first,
  // then fall back to the first entry in the expanded arrays
  const phones = addr.to_PhoneNumber?.results || []
  const emails = addr.to_EmailAddress?.results || []

  return {
    address: parts.join(', '),
    phone:   phones[0]?.PhoneNumber || addr.PhoneNumber1 || addr.InternationalPhoneNumber || '',
    email:   emails[0]?.EmailAddress || addr.EmailAddress || '',
  }
}

function pickName(bp) {
  return (
    bp.BusinessPartnerFullName ||
    bp.OrganizationBPName1     ||
    bp.LastName                ||
    bp.FirstName               ||
    ''
  )
}

export async function getCustomer(customerId) {
  if (!customerId) return {}
  const key = String(customerId)
  if (_cache.has(key)) return _cache.get(key)

  // Try padded ID first, then raw; cache under the original key either way
  const paddedId = padId(customerId)
  const tryId    = paddedId !== key ? [paddedId, key] : [key]

  for (const id of tryId) {
    try {
      const data = await sapGet(
        `/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner('${id}')`,
        { $expand: 'to_BusinessPartnerAddress' }
      )
      const bp = data?.d || {}
      console.debug('[bpService] BP data for', id, bp)
      const { address, phone, email } = pickAddress(bp)
      const result = {
        code:    customerId,
        name:    pickName(bp),
        taxCode: pickTaxCode(bp),
        address,
        phone,
        email,
      }
      _cache.set(key, result)
      return result
    } catch (err) {
      console.warn('[bpService] Failed for', id, err?.message)
    }
  }

  // API_BUSINESS_PARTNER not accessible — return empty so invoice still renders
  const fallback = { code: customerId }
  _cache.set(key, fallback)
  return fallback
}

// Batch fetch — used by invoiceService after loading billing docs
export async function batchGetCustomers(customerIds) {
  const unique = [...new Set(customerIds.filter(Boolean))]
  await Promise.all(unique.map(id => getCustomer(id)))
  return _cache
}

export function clearBPCache() {
  _cache.clear()
}
