import { useState, useEffect, useRef } from 'react'
import { verifyPin } from '../security'

export default function PinScreen({ onUnlock }) {
  const [pin, setPin] = useState('')
  const [shake, setShake] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function handleSubmit() {
    if (!pin) return
    const ok = await verifyPin(pin)
    if (ok) {
      onUnlock()
    } else {
      setError('Incorrect PIN')
      setShake(true)
      setPin('')
      setTimeout(() => {
        setShake(false)
        setError('')
      }, 700)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div className="pin-screen">
      <div className="pin-logo">
        <div className="pin-logo-text">ATELIER</div>
        <div className="pin-logo-sub">by Mehdi</div>
      </div>

      <div className="pin-form">
        <label className="pin-label">Enter PIN</label>
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          maxLength={6}
          pattern="[0-9]*"
          className={`pin-input${shake ? ' shake' : ''}`}
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
          onKeyDown={handleKeyDown}
          autoComplete="current-password"
        />
        <div className="pin-error">{error}</div>
        <button className="btn-primary" onClick={handleSubmit} disabled={!pin}>
          Unlock
        </button>
      </div>
    </div>
  )
}
