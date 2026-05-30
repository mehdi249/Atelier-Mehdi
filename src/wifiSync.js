// Wi-Fi sync — pairs with server/index.js running on the Mac.
// Serialization mirrors fsStorage.js: large data URLs are extracted to
// separate binary files on the server; the JSON stores { __ref: filename }.
// uploadedCache (Map<filename, fingerprint>) is kept alive in the store ref
// so unchanged files are skipped on every push.

const SERVER_KEY   = 'atelier-server-ip'
const PING_TIMEOUT = 3000
const BLOB_MIN     = 10_000  // data URLs shorter than ~10 KB stay inline

// ── IP persistence ────────────────────────────────────────────────────────────
export function loadServerIP() { return localStorage.getItem(SERVER_KEY) || null }
export function saveServerIP(ip) {
  if (ip) localStorage.setItem(SERVER_KEY, ip.trim())
  else localStorage.removeItem(SERVER_KEY)
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function guessExt(dataUrl) {
  if (dataUrl.startsWith('data:image/png'))            return 'png'
  if (dataUrl.startsWith('data:image/jpeg'))           return 'jpg'
  if (dataUrl.startsWith('data:image/webp'))           return 'webp'
  if (dataUrl.startsWith('data:image/gif'))            return 'gif'
  if (dataUrl.startsWith('data:image/bmp'))            return 'bmp'
  if (dataUrl.startsWith('data:image/svg+xml'))        return 'svg'
  if (dataUrl.startsWith('data:application/pdf'))      return 'pdf'
  if (dataUrl.startsWith('data:application/postscript')) return 'ai'
  return 'bin'
}

function dataUrlToBytes(dataUrl) {
  const [header, payload] = dataUrl.split(',')
  if (!payload) return new Uint8Array(0)
  if (header.includes(';base64')) {
    const bin = atob(payload)
    const arr = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
    return arr
  }
  return new TextEncoder().encode(decodeURIComponent(payload))
}

function blobToDataUrl(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload  = () => res(r.result)
    r.onerror = rej
    r.readAsDataURL(blob)
  })
}

function fingerprint(dataUrl) {
  return `${dataUrl.length}:${dataUrl.slice(-50)}`
}

function serverBase(ip) { return `https://${ip}:4321` }

// ── Ping ──────────────────────────────────────────────────────────────────────
export async function pingServer(ip) {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), PING_TIMEOUT)
    const res = await fetch(`${serverBase(ip)}/ping`, { signal: ctrl.signal })
    clearTimeout(t)
    if (!res.ok) return false
    const json = await res.json()
    return json?.server === 'atelier-mehdi'
  } catch { return false }
}

// ── Serialise: walk state, upload large blobs, return lean JSON ───────────────
// uploadedCache: Map<filename, fingerprint> — mutated in place to skip re-uploads
async function serializeValue(val, key, ip, uploadedCache) {
  if (typeof val === 'string' && val.startsWith('data:') && val.length > BLOB_MIN) {
    const ext  = guessExt(val)
    const name = `${key}.${ext}`
    const fp   = fingerprint(val)

    if (uploadedCache.get(name) !== fp) {
      try {
        const mime  = val.match(/^data:([^;]+)/)?.[1] ?? 'application/octet-stream'
        const bytes = dataUrlToBytes(val)
        const blob  = new Blob([bytes], { type: mime })
        const form  = new FormData()
        form.append('file', blob, name)
        const res = await fetch(`${serverBase(ip)}/upload`, { method: 'POST', body: form })
        if (res.ok) uploadedCache.set(name, fp)
      } catch (e) { console.warn('WiFi upload failed:', name, e) }
    }
    return { __ref: name }
  }

  if (Array.isArray(val)) {
    const out = []
    for (let i = 0; i < val.length; i++) {
      out.push(await serializeValue(val[i], `${key}-${i}`, ip, uploadedCache))
    }
    return out
  }

  if (val !== null && typeof val === 'object' && !val.__ref) {
    const ownId = typeof val.id === 'string' ? val.id : null
    const out   = {}
    for (const [k, v] of Object.entries(val)) {
      out[k] = await serializeValue(v, ownId ? `${ownId}-${k}` : `${key}-${k}`, ip, uploadedCache)
    }
    return out
  }

  return val
}

// ── Deserialise: resolve __ref markers to data URLs ───────────────────────────
async function deserializeValue(val, ip, cache) {
  if (val !== null && typeof val === 'object' && typeof val.__ref === 'string') {
    if (cache.has(val.__ref)) return cache.get(val.__ref)
    try {
      const res    = await fetch(`${serverBase(ip)}/files/${encodeURIComponent(val.__ref)}`)
      if (!res.ok) return null
      const blob   = await res.blob()
      const dataUrl = await blobToDataUrl(blob)
      cache.set(val.__ref, dataUrl)
      return dataUrl
    } catch { return null }
  }

  if (Array.isArray(val)) {
    const out = []
    for (const v of val) out.push(await deserializeValue(v, ip, cache))
    return out
  }

  if (val !== null && typeof val === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(val)) out[k] = await deserializeValue(v, ip, cache)
    return out
  }

  return val
}

// Walk lean + full in parallel to record which files are already on the server.
// Call after a successful pull so the next push skips unchanged files.
export function populateUploadedCache(lean, full, cache) {
  if (lean !== null && typeof lean === 'object' && typeof lean.__ref === 'string' && typeof full === 'string') {
    cache.set(lean.__ref, fingerprint(full))
    return
  }
  if (Array.isArray(lean) && Array.isArray(full)) {
    lean.forEach((item, i) => { if (i < full.length) populateUploadedCache(item, full[i], cache) })
    return
  }
  if (lean !== null && typeof lean === 'object' && full !== null && typeof full === 'object') {
    for (const k of Object.keys(lean)) {
      if (k in full) populateUploadedCache(lean[k], full[k], cache)
    }
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function pushToServer(ip, state, uploadedCache) {
  const lean    = await serializeValue(state, 'root', ip, uploadedCache)
  const payload = { ...lean, updatedAt: new Date().toISOString() }
  const res = await fetch(`${serverBase(ip)}/collections`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`Server ${res.status}`)
}

export async function pullFromServer(ip, uploadedCache) {
  const res = await fetch(`${serverBase(ip)}/collections`)
  if (!res.ok) throw new Error(`Server ${res.status}`)
  const lean = await res.json()
  if (!lean?.collections?.length) return null
  const cache = new Map()
  const full  = await deserializeValue(lean, ip, cache)
  // Teach uploadedCache which files are confirmed on the server
  populateUploadedCache(lean, full, uploadedCache)
  return full
}
