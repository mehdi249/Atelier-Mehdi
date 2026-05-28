import { useState, useEffect, useCallback } from 'react'
import { createBaranTemplate } from './data/baran'

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

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (e) {
      console.warn('localStorage quota exceeded — images may not persist:', e)
    }
  }, [state])

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

  return { state, updateCollection, updateStage, addCollection, deleteCollection }
}
