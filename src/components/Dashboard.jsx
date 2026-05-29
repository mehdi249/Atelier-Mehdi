import { useState } from 'react'
import CollectionCard from './CollectionCard'
import SyncModal from './SyncModal'
import { createEmptyCollection } from '../data/baran'
import { exportCollectionJSON } from '../utils'

export default function Dashboard({
  collections,
  onOpen,
  onAdd,
  onDelete,
  syncStatus,
  syncConfig,
  onConnectGist,
  onPullFromGist,
  onDisconnectGist,
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [tagline, setTagline] = useState('')
  const [color, setColor] = useState('#1a1a2e')
  const [showSync, setShowSync] = useState(false)

  function handleAdd() {
    if (!name.trim()) return
    const c = createEmptyCollection()
    c.name = name.trim().toUpperCase()
    c.tagline = tagline.trim()
    c.coverColor = color
    onAdd(c)
    setName('')
    setTagline('')
    setColor('#1a1a2e')
    setShowAdd(false)
  }

  function renderSyncChip() {
    if (!syncConfig) {
      return (
        <button className="sync-chip sync-idle" onClick={() => setShowSync(true)}>
          ☁ Set up sync
        </button>
      )
    }
    if (syncStatus === 'syncing') {
      return <span className="sync-chip sync-syncing">⟳ Syncing…</span>
    }
    if (syncStatus === 'error') {
      return (
        <button className="sync-chip sync-error" onClick={() => setShowSync(true)}>
          ⚠ Sync error
        </button>
      )
    }
    // synced (or idle with config)
    return (
      <span className="sync-chip sync-synced" onClick={() => setShowSync(true)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && setShowSync(true)}>
        ✓ Synced
      </span>
    )
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1 className="logo">ATELIER</h1>
          <p className="logo-sub">by Mehdi</p>
        </div>
        {renderSyncChip()}
        <button className="btn-primary" onClick={() => setShowAdd(true)}>+ New Collection</button>
      </header>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>New Collection</h2>
            <label>Name</label>
            <input
              className="input input-large"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="COLLECTION NAME"
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              autoFocus
            />
            <label>Tagline</label>
            <input
              className="input"
              value={tagline}
              onChange={e => setTagline(e.target.value)}
              placeholder="Season · Theme"
            />
            <label>Cover Colour</label>
            <input
              type="color"
              className="input-color"
              value={color}
              onChange={e => setColor(e.target.value)}
            />
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleAdd}>Create</button>
            </div>
          </div>
        </div>
      )}

      {showSync && (
        <SyncModal
          syncConfig={syncConfig}
          syncStatus={syncStatus}
          onConnect={onConnectGist}
          onPull={onPullFromGist}
          onDisconnect={onDisconnectGist}
          onClose={() => setShowSync(false)}
        />
      )}

      {collections.length === 0 ? (
        <div className="empty-state">No collections yet. Start with a new one.</div>
      ) : (
        <div className="card-grid">
          {collections.map(c => (
            <CollectionCard
              key={c.id}
              collection={c}
              onOpen={() => onOpen(c.id)}
              onDelete={() => onDelete(c.id)}
              onExport={() => exportCollectionJSON(c)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
