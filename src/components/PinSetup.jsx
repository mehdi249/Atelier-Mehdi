import { useState } from 'react'
import { verifyPin, setPin, clearPin, hasPinSet } from '../security'

export default function PinSetup({ onClose }) {
  const pinSet = hasPinSet()

  // Set PIN state
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinSetError, setPinSetError] = useState('')

  // Change PIN state
  const [currentPinChange, setCurrentPinChange] = useState('')
  const [changeNew, setChangeNew] = useState('')
  const [changeConfirm, setChangeConfirm] = useState('')
  const [changeError, setChangeError] = useState('')

  // Remove PIN state
  const [currentPinRemove, setCurrentPinRemove] = useState('')
  const [removeError, setRemoveError] = useState('')

  const [success, setSuccess] = useState('')

  function validatePin(p) {
    if (!/^\d{4,6}$/.test(p)) return 'PIN must be 4–6 digits'
    return null
  }

  async function handleSetPin() {
    const err = validatePin(newPin)
    if (err) { setPinSetError(err); return }
    if (newPin !== confirmPin) { setPinSetError('PINs do not match'); return }
    await setPin(newPin)
    setSuccess('PIN set successfully')
    setTimeout(() => { onClose() }, 900)
  }

  async function handleChangePin() {
    const ok = await verifyPin(currentPinChange)
    if (!ok) { setChangeError('Current PIN is incorrect'); return }
    const err = validatePin(changeNew)
    if (err) { setChangeError(err); return }
    if (changeNew !== changeConfirm) { setChangeError('New PINs do not match'); return }
    await setPin(changeNew)
    setSuccess('PIN changed successfully')
    setTimeout(() => { onClose() }, 900)
  }

  async function handleRemovePin() {
    const ok = await verifyPin(currentPinRemove)
    if (!ok) { setRemoveError('Current PIN is incorrect'); return }
    clearPin()
    setSuccess('PIN removed')
    setTimeout(() => { onClose() }, 900)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {success ? (
          <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--accent)', fontSize: 14, fontWeight: 600, letterSpacing: '0.04em' }}>
            {success}
          </div>
        ) : !pinSet ? (
          <>
            <h2>Set a PIN</h2>
            <p className="text-muted">Lock the app with a 4–6 digit PIN.</p>

            <label>New PIN</label>
            <input
              className="input"
              type="password"
              inputMode="numeric"
              maxLength={6}
              pattern="[0-9]*"
              placeholder="4–6 digits"
              value={newPin}
              onChange={e => { setNewPin(e.target.value.replace(/\D/g, '')); setPinSetError('') }}
              autoFocus
            />

            <label>Confirm PIN</label>
            <input
              className="input"
              type="password"
              inputMode="numeric"
              maxLength={6}
              pattern="[0-9]*"
              placeholder="Repeat PIN"
              value={confirmPin}
              onChange={e => { setConfirmPin(e.target.value.replace(/\D/g, '')); setPinSetError('') }}
              onKeyDown={e => e.key === 'Enter' && handleSetPin()}
            />

            {pinSetError && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 8 }}>{pinSetError}</p>}

            <div className="modal-actions">
              <button className="btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn-primary" onClick={handleSetPin} disabled={!newPin || !confirmPin}>
                Set PIN
              </button>
            </div>
          </>
        ) : (
          <>
            <h2>PIN Security</h2>

            {/* Change PIN */}
            <h3 style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14, marginTop: 4 }}>
              Change PIN
            </h3>

            <label>Current PIN</label>
            <input
              className="input"
              type="password"
              inputMode="numeric"
              maxLength={6}
              pattern="[0-9]*"
              placeholder="Current PIN"
              value={currentPinChange}
              onChange={e => { setCurrentPinChange(e.target.value.replace(/\D/g, '')); setChangeError('') }}
              autoFocus
            />

            <label>New PIN</label>
            <input
              className="input"
              type="password"
              inputMode="numeric"
              maxLength={6}
              pattern="[0-9]*"
              placeholder="4–6 digits"
              value={changeNew}
              onChange={e => { setChangeNew(e.target.value.replace(/\D/g, '')); setChangeError('') }}
            />

            <label>Confirm New PIN</label>
            <input
              className="input"
              type="password"
              inputMode="numeric"
              maxLength={6}
              pattern="[0-9]*"
              placeholder="Repeat new PIN"
              value={changeConfirm}
              onChange={e => { setChangeConfirm(e.target.value.replace(/\D/g, '')); setChangeError('') }}
              onKeyDown={e => e.key === 'Enter' && handleChangePin()}
            />

            {changeError && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 8 }}>{changeError}</p>}

            <div className="modal-actions">
              <button
                className="btn-primary"
                onClick={handleChangePin}
                disabled={!currentPinChange || !changeNew || !changeConfirm}
              >
                Change PIN
              </button>
            </div>

            {/* Remove PIN */}
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 24, paddingTop: 20 }}>
              <h3 style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>
                Remove PIN
              </h3>

              <label>Current PIN</label>
              <input
                className="input"
                type="password"
                inputMode="numeric"
                maxLength={6}
                pattern="[0-9]*"
                placeholder="Enter current PIN to remove"
                value={currentPinRemove}
                onChange={e => { setCurrentPinRemove(e.target.value.replace(/\D/g, '')); setRemoveError('') }}
                onKeyDown={e => e.key === 'Enter' && handleRemovePin()}
              />

              {removeError && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 8 }}>{removeError}</p>}

              <div className="modal-actions">
                <button className="btn-ghost" onClick={onClose}>Cancel</button>
                <button
                  className="btn-ghost-sm danger"
                  onClick={handleRemovePin}
                  disabled={!currentPinRemove}
                >
                  Remove PIN
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
