// File System Access API — transparent large-blob extraction
// ─────────────────────────────────────────────────────────────
// saveToFolder(handle, state):
//   Walks the state tree. Any data URL longer than BLOB_MIN bytes is
//   written to the `files/` subfolder as a binary file; the value in the
//   JSON is replaced with  { __ref: "filename.ext" }.
//   Files that already exist on disk are not re-written (idempotent).
//
// loadFromFolder(handle):
//   Reads atelier-data.json, then resolves every { __ref } marker back
//   to a data URL. The resulting state is identical to what was saved.
//
// The folder can be an iCloud Drive directory — iCloud handles syncing
// to other devices automatically.

const FS_DB       = 'atelier-fs'
const FS_STORE    = 'handles'
const DATA_FILE   = 'atelier-data.json'
const FILES_DIR   = 'files'
const BLOB_MIN    = 10_000   // strings shorter than ~10 KB stay inline in JSON

// ── IndexedDB — persist the folder handle across page loads ──────────────────

function openIdb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(FS_DB, 1)
    r.onupgradeneeded = e => e.target.result.createObjectStore(FS_STORE)
    r.onsuccess = e => res(e.target.result)
    r.onerror   = () => rej(new Error('IndexedDB unavailable'))
  })
}

async function idbGet(key) {
  const db = await openIdb()
  return new Promise(res => {
    const req = db.transaction(FS_STORE).objectStore(FS_STORE).get(key)
    req.onsuccess = e => res(e.target.result ?? null)
    req.onerror   = () => res(null)
  })
}

async function idbSet(key, val) {
  const db = await openIdb()
  return new Promise((res, rej) => {
    const req = db.transaction(FS_STORE, 'readwrite').objectStore(FS_STORE).put(val, key)
    req.onsuccess = () => res()
    req.onerror   = e => rej(e.target.error)
  })
}

async function idbDel(key) {
  const db = await openIdb()
  return new Promise(res => {
    const tx = db.transaction(FS_STORE, 'readwrite')
    tx.objectStore(FS_STORE).delete(key)
    tx.oncomplete = () => res()
    tx.onerror    = () => res()
  })
}

// ── Public folder API ─────────────────────────────────────────────────────────

export const isSupported = () =>
  typeof window !== 'undefined' && 'showDirectoryPicker' in window

export async function pickFolder() {
  const handle = await window.showDirectoryPicker({
    id: 'atelier-mehdi',
    mode: 'readwrite',
    startIn: 'documents',
  })
  await idbSet('root', handle)
  return handle
}

export async function tryRestoreFolder() {
  try {
    const handle = await idbGet('root')
    if (!handle) return null
    const perm = await handle.queryPermission({ mode: 'readwrite' })
    if (perm === 'granted') return handle
    const req = await handle.requestPermission({ mode: 'readwrite' })
    return req === 'granted' ? handle : null
  } catch { return null }
}

export async function forgetFolder() { await idbDel('root') }

// ── Helpers ───────────────────────────────────────────────────────────────────

function guessExt(dataUrl) {
  if (dataUrl.startsWith('data:image/png'))       return 'png'
  if (dataUrl.startsWith('data:image/jpeg'))      return 'jpg'
  if (dataUrl.startsWith('data:image/svg+xml'))   return 'svg'
  if (dataUrl.startsWith('data:image/webp'))      return 'webp'
  if (dataUrl.startsWith('data:application/pdf')) return 'pdf'
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
  // Non-base64 (e.g. plain SVG) — URL-decode the text and UTF-8 encode it
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

// ── Serializer ────────────────────────────────────────────────────────────────
// Walks the state tree. Replaces large data URLs with { __ref: filename }.
// Each object's own `id` field is used as the stable filename prefix so
// the same data always maps to the same file (idempotent writes).

async function serialize(val, key, filesDir) {
  if (typeof val === 'string' && val.startsWith('data:') && val.length > BLOB_MIN) {
    const ext  = guessExt(val)
    const name = `${key}.${ext}`
    let exists = false
    try { await filesDir.getFileHandle(name, { create: false }); exists = true } catch {}
    if (!exists) {
      const fh = await filesDir.getFileHandle(name, { create: true })
      const w  = await fh.createWritable()
      await w.write(dataUrlToBytes(val))
      await w.close()
    }
    return { __ref: name }
  }

  if (Array.isArray(val)) {
    const out = []
    for (let i = 0; i < val.length; i++) {
      out.push(await serialize(val[i], `${key}-${i}`, filesDir))
    }
    return out
  }

  if (val !== null && typeof val === 'object' && !val.__ref) {
    const ownId = typeof val.id === 'string' ? val.id : null
    const out = {}
    for (const [k, v] of Object.entries(val)) {
      out[k] = await serialize(v, ownId ? `${ownId}-${k}` : `${key}-${k}`, filesDir)
    }
    return out
  }

  return val
}

// ── Deserializer ──────────────────────────────────────────────────────────────

async function deserialize(val, filesDir) {
  if (val !== null && typeof val === 'object' && val.__ref) {
    try {
      const fh   = await filesDir.getFileHandle(val.__ref, { create: false })
      const file = await fh.getFile()
      return await blobToDataUrl(file)
    } catch { return null }
  }

  if (Array.isArray(val)) {
    const out = []
    for (const v of val) out.push(await deserialize(v, filesDir))
    return out
  }

  if (val !== null && typeof val === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(val)) {
      out[k] = await deserialize(v, filesDir)
    }
    return out
  }

  return val
}

// ── Save / Load ───────────────────────────────────────────────────────────────

export async function saveToFolder(dirHandle, state) {
  const filesDir = await dirHandle.getDirectoryHandle(FILES_DIR, { create: true })
  const lean = await serialize(state, 'root', filesDir)
  const fh = await dirHandle.getFileHandle(DATA_FILE, { create: true })
  const w  = await fh.createWritable()
  await w.write(JSON.stringify(lean))
  await w.close()
}

export async function loadFromFolder(dirHandle) {
  const fh   = await dirHandle.getFileHandle(DATA_FILE, { create: false })
  const file = await fh.getFile()
  const lean = JSON.parse(await file.text())
  let filesDir = null
  try { filesDir = await dirHandle.getDirectoryHandle(FILES_DIR, { create: false }) } catch {}
  if (!filesDir) return lean
  return deserialize(lean, filesDir)
}
