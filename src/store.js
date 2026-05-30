import { useState, useEffect, useCallback, useRef } from 'react'
import { createBaranTemplate } from './data/baran'
import {
  isSupported as fsSupportd,
  tryRestoreFolder,
  pickFolder,
  forgetFolder,
  saveToFolder,
  loadFromFolder,
} from './fsStorage'
import { idbLoad, idbSave } from './idbStore'
import {
  loadServerIP,
  saveServerIP,
  pingServer,
  pushToServer,
  pullFromServer,
} from './wifiSync'

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
  const [state, setState]                     = useState(seedState)
  const [wifiSyncStatus, setWifiSyncStatus]   = useState('idle')
  const [serverIP, setServerIP]               = useState(loadServerIP)
  const [serverReachable, setServerReachable] = useState(false)
  const [folderHandle, setFolderHandle]       = useState(null)
  const [folderStatus, setFolderStatus]       = useState('idle')

  const stateRef     = useRef(state)
  const folderRef    = useRef(null)
  const skipNextPush = useRef(false)
  const idbReady     = useRef(false)
  const serverIPRef  = useRef(serverIP)
  const reachableRef = useRef(false)
  const uploadedRef  = useRef(new Map())  // filename → fingerprint

  useEffect(() => { stateRef.current = state }, [state])
  useEffect(() => { serverIPRef.current = serverIP }, [serverIP])

  // ── On mount: load from IndexedDB ────────────────────────────────────────────
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

  // ── On mount: ping server, pull if reachable ──────────────────────────────
  useEffect(() => {
    const ip = loadServerIP()
    if (!ip) return
    pingServer(ip).then(async ok => {
      reachableRef.current = ok
      setServerReachable(ok)
      if (!ok) return
      setWifiSyncStatus('syncing')
      try {
        const data = await pullFromServer(ip, uploadedRef.current)
        if (data?.collections?.length > 0) {
          skipNextPush.current = true
          setState(data)
        }
        setWifiSyncStatus('synced')
      } catch (err) {
        console.warn('WiFi pull on mount failed:', err)
        setWifiSyncStatus('error')
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Persist to IndexedDB on every state change ────────────────────────────
  useEffect(() => {
    if (!idbReady.current) return
    idbSave(stateRef.current)
    try { localStorage.setItem(LS_KEY, JSON.stringify(stateRef.current)) } catch (_) {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  // ── Debounced save to iCloud folder ──────────────────────────────────────
  useEffect(() => {
    const handle = folderRef.current
    if (!handle) return
    setFolderStatus('saving')
    const timer = setTimeout(() => {
      saveToFolder(handle, stateRef.current)
        .then(() => setFolderStatus('saved'))
        .catch(err => { console.warn('Folder save failed:', err); setFolderStatus('error') })
    }, 2000)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  // ── Debounced WiFi push on state change ───────────────────────────────────
  useEffect(() => {
    if (!reachableRef.current) return
    if (skipNextPush.current) { skipNextPush.current = false; return }
    const ip = serverIPRef.current
    if (!ip) return
    setWifiSyncStatus('syncing')
    const timer = setTimeout(() => {
      pushToServer(ip, stateRef.current, uploadedRef.current)
        .then(() => setWifiSyncStatus('synced'))
        .catch(err => { console.warn('WiFi push failed:', err); setWifiSyncStatus('error') })
    }, 2500)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  // ── WiFi callbacks ────────────────────────────────────────────────────────

  const connectServer = useCallback(async (ip) => {
    const ok = await pingServer(ip)
    if (!ok) throw new Error(`Server not reachable at ${ip}`)
    saveServerIP(ip)
    setServerIP(ip)
    serverIPRef.current  = ip
    reachableRef.current = true
    setServerReachable(true)
    setWifiSyncStatus('syncing')
    try {
      const data = await pullFromServer(ip, uploadedRef.current)
      if (data?.collections?.length > 0) { skipNextPush.current = true; setState(data) }
      setWifiSyncStatus('synced')
    } catch { setWifiSyncStatus('error') }
  }, [])

  const disconnectServer = useCallback(() => {
    saveServerIP(null)
    setServerIP(null)
    serverIPRef.current  = null
    reachableRef.current = false
    setServerReachable(false)
    setWifiSyncStatus('idle')
    uploadedRef.current  = new Map()
  }, [])

  const pullFromServerNow = useCallback(async () => {
    const ip = serverIPRef.current
    if (!ip) return
    setWifiSyncStatus('syncing')
    try {
      const data = await pullFromServer(ip, uploadedRef.current)
      if (data?.collections?.length > 0) { skipNextPush.current = true; setState(data) }
      setWifiSyncStatus('synced')
    } catch (err) { console.warn('Manual pull failed:', err); setWifiSyncStatus('error') }
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
    updateCollection,
    updateStage,
    addCollection,
    deleteCollection,
    serverIP,
    serverReachable,
    wifiSyncStatus,
    connectServer,
    disconnectServer,
    pullFromServerNow,
    folderHandle,
    folderStatus,
    connectFolder,
    disconnectFolder,
  }
}
