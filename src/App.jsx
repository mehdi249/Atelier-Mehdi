import { useState } from 'react'
import { useStore } from './store'
import Dashboard from './components/Dashboard'
import ProjectView from './components/ProjectView'
import PinScreen from './components/PinScreen'
import PinSetup from './components/PinSetup'
import { hasPinSet } from './security'

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
  const [locked, setLocked] = useState(() => hasPinSet())
  const [showPinSetup, setShowPinSetup] = useState(false)

  if (locked) return <PinScreen onUnlock={() => setLocked(false)} />

  if (currentView === 'dashboard') {
    return (
      <>
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
          onLock={() => setLocked(true)}
          onOpenSecurity={() => setShowPinSetup(true)}
        />
        {showPinSetup && <PinSetup onClose={() => setShowPinSetup(false)} />}
      </>
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
