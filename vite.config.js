import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'
import https from 'https'
import http from 'http'
import { URL } from 'url'

const SAP_RUNTIME_FILE = path.join(process.cwd(), '.sap-runtime.json')

function readTarget(envFallback) {
  try {
    const cfg = JSON.parse(fs.readFileSync(SAP_RUNTIME_FILE, 'utf8'))
    if (cfg.tenantUrl) return cfg.tenantUrl.replace(/\/$/, '')
  } catch {}
  return (envFallback || '').replace(/\/$/, '')
}

function nodeFetch(urlStr, { method = 'GET', headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    let parsed
    try { parsed = new URL(urlStr) } catch (e) { return reject(new Error(`Invalid URL: ${urlStr}`)) }
    const transport = parsed.protocol === 'https:' ? https : http
    const bodyBuf = body ? Buffer.from(body) : null
    const reqHeaders = { ...headers }
    if (bodyBuf) { reqHeaders['Content-Length'] = bodyBuf.length }
    const req = transport.request(
      { hostname: parsed.hostname, port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80), path: parsed.pathname + parsed.search, method, headers: reqHeaders },
      (res) => {
        const chunks = []
        res.on('data', c => chunks.push(c))
        res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }))
      }
    )
    req.on('error', reject)
    if (bodyBuf) req.write(bodyBuf)
    req.end()
  })
}

const VIETTEL_RUNTIME_FILE = path.join(process.cwd(), '.viettel-runtime.json')
function readViettelCfg() {
  try { return JSON.parse(fs.readFileSync(VIETTEL_RUNTIME_FILE, 'utf8')) } catch { return {} }
}

function sapDevMiddleware(envSapBase) {
  return {
    name: 'sap-dev-endpoints',
    configureServer(server) {

      // Viettel S-Invoice proxy — forwards /api/viettel/* to Viettel base URL
      server.middlewares.use('/api/viettel', (req, res) => {
        const cfg = readViettelCfg()
        const base = (cfg.baseUrl || 'https://demo-sinvoice.viettel.vn').replace(/\/$/, '')
        const url = `${base}${req.url}`
        const method = req.method || 'GET'
        let body = ''
        req.on('data', c => { body += c })
        req.on('end', () => {
          const headers = { 'Content-Type': 'application/json', Accept: 'application/json' }
          if (req.headers.authorization) headers['Authorization'] = req.headers.authorization
          nodeFetch(url, { method, headers, body: body || null })
            .then(r => {
              res.statusCode = r.status
              res.setHeader('Content-Type', 'application/json')
              res.end(r.body)
            })
            .catch(e => {
              res.statusCode = 502
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: `Không thể kết nối Viettel: ${e.message}` }))
            })
        })
      })

      // POST /api/dev/viettel-config — save Viettel config to .viettel-runtime.json
      server.middlewares.use('/api/dev/viettel-config', (req, res, next) => {
        if (req.method !== 'POST') return next()
        let body = ''
        req.on('data', c => { body += c })
        req.on('end', () => {
          res.setHeader('Content-Type', 'application/json')
          try {
            const cfg = JSON.parse(body)
            fs.writeFileSync(VIETTEL_RUNTIME_FILE, JSON.stringify(cfg, null, 2))
            res.end(JSON.stringify({ ok: true }))
          } catch (e) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: e.message }))
          }
        })
      })


      // Dynamic SAP proxy — reads target from .sap-runtime.json at each request
      // No restart needed after saving Settings
      server.middlewares.use('/api/sap', (req, res, next) => {
        const target = readTarget(envSapBase)
        if (!target) {
          res.statusCode = 503
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'SAP chưa cấu hình Tenant URL. Vào Settings → SAP để nhập và lưu cấu hình.' }))
          return
        }
        // req.url has the /api/sap prefix stripped by connect
        const url = `${target}${req.url}`
        const headers = { Accept: 'application/json' }
        if (req.headers.authorization) headers['Authorization'] = req.headers.authorization
        nodeFetch(url, { headers })
          .then(r => {
            res.statusCode = r.status
            res.setHeader('Content-Type', 'application/json')
            res.end(r.body)
          })
          .catch(e => {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: `Không thể kết nối SAP: ${e.message}` }))
          })
      })

      // POST /api/dev/sap-config — save tenantUrl to .sap-runtime.json
      server.middlewares.use('/api/dev/sap-config', (req, res, next) => {
        if (req.method !== 'POST') return next()
        let body = ''
        req.on('data', c => { body += c })
        req.on('end', () => {
          res.setHeader('Content-Type', 'application/json')
          try {
            const cfg = JSON.parse(body)
            fs.writeFileSync(SAP_RUNTIME_FILE, JSON.stringify(cfg, null, 2))
            res.end(JSON.stringify({ ok: true }))
          } catch (e) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: e.message }))
          }
        })
      })

      // POST /api/dev/test-sap — Node → SAP directly, bypasses browser CORS
      server.middlewares.use('/api/dev/test-sap', (req, res, next) => {
        if (req.method !== 'POST') return next()
        let body = ''
        req.on('data', c => { body += c })
        req.on('end', () => {
          res.setHeader('Content-Type', 'application/json')
          const send = obj => { if (!res.writableEnded) res.end(JSON.stringify(obj)) }
          try {
            let parsed
            try { parsed = JSON.parse(body) } catch {
              res.statusCode = 400
              return send({ error: 'Invalid JSON' })
            }
            const { tenantUrl, username, password } = parsed
            if (!tenantUrl || !username || !password) {
              res.statusCode = 400
              return send({ error: 'Thiếu tenantUrl / username / password' })
            }
            const url  = `${tenantUrl.replace(/\/$/, '')}/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder?$format=json&$top=1`
            const auth = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')
            nodeFetch(url, { headers: { Authorization: auth, Accept: 'application/json' } })
              .then(r => {
                if (r.status === 401) return send({ error: 'HTTP 401 — Username hoặc Password không đúng.' })
                if (r.status === 403) return send({ error: 'HTTP 403 — User chưa được cấp quyền.' })
                if (r.status === 404) return send({ error: 'HTTP 404 — API_SALES_ORDER_SRV chưa kích hoạt. Kiểm tra Communication Arrangement SAP_COM_0193.' })
                if (r.status !== 200) return send({ error: `HTTP ${r.status} — ${r.body.slice(0, 200)}` })
                let count = null
                try { count = JSON.parse(r.body)?.d?.results?.length ?? null } catch {}
                send({ ok: true, count })
              })
              .catch(e => send({ error: `Không thể kết nối: ${e.message}` }))
          } catch (e) {
            send({ error: `Server error: ${e.message}` })
          }
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const envSapBase = env.VITE_SAP_BASE_URL || ''

  return {
    plugins: [react(), tailwindcss(), sapDevMiddleware(envSapBase)],
    server: {
      host: true,
    },
  }
})
