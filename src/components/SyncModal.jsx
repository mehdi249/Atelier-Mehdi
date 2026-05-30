import { useState } from 'react'

export default function SyncModal({ serverIP, serverReachable, wifiSyncStatus, onConnect, onPull, onDisconnect, onClose }) {
  const [ip, setIp]         = useState(serverIP || '')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)

  async function handleConnect() {
    const trimmed = ip.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    try {
      await onConnect(trimmed)
      onClose()
    } catch (err) {
      setError(err.message || 'Could not reach the server. Check the IP and make sure the server is running on your Mac.')
    } finally {
      setLoading(false)
    }
  }

  const dotClass =
    !serverReachable                  ? '' :
    wifiSyncStatus === 'synced'       ? 'synced'  :
    wifiSyncStatus === 'syncing'      ? 'syncing' :
    wifiSyncStatus === 'error'        ? 'error'   : 'synced'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {serverIP ? (
          <>
            <h2>Mac Sync</h2>

            <div className="sync-status-row">
              <span className={`sync-dot ${dotClass}`} />
              <span style={{ fontSize: 13, color: 'var(--text)' }}>
                {!serverReachable          ? 'Mac server offline' :
                 wifiSyncStatus === 'syncing' ? 'Syncing…' :
                 wifiSyncStatus === 'error'   ? 'Sync error' : 'Synced'}
              </span>
            </div>

            <label>Mac Server IP</label>
            <div className="sync-gist-id">
              <code>{serverIP}</code>
            </div>
            <p className="sync-note">
              Make sure your Mac is on the same Wi-Fi network and the server is running (<code>bash server/start.sh</code>).
            </p>

            <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
              <button className="btn-ghost-sm danger" onClick={() => { onDisconnect(); onClose() }}>
                Disconnect
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                {serverReachable && (
                  <button className="btn-ghost" onClick={async () => { await onPull(); onClose() }}>
                    Pull Latest
                  </button>
                )}
                <button className="btn-primary" onClick={onClose}>Done</button>
              </div>
            </div>
          </>
        ) : (
          <>
            <h2>Connect to Mac</h2>
            <p className="text-muted">
              Run the sync server on your Mac, then enter its local IP address. Your designs will sync automatically over Wi-Fi.
            </p>

            <label>Mac's IP Address or Hostname</label>
            <input
              className="input"
              placeholder="e.g. 192.168.1.5  or  macbook.local"
              value={ip}
              onChange={e => setIp(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConnect()}
              autoFocus
            />
            <p className="sync-note">
              Start the server with <code>bash server/start.sh</code> — it prints the IP on startup. Or find it in System Settings → Wi-Fi → Details. You can also use your Mac's hostname (e.g. <code>macbook.local</code>).
            </p>

            {error && (
              <div style={{ marginTop: 8 }}>
                <p style={{ fontSize: 12, color: 'var(--danger)', margin: 0 }}>{error}</p>
                {ip.trim() && (
                  <a
                    href={`https://${ip.trim()}:4321/ping`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 12, color: 'var(--accent)', display: 'block', marginTop: 6 }}
                  >
                    Tap to test connection in Safari →
                  </a>
                )}
              </div>
            )}

            <div className="modal-actions">
              <button className="btn-ghost" onClick={onClose}>Cancel</button>
              <button
                className="btn-primary"
                onClick={handleConnect}
                disabled={loading || !ip.trim()}
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
