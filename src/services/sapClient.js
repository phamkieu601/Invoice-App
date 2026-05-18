const SAP_PROXY = '/api/sap'
const SO_PATH   = '/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder'

function getSAPConfig() {
  try { return JSON.parse(localStorage.getItem('sapConfig') || '{}') } catch { return {} }
}

function buildAuthHeader() {
  const cfg  = getSAPConfig()
  const user = cfg.username || import.meta.env.VITE_SAP_USERNAME || ''
  const pass = cfg.password || import.meta.env.VITE_SAP_PASSWORD || ''
  if (!user || !pass) return null
  return 'Basic ' + btoa(`${user}:${pass}`)
}

async function fetchSAP(path, options = {}) {
  const auth = buildAuthHeader()
  const res  = await fetch(`${SAP_PROXY}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(auth ? { Authorization: auth } : {}),
      ...options.headers,
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`SAP ${res.status}: ${text}`)
  }
  return res.json()
}

async function fetchCSRFToken() {
  const auth = buildAuthHeader()
  const res  = await fetch(`${SAP_PROXY}/sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV/`, {
    headers: { 'x-csrf-token': 'Fetch', Accept: 'application/json', ...(auth ? { Authorization: auth } : {}) },
  })
  return res.headers.get('x-csrf-token') || ''
}

export async function sapGet(path, params = {}) {
  const query = new URLSearchParams({ $format: 'json', ...params }).toString()
  return fetchSAP(`${path}?${query}`)
}

export async function sapPost(path, body) {
  const csrf = await fetchCSRFToken()
  return fetchSAP(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf },
    body: JSON.stringify(body),
  })
}

// Settings → "Kiểm tra kết nối"
// Calls server-side /api/dev/test-sap so Node validates the actual tenantUrl
export async function testSAPConnection(formConfig = {}) {
  const tenantUrl = (formConfig.tenantUrl || import.meta.env.VITE_SAP_BASE_URL || '').replace(/\/$/, '')
  if (!tenantUrl) throw new Error('Chưa nhập SAP Tenant URL.')

  const username = formConfig.username || import.meta.env.VITE_SAP_USERNAME || ''
  const password = formConfig.password || import.meta.env.VITE_SAP_PASSWORD || ''
  if (!username || !password) throw new Error('Chưa nhập Username hoặc Password.')

  const r = await fetch('/api/dev/test-sap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantUrl, username, password }),
  })
  const text = await r.text()
  let data
  try { data = JSON.parse(text) } catch {
    throw new Error(text ? `Phản hồi không hợp lệ: ${text.slice(0, 120)}` : `HTTP ${r.status} — không nhận được phản hồi từ server`)
  }
  if (data.error) throw new Error(data.error)
  return { ok: true, endpoint: `${tenantUrl}${SO_PATH}`, count: data.count }
}
