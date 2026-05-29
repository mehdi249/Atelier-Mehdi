import { useState } from 'react'

export default function SyncModal({ syncConfig, syncStatus, onConnect, onPull, onDisconnect, onClose }) {
  const [token, setToken] = useState('')
  const [gistId, setGistId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  async function handleConnect() {
    if (!token.trim()) return
    setLoading(true)
    setError(null)
    try {
      await onConnect(token.trim(), gistId.trim() || null)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to connect. Check your token and Gist ID.')
    } finally {
      setLoading(false)
    }
  }

  function handleCopy() {
    if (!syncConfig?.gistId) return
    navigator.clipboard.writeText(syncConfig.gistId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  function handleDisconnect() {
    onDisconnect()
    onClose()
  }

  const dotClass =
    syncStatus === 'synced'  ? 'synced'  :
    syncStatus === 'syncing' ? 'syncing' :
    syncStatus === 'error'   ? 'error'   : 'synced'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {syncConfig ? (
          <>
            <h2>Sync Active</h2>

            <div className="sync-status-row">
              <span className={`sync-dot ${dotClass}`} />
              <span style={{ fontSize: 13, color: 'var(--text)' }}>
                {syncStatus === 'syncing' ? 'Syncing…' :
                 syncStatus === 'error'   ? 'Sync error' :
                 'Synced'}
              </span>
            </div>

            <label>Gist ID</label>
            <div className="sync-gist-id">
              <code>{syncConfig.gistId}</code>
              <button className="sync-copy-btn" onClick={handleCopy}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="sync-note">
              To sync another device, enter this Gist ID when connecting there.
            </p>

            <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
              <button
                className="btn-ghost-sm danger"
                onClick={handleDisconnect}
              >
                Disconnect
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn-ghost"
                  onClick={async () => { await onPull(); onClose() }}
                  title="Force-load the latest data from the Gist"
                >
                  Pull Latest
                </button>
                <button className="btn-primary" onClick={onClose}>Done</button>
              </div>
            </div>
          </>
        ) : (
          <>
            <h2>Sync Across Devices</h2>
            <p className="text-muted">
              Connect to a private GitHub Gist to keep your collections in sync across all your devices.
            </p>

            <label>Step 1 — GitHub Token</label>
            <p className="sync-step">
              <a
                href="https://github.com/settings/personal-access-tokens/new"
                target="_blank"
                rel="noopener noreferrer"
              >
                Create a fine-grained personal access token at GitHub
              </a>
              {' '}— more secure than classic tokens. Set an expiration of 30–90 days (you'll get an email reminder before it expires). Grant only <strong style={{ color: 'var(--text)', fontWeight: 600 }}>Gists: Read and Write</strong> — nothing else needed.
            </p>
            <input
              className="input"
              type="password"
              placeholder="github_pat_..."
              value={token}
              onChange={e => setToken(e.target.value)}
              style={{ marginTop: 8 }}
            />
            <p className="sync-note">Your token is stored only on this device. Never share it.</p>

            <label>Step 2 — Gist ID (leave blank to create a new one)</label>
            <input
              className="input"
              placeholder="Optional — paste from another device"
              value={gistId}
              onChange={e => setGistId(e.target.value)}
            />

            {error && (
              <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 8 }}>{error}</p>
            )}

            <div className="modal-actions">
              <button className="btn-ghost" onClick={onClose}>Cancel</button>
              <button
                className="btn-primary"
                onClick={handleConnect}
                disabled={loading || !token.trim()}
              >
                {loading ? 'Connecting…' : 'Connect'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
