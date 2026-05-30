import { useState, useEffect, useCallback, useRef } from 'react'
import { createBaranTemplate } from './data/baran'
import {
  loadSyncConfig,
  saveSyncConfig,
  fetchFromGist,
  pushToGist,
  createGist,
} from './sync'
import {
  isSupported as fsSupportd,
  tryRestoreFolder,
  pickFolder,
  forgetFolder,
  saveToFolder,
  loadFromFolder,
} from './fsStorage'

const STORAGE_KEY = 'atelier-mehdi-v1'

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.collections?.length > 0) return parsed
    }
  } catch {}
  return { collections: [createBaranTemplate()] }
}

export function useStore() {
  const [state, setState] = useState(loadState)
  const [syncConfig, setSyncConfig] = useState(loadSyncConfig)
  const [syncStatus, setSyncStatus] = useState('idle')
  const [folderHandle, setFolderHandle] = useState(null)
  const [folderStatus, setFolderStatus] = useState('idle') // 'idle'|'loading'|'saving'|'saved'|'error'

  // Always-current refs to avoid stale closures
  const stateRef      = useRef(state)
  const syncConfigRef = useRef(syncConfig)
  const folderRef     = useRef(null)
  const skipNextPush  = useRef(false)

  useEffect(() => { stateRef.current = state }, [state])
  useEffect(() => { syncConfigRef.current = syncConfig }, [syncConfig])

  // ── Persist to localStorage on every state change ─────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (e) {
      console.warn('localStorage quota exceeded — images may not persist:', e)
    }
  }, [state])

  // ── On mount: try to restore iCloud folder ────────────────────────────────
  useEffect(() => {
    if (!fsSupportd()) return
    tryRestoreFolder().then(handle => {
      if (!handle) return
      folderRef.current = handle
      setFolderStatus('loading')
      loadFromFolder(handle)
        .then(data => {
          if (data?.collections?.length > 0) {
            skipNextPush.current = true
            setState(data)
          }
          setFolderHandle(handle)
          setFolderStatus('saved')
        })
        .catch(() => {
          setFolderHandle(handle)
          setFolderStatus('error')
        })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── On mount: if Gist config, pull from gist ──────────────────────────────
  useEffect(() => {
    const cfg = loadSyncConfig()
    if (!cfg) return
    skipNextPush.current = true
    setSyncStatus('syncing')
    fetchFromGist(cfg.token, cfg.gistId)
      .then(data => {
        if (data?.collections?.length > 0) {
          skipNextPush.current = true
          setState(data)
        } else {
          skipNextPush.current = false
        }
        setSyncStatus('synced')
      })
      .catch(err => {
        console.warn('Gist fetch on mount failed:', err)
        skipNextPush.current = false
        setSyncStatus('error')
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Debounced save to iCloud folder on state change ───────────────────────
  useEffect(() => {
    const handle = folderRef.current
    if (!handle) return
    setFolderStatus('saving')
    const timer = setTimeout(() => {
      saveToFolder(handle, stateRef.current)
        .then(() => setFolderStatus('saved'))
        .catch(err => {
          console.warn('Folder save failed:', err)
          setFolderStatus('error')
        })
    }, 2000)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  // ── Debounced push to Gist on state change ────────────────────────────────
  useEffect(() => {
    const cfg = syncConfigRef.current
    if (!cfg) return
    if (skipNextPush.current) {
      skipNextPush.current = false
      return
    }
    setSyncStatus('syncing')
    const timer = setTimeout(() => {
      pushToGist(cfg.token, cfg.gistId, stateRef.current)
        .then(() => setSyncStatus('synced'))
        .catch(err => {
          console.warn('Gist push failed:', err)
          setSyncStatus('error')
        })
    }, 2500)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  // ── Gist callbacks ────────────────────────────────────────────────────────

  const connectGist = useCallback(async (token, existingGistId) => {
    let gistId = existingGistId?.trim() || null
    if (gistId) {
      const data = await fetchFromGist(token, gistId)
      if (data?.collections?.length > 0) {
        skipNextPush.current = true
        setState(data)
      }
    } else {
      gistId = await createGist(token, stateRef.current)
    }
    const cfg = { token, gistId }
    saveSyncConfig(cfg)
    setSyncConfig(cfg)
    setSyncStatus('synced')
    return { gistId }
  }, [])

  const pullFromGist = useCallback(async () => {
    const cfg = syncConfigRef.current
    if (!cfg) return
    setSyncStatus('syncing')
    try {
      const data = await fetchFromGist(cfg.token, cfg.gistId)
      if (data?.collections?.length > 0) {
        skipNextPush.current = true
        setState(data)
      }
      setSyncStatus('synced')
    } catch (err) {
      console.warn('Manual pull failed:', err)
      setSyncStatus('error')
    }
  }, [])

  const disconnectGist = useCallback(() => {
    saveSyncConfig(null)
    setSyncConfig(null)
    setSyncStatus('idle')
  }, [])

  // ── Folder callbacks ──────────────────────────────────────────────────────

  const connectFolder = useCallback(async () => {
    const handle = await pickFolder()   // throws if user cancels
    folderRef.current = handle
    setFolderStatus('saving')
    // Migrate existing data to the new folder on first connect
    await saveToFolder(handle, stateRef.current)
    setFolderHandle(handle)
    setFolderStatus('saved')
  }, [])

  const disconnectFolder = useCallback(async () => {
    await forgetFolder()
    folderRef.current = null
    setFolderHandle(null)
    setFolderStatus('idle')
  }, [])

  // ── Collection mutations ──────────────────────────────────────────────────

  const updateCollection = useCallback((id, updater) => {
    setState(s => ({
      ...s,
      collections: s.collections.map(c => c.id === id ? { ...c, ...updater(c) } : c)
    }))
  }, [])

  const updateStage = useCallback((collectionId, stageName, stageData) => {
    setState(s => ({
      ...s,
      collections: s.collections.map(c =>
        c.id === collectionId
          ? { ...c, stages: { ...c.stages, [stageName]: stageData } }
          : c
      )
    }))
  }, [])

  const addCollection = useCallback((collection) => {
    setState(s => ({ ...s, collections: [...s.collections, collection] }))
  }, [])

  const deleteCollection = useCallback((id) => {
    setState(s => ({ ...s, collections: s.collections.filter(c => c.id !== id) }))
  }, [])

  return {
    state,
    updateCollection,
    updateStage,
    addCollection,
    deleteCollection,
    syncConfig,
    syncStatus,
    connectGist,
    pullFromGist,
    disconnectGist,
    folderHandle,
    folderStatus,
    connectFolder,
    disconnectFolder,
  }
}
