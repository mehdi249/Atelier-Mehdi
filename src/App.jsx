import { useState, useCallback } from 'react'
import { useStore } from './store'
import Dashboard from './components/Dashboard'
import ProjectView from './components/ProjectView'
import PullToRefresh from './components/PullToRefresh'

export default function App() {
  const {
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
  } = useStore()
  const [currentView, setCurrentView] = useState('dashboard')

  const handleRefresh = useCallback(async () => {
    if (serverReachable) await pullFromServerNow()
  }, [serverReachable, pullFromServerNow])

  if (currentView === 'dashboard') {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <Dashboard
          collections={state.collections}
          onOpen={setCurrentView}
          onAdd={addCollection}
          onDelete={deleteCollection}
          serverIP={serverIP}
          serverReachable={serverReachable}
          wifiSyncStatus={wifiSyncStatus}
          onConnectServer={connectServer}
          onPullFromServer={pullFromServerNow}
          onDisconnectServer={disconnectServer}
          folderHandle={folderHandle}
          folderStatus={folderStatus}
          onConnectFolder={connectFolder}
          onDisconnectFolder={disconnectFolder}
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
