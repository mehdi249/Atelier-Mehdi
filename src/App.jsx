import { useState, useCallback } from 'react'
import { useStore } from './store'
import { idbSave } from './idbStore'
import Dashboard from './components/Dashboard'
import ProjectView from './components/ProjectView'
import PullToRefresh from './components/PullToRefresh'

export default function App() {
  const {
    state,
    setState,
    updateCollection,
    updateStage,
    addCollection,
    deleteCollection,
    syncStatus,
    syncConfig,
    connectGist,
    pullFromGist,
    disconnectGist,
    folderHandle,
    folderStatus,
    connectFolder,
    disconnectFolder,
  } = useStore()
  const [currentView, setCurrentView] = useState('dashboard')

  const handleImportState = useCallback(async (data) => {
    setState(data)
    await idbSave(data)
  }, [setState])

  // Pull-to-refresh: sync from Gist if connected, otherwise a no-op
  const handleRefresh = useCallback(async () => {
    if (syncConfig) await pullFromGist()
  }, [syncConfig, pullFromGist])

  if (currentView === 'dashboard') {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <Dashboard
          collections={state.collections}
          onOpen={setCurrentView}
          onAdd={addCollection}
          onDelete={deleteCollection}
          syncStatus={syncStatus}
          syncConfig={syncConfig}
          onConnectGist={connectGist}
          onPullFromGist={pullFromGist}
          onDisconnectGist={disconnectGist}
          folderHandle={folderHandle}
          folderStatus={folderStatus}
          onConnectFolder={connectFolder}
          onDisconnectFolder={disconnectFolder}
          allState={state}
          onImportState={handleImportState}
        />
      </PullToRefresh>
    )
  }

  const collection = state.collections.find(c => c.id === currentView)
  if (!collection) {
    setCurrentView('dashboard')
    return null
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <ProjectView
        collection={collection}
        onUpdate={(updater) => updateCollection(currentView, updater)}
        onUpdateStage={(stageName, data) => updateStage(currentView, stageName, data)}
        onDelete={() => {
          deleteCollection(currentView)
          setCurrentView('dashboard')
        }}
        onBack={() => setCurrentView('dashboard')}
      />
    </PullToRefresh>
  )
}
