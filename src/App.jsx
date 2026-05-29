import { useState } from 'react'
import { useStore } from './store'
import Dashboard from './components/Dashboard'
import ProjectView from './components/ProjectView'

export default function App() {
  const {
    state,
    updateCollection,
    updateStage,
    addCollection,
    deleteCollection,
    syncStatus,
    syncConfig,
    connectGist,
    pullFromGist,
    disconnectGist,
  } = useStore()
  const [currentView, setCurrentView] = useState('dashboard')

  if (currentView === 'dashboard') {
    return (
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
      />
    )
  }

  const collection = state.collections.find(c => c.id === currentView)
  if (!collection) {
    setCurrentView('dashboard')
    return null
  }

  return (
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
  )
}
