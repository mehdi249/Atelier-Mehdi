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
import { idbLoad, idbSave } from './idbStore'

const LS_KEY = 'atelier-mehdi-v1'

// Synchronous seed: read localStorage so the first render is instant.
// IndexedDB (async) is loaded after mount and replaces this if it has data.
function seedState() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      if (p?.collections?.length > 0) return p
    }
  } catch {}
  return { collections: [createBaranTemplate()] }
}

export function useStore() {
  const [state, setState] = useState(seedState)
  const [syncConfig, setSyncConfig] = useState(loadSyncConfig)
  const [syncStatus, setSyncStatus] = useState('idle')
  const [folderHandle, setFolderHandle] = useState(null)
  const [folderStatus, setFolderStatus] = useState('idle')

  const stateRef      = useRef(state)
  const syncConfigRef = useRef(syncConfig)
  const folderRef     = useRef(null)
  const skipNextPush  = useRef(false)
  const idbReady      = useRef(false)  // true once IDB has loaded

  useEffect(() => { stateRef.current = state }, [state])
  useEffect(() => { syncConfigRef.current = syncConfig }, [syncConfig])

  // ── On mount: load from IndexedDB (replaces the localStorage seed) ─────────
  useEffect(() => {
    idbLoad().then(data => {
      if (data?.collections?.length > 0) {
        skipNextPush.current = true
        setState(data)
      }
      idbReady.current = true
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // ── Persist to IndexedDB on every state change (primary store) ────────────
  useEffect(() => {
    if (!idbReady.current) return   // don't overwrite IDB before we've read it
    idbSave(stateRef.current)
    // Also keep a lean localStorage copy as a fast seed for next page load
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(stateRef.current))
    } catch (_) {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

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

  // ── Debounced Gist push on state change ───────────────────────────────────
  useEffect(() => {
    const cfg = syncConfigRef.current
    if (!cfg) return
    if (skipNextPush.current) { skipNextPush.current = false; return }
    setSyncStatus('syncing')
    const timer = setTimeout(() => {
      pushToGist(cfg.token, cfg.gistId, stateRef.current)
        .then(() => setSyncStatus('synced'))
        .catch(err => { console.warn('Gist push failed:', err); setSyncStatus('error') })
    }, 2500)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  // ── Gist callbacks ────────────────────────────────────────────────────────

  const connectGist = useCallback(async (token, existingGistId) => {
    let gistId = existingGistId?.trim() || null
    if (gistId) {
      const data = await fetchFromGist(token, gistId)
      if (data?.collections?.length > 0) { skipNextPush.current = true; setState(data) }
    } else {
      gistId = await createGist(token, stateRef.current)
    }
    const cfg = { token, gistId }
    saveSyncConfig(cfg); setSyncConfig(cfg); setSyncStatus('synced')
    return { gistId }
  }, [])

  const pullFromGist = useCallback(async () => {
    const cfg = syncConfigRef.current
    if (!cfg) return
    setSyncStatus('syncing')
    try {
      const data = await fetchFromGist(cfg.token, cfg.gistId)
      if (data?.collections?.length > 0) { skipNextPush.current = true; setState(data) }
      setSyncStatus('synced')
    } catch (err) { console.warn('Manual pull failed:', err); setSyncStatus('error') }
  }, [])

  const disconnectGist = useCallback(() => {
    saveSyncConfig(null); setSyncConfig(null); setSyncStatus('idle')
  }, [])

  // ── Folder callbacks ──────────────────────────────────────────────────────

  const connectFolder = useCallback(async () => {
    const handle = await pickFolder()
    folderRef.current = handle
    setFolderStatus('saving')
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

  const addCollection    = useCallback(c  => setState(s => ({ ...s, collections: [...s.collections, c] })), [])
  const deleteCollection = useCallback(id => setState(s => ({ ...s, collections: s.collections.filter(c => c.id !== id) })), [])

  return {
    state,
    setState,
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
