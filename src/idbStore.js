// IndexedDB persistence — replaces localStorage as the primary store.
// Safari iOS allows up to ~1 GB; Chrome allows ~60% of free disk.
// Works in both Safari browser mode and PWA standalone mode.

const DB_NAME    = 'atelier-mehdi-db'
const DB_VERSION = 1
const STORE_NAME = 'state'
const STATE_KEY  = 'collections'

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = e => e.target.result.createObjectStore(STORE_NAME)
    req.onsuccess = e => resolve(e.target.result)
    req.onerror   = e => reject(e.target.error)
  })
}

export async function idbLoad() {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE_NAME, 'readonly')
        .objectStore(STORE_NAME).get(STATE_KEY)
      req.onsuccess = e => resolve(e.target.result ?? null)
      req.onerror   = e => reject(e.target.error)
    })
  } catch (e) {
    console.warn('IndexedDB load failed:', e)
    return null
  }
}

export async function idbSave(state) {
  try {
    const db = await openDb()
    await new Promise((resolve, reject) => {
      const req = db.transaction(STORE_NAME, 'readwrite')
        .objectStore(STORE_NAME).put(state, STATE_KEY)
      req.onsuccess = () => resolve()
      req.onerror   = e => reject(e.target.error)
    })
  } catch (e) {
    console.warn('IndexedDB save failed:', e)
  }
}

export async function idbClear() {
  try {
    const db = await openDb()
    await new Promise((resolve, reject) => {
      const req = db.transaction(STORE_NAME, 'readwrite')
        .objectStore(STORE_NAME).delete(STATE_KEY)
      req.onsuccess = () => resolve()
      req.onerror   = e => reject(e.target.error)
    })
  } catch (_) {}
}
