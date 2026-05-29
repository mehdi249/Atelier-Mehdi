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

  const syncLabel =
    !syncConfig      ? 'Set up sync' :
    syncStatus === 'syncing' ? 'Syncing…' :
    syncStatus === 'error'   ? 'Sync error' :
    'Synced'

  const cloudClass =
    syncStatus === 'synced'  && syncConfig ? 'sync-cloud synced' :
    syncStatus === 'syncing' && syncConfig ? 'sync-cloud syncing' :
    syncStatus === 'error'   && syncConfig ? 'sync-cloud error' :
    'sync-cloud'

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1 className="logo">ATELIER</h1>
          <p className="logo-sub">by Mehdi</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className={cloudClass}
            onClick={() => setShowSync(true)}
            title={syncLabel}
            aria-label={syncLabel}
          >
            <svg width="22" height="18" viewBox="0 0 24 20" fill="currentColor">
              <path d="M19.35 7.04A7.49 7.49 0 0 0 12 1C9.11 1 6.6 2.64 5.35 5.04A5.994 5.994 0 0 0 0 11c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
            </svg>
          </button>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>+ New Collection</button>
        </div>
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
