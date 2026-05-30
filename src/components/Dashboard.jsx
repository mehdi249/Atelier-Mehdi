import { useState, useEffect, useRef } from 'react'
import CollectionCard from './CollectionCard'
import SyncModal from './SyncModal'
import { createEmptyCollection } from '../data/baran'
import { exportCollectionJSON } from '../utils'
import { isSupported as fsSupportd } from '../fsStorage'
import { idbSave } from '../idbStore'

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
  folderHandle,
  folderStatus,
  onConnectFolder,
  onDisconnectFolder,
  allState,
  onImportState,
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [tagline, setTagline] = useState('')
  const [color, setColor] = useState('#1a1a2e')
  const [showSync, setShowSync] = useState(false)
  const [showFolderMenu, setShowFolderMenu] = useState(false)
  const [folderConnecting, setFolderConnecting] = useState(false)
  const folderMenuRef  = useRef(null)
  const importInputRef = useRef(null)

  useEffect(() => {
    if (!showFolderMenu) return
    function close(e) { if (folderMenuRef.current && !folderMenuRef.current.contains(e.target)) setShowFolderMenu(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [showFolderMenu])

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

  function handleExportBackup() {
    const blob = new Blob([JSON.stringify(allState)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `atelier-backup-${new Date().toISOString().slice(0,10)}.json`
    document.body.appendChild(a); a.click()
    document.body.removeChild(a); URL.revokeObjectURL(url)
    setShowFolderMenu(false)
  }

  function handleImportBackup(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result)
        if (data?.collections?.length > 0) {
          onImportState(data)
          setShowFolderMenu(false)
        }
      } catch { alert('Invalid backup file.') }
    }
    reader.readAsText(file)
  }

  async function handleConnectFolder() {
    setFolderConnecting(true)
    try { await onConnectFolder() } catch (_) {}
    setFolderConnecting(false)
    setShowFolderMenu(false)
  }

  const folderName = folderHandle?.name ?? null
  const folderIcon = folderHandle
    ? (folderStatus === 'saving' ? '↑' : folderStatus === 'error' ? '!' : '✓')
    : '+'
  const folderTitle = folderHandle
    ? `iCloud folder: ${folderName} — ${folderStatus === 'saving' ? 'Saving…' : folderStatus === 'error' ? 'Error' : 'Saved'}`
    : 'Connect iCloud folder for unlimited storage'

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
          {/* iCloud folder button — always visible, explains if unsupported */}
          <div style={{ position: 'relative' }} ref={folderMenuRef}>
            <button
              className={`folder-btn${folderHandle ? (folderStatus === 'error' ? ' folder-error' : ' folder-connected') : ''}`}
              onClick={() => setShowFolderMenu(m => !m)}
              title={folderTitle}
              aria-label={folderTitle}
            >
              <svg width="18" height="16" viewBox="0 0 24 20" fill="currentColor">
                <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
              </svg>
              <span className="folder-btn-badge">{folderIcon}</span>
            </button>
            {showFolderMenu && (
              <div className="folder-menu">
                {!fsSupportd() ? (
                  /* ── Not supported (iOS Safari / PWA) ── */
                  <>
                    <div className="folder-menu-name">
                      <span className="folder-menu-label">iCloud Storage</span>
                      <span className="folder-menu-value" style={{ color: 'var(--text-muted)' }}>iOS limitation</span>
                    </div>
                    <p className="folder-menu-desc">
                      Apple doesn't allow web apps to access iCloud Drive folders on iPhone or iPad — this is an iOS restriction, not something we can work around.
                    </p>
                    <p className="folder-menu-desc" style={{ marginTop: -2 }}>
                      <strong style={{ color: 'var(--text)' }}>Good news:</strong> your data is now stored in IndexedDB — no more 5 MB limit. Storage is only limited by your device's free space.
                    </p>
                    <p className="folder-menu-desc" style={{ marginTop: -2 }}>
                      To move data between devices, use <strong style={{ color: 'var(--text)' }}>Export Backup</strong> below — save the file to iCloud Files and import it on your other device.
                    </p>
                    <input
                      ref={importInputRef}
                      type="file"
                      accept=".json"
                      style={{ display: 'none' }}
                      onChange={e => { handleImportBackup(e.target.files[0]); e.target.value = '' }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="folder-menu-action" style={{ flex: 1 }} onClick={handleExportBackup}>
                        ↓ Export Backup
                      </button>
                      <button className="folder-menu-action" style={{ flex: 1 }} onClick={() => importInputRef.current?.click()}>
                        ↑ Import Backup
                      </button>
                    </div>
                    <button className="folder-menu-action" onClick={() => setShowFolderMenu(false)}>Got it</button>
                  </>
                ) : folderHandle ? (
                  /* ── Connected ── */
                  <>
                    <div className="folder-menu-name">
                      <span className="folder-menu-label">iCloud Folder</span>
                      <span className="folder-menu-value">{folderName}</span>
                    </div>
                    <div className="folder-menu-status">
                      {folderStatus === 'saving'  && '↑ Saving to iCloud…'}
                      {folderStatus === 'saved'   && '✓ All changes saved'}
                      {folderStatus === 'error'   && '⚠ Save error — check folder access'}
                      {folderStatus === 'loading' && '↓ Loading from iCloud…'}
                    </div>
                    <button className="folder-menu-action" onClick={() => { setShowFolderMenu(false); onDisconnectFolder() }}>
                      Disconnect folder
                    </button>
                  </>
                ) : (
                  /* ── Not connected ── */
                  <>
                    <div className="folder-menu-name">
                      <span className="folder-menu-label">iCloud Storage</span>
                      <span className="folder-menu-value" style={{ color: 'var(--text-muted)' }}>Not connected</span>
                    </div>
                    <p className="folder-menu-desc">
                      Pick a folder in iCloud Drive. All your designs, patterns, and
                      sketches will be stored there and sync automatically across your
                      iPhone, iPad, and Mac — no size limit.
                    </p>
                    <button
                      className="folder-menu-action primary"
                      onClick={handleConnectFolder}
                      disabled={folderConnecting}
                    >
                        {folderConnecting ? 'Opening folder picker…' : 'Choose iCloud folder'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
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
