import { useState, useEffect, useCallback, useRef } from 'react'
import { createBaranTemplate } from './data/baran'
import {
  loadSyncConfig,
  saveSyncConfig,
  fetchFromGist,
  pushToGist,
  createGist,
} from './sync'

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

  // Always-current refs to avoid stale closures
  const stateRef = useRef(state)
  const syncConfigRef = useRef(syncConfig)
  const skipNextPush = useRef(false)

  useEffect(() => { stateRef.current = state }, [state])
  useEffect(() => { syncConfigRef.current = syncConfig }, [syncConfig])

  // Persist to localStorage on every state change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (e) {
      console.warn('localStorage quota exceeded — images may not persist:', e)
    }
  }, [state])

  // On mount: if syncConfig exists, pull from gist
  useEffect(() => {
    const cfg = loadSyncConfig()
    if (!cfg) return
    setSyncStatus('syncing')
    fetchFromGist(cfg.token, cfg.gistId)
      .then(data => {
        if (data?.collections?.length > 0) {
          skipNextPush.current = true
          setState(data)
        }
        setSyncStatus('synced')
      })
      .catch(err => {
        console.warn('Gist fetch on mount failed:', err)
        setSyncStatus('error')
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced push on state change (skip if skipNextPush is set)
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

  const connectGist = useCallback(async (token, existingGistId) => {
    let gistId = existingGistId?.trim() || null

    if (gistId) {
      // Existing gist — fetch and use it (gist wins)
      const data = await fetchFromGist(token, gistId)
      if (data?.collections?.length > 0) {
        skipNextPush.current = true
        setState(data)
      }
    } else {
      // No gist yet — create one from current data
      gistId = await createGist(token, stateRef.current)
    }

    const cfg = { token, gistId }
    saveSyncConfig(cfg)
    setSyncConfig(cfg)
    setSyncStatus('synced')
    return { gistId }
  }, [])

  const disconnectGist = useCallback(() => {
    saveSyncConfig(null)
    setSyncConfig(null)
    setSyncStatus('idle')
  }, [])

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
    disconnectGist,
  }
}
