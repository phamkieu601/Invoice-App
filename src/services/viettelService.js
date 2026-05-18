// Viettel S-Invoice Integration
// Demo: https://demo-sinvoice.viettel.vn
// Auth: POST /api/auth → { access_token }
// Check: GET /api/invoice/{taxCode}/{transactionUuid}

let _tokenCache = null   // { token, expiresAt }

function getConfig() {
  try {
    const cfg = JSON.parse(localStorage.getItem('viettelConfig') || '{}')
    return {
      username:  cfg.username  || '',
      password:  cfg.password  || '',
      taxCode:   cfg.taxCode   || '',
      baseUrl:   cfg.baseUrl   || 'https://demo-sinvoice.viettel.vn',
      demoMode:  cfg.demoMode  ?? false,
    }
  } catch { return { username: '', password: '', taxCode: '', baseUrl: '', demoMode: false } }
}

export function isViettelConfigured() {
  const cfg = getConfig()
  return cfg.demoMode || !!(cfg.username && cfg.password && cfg.taxCode)
}

export function isViettelDemoMode() {
  return getConfig().demoMode
}

// Giả lập trạng thái HĐĐT dựa trên billing doc number (deterministic — cùng doc luôn ra cùng kết quả)
function mockCheckStatus(billingDoc) {
  const hash = String(billingDoc).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const exists = hash % 3 !== 0   // ~67% đã có HĐĐT
  if (!exists) return { exists: false }
  const seq = String(hash % 999 + 1).padStart(6, '0')
  return {
    exists: true,
    invoiceNo:        seq,
    series:           'C24T',
    taxAuthorityCode: `${new Date().getFullYear()}${seq}${Math.abs(hash).toString(36).toUpperCase().slice(0, 8)}`,
    status:           'issued',
    issuedDate:       new Date(Date.now() - (hash % 30) * 86400000).toISOString().slice(0, 10),
  }
}

async function getToken() {
  if (_tokenCache && _tokenCache.expiresAt > Date.now()) return _tokenCache.token

  const cfg = getConfig()
  const res = await fetch('/api/viettel/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: cfg.username, password: cfg.password }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Viettel auth thất bại (${res.status}): ${text.slice(0, 100)}`)
  }
  const data = await res.json()
  const token = data.access_token || data.token || data.accessToken
  if (!token) throw new Error('Viettel không trả về access_token')

  // Cache 50 phút (token thường hết hạn sau 60 phút)
  _tokenCache = { token, expiresAt: Date.now() + 50 * 60 * 1000 }
  return token
}

export function clearTokenCache() {
  _tokenCache = null
}

// Kiểm tra 1 billing doc đã có HĐĐT chưa
// Trả về: { exists: bool, invoiceNo, series, taxAuthorityCode, status }
export async function checkInvoiceStatus(billingDoc) {
  const cfg = getConfig()
  if (cfg.demoMode) {
    await new Promise(r => setTimeout(r, 80))   // giả lập network delay
    return mockCheckStatus(billingDoc)
  }
  if (!cfg.taxCode) return { exists: false }

  const token = await getToken()
  const res = await fetch(`/api/viettel/api/invoice/${cfg.taxCode}/${billingDoc}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  if (res.status === 404) return { exists: false }
  if (!res.ok) throw new Error(`Viettel check thất bại (${res.status})`)

  const data = await res.json()
  return {
    exists: true,
    invoiceNo:        data.invoiceNo || data.fkey || '',
    series:           data.invoiceSeries || data.templateCode || '',
    taxAuthorityCode: data.reservationCode || data.lookupCode || '',
    status:           data.invoiceStatus || 'issued',
    issuedDate:       data.issuedDate || '',
  }
}

// Batch check nhiều billing docs — trả về Map { billingDoc → result }
export async function batchCheckInvoiceStatus(billingDocs) {
  const results = new Map()
  if (!isViettelConfigured() || billingDocs.length === 0) return results

  const cfg = getConfig()
  if (cfg.demoMode) {
    // Demo: check tất cả cùng lúc (không cần rate limit)
    await Promise.all(billingDocs.map(async doc => {
      results.set(doc, await checkInvoiceStatus(doc))
    }))
    return results
  }

  // Production: tối đa 5 concurrent để tránh rate limit
  const chunks = []
  for (let i = 0; i < billingDocs.length; i += 5) chunks.push(billingDocs.slice(i, i + 5))
  for (const chunk of chunks) {
    await Promise.all(chunk.map(async doc => {
      try { results.set(doc, await checkInvoiceStatus(doc)) }
      catch { results.set(doc, { exists: false, error: true }) }
    }))
  }
  return results
}

// Test kết nối Viettel
export async function testViettelConnection() {
  clearTokenCache()
  const token = await getToken()
  return { ok: true, token: token.slice(0, 20) + '...' }
}
