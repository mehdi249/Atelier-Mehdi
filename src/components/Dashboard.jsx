import { useState, useEffect, useRef } from 'react'
import CollectionCard from './CollectionCard'
import SyncModal from './SyncModal'
import { createEmptyCollection } from '../data/baran'
import { exportCollectionJSON } from '../utils'
import { isSupported as fsSupportd } from '../fsStorage'

export default function Dashboard({
  collections,
  onOpen,
  onAdd,
  onDelete,
  serverIP,
  serverReachable,
  wifiSyncStatus,
  onConnectServer,
  onPullFromServer,
  onDisconnectServer,
  folderHandle,
  folderStatus,
  onConnectFolder,
  onDisconnectFolder,
}) {
  const [showAdd, setShowAdd]               = useState(false)
  const [name, setName]                     = useState('')
  const [tagline, setTagline]               = useState('')
  const [color, setColor]                   = useState('#1a1a2e')
  const [showSync, setShowSync]             = useState(false)
  const [showFolderMenu, setShowFolderMenu] = useState(false)
  const [folderConnecting, setFolderConnecting] = useState(false)
  const folderMenuRef = useRef(null)

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

  async function handleConnectFolder() {
    setFolderConnecting(true)
    try { await onConnectFolder() } catch (_) {}
    setFolderConnecting(false)
    setShowFolderMenu(false)
  }

  const folderName  = folderHandle?.name ?? null
  const folderIcon  = folderHandle
    ? (folderStatus === 'saving' ? '↑' : folderStatus === 'error' ? '!' : '✓')
    : '+'
  const folderTitle = folderHandle
    ? `iCloud folder: ${folderName} — ${folderStatus === 'saving' ? 'Saving…' : folderStatus === 'error' ? 'Error' : 'Saved'}`
    : 'Connect iCloud folder for unlimited storage'

  const syncLabel =
    !serverIP                    ? 'Connect to Mac' :
    !serverReachable             ? 'Mac offline'    :
    wifiSyncStatus === 'syncing' ? 'Syncing…'       :
    wifiSyncStatus === 'error'   ? 'Sync error'     :
    'Synced'

  const cloudClass =
    serverReachable && wifiSyncStatus === 'synced'  ? 'sync-cloud synced'  :
    serverReachable && wifiSyncStatus === 'syncing' ? 'sync-cloud syncing' :
    serverReachable && wifiSyncStatus === 'error'   ? 'sync-cloud error'   :
    'sync-cloud'

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1 className="logo">ATELIER</h1>
          <p className="logo-sub">by Mehdi</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* iCloud folder button */}
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
                      Apple doesn't allow web apps to access iCloud Drive folders on iPhone or iPad.
                    </p>
                    <p className="folder-menu-desc" style={{ marginTop: -2 }}>
                      <strong style={{ color: 'var(--text)' }}>Your data</strong> is stored in IndexedDB on this device. Use the <strong style={{ color: 'var(--text)' }}>Wi-Fi sync button</strong> to keep everything in sync with your Mac automatically.
                    </p>
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

          {/* Wi-Fi / Mac sync button */}
          <button
            className={cloudClass}
            onClick={() => setShowSync(true)}
            title={syncLabel}
            aria-label={syncLabel}
          >
            <svg width="20" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M1 6.1C3.9 3.4 7.8 2 12 2s8.1 1.4 11 4.1l-2 2C18.8 5.8 15.6 4 12 4S5.2 5.8 3 8.1L1 6.1zm4 4C6.6 8.5 9.2 7 12 7s5.4 1.5 7 3.9l-2 2C15.7 11.1 14 10 12 10s-3.7 1.1-5 2.9l-2-2.8zM12 15a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-3.5-2.5 2 2a2.4 2.4 0 0 1 3 0l2-2a5 5 0 0 0-7 0z"/>
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
          serverIP={serverIP}
          serverReachable={serverReachable}
          wifiSyncStatus={wifiSyncStatus}
          onConnect={onConnectServer}
          onPull={onPullFromServer}
          onDisconnect={onDisconnectServer}
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
