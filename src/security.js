const PIN_KEY = 'atelier-pin'
const SALT = 'atelier-mehdi-2025'

export async function hashPin(pin) {
  const data = new TextEncoder().encode(SALT + pin)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPin(pin) {
  const stored = localStorage.getItem(PIN_KEY)
  if (!stored) return true
  return (await hashPin(pin)) === stored
}

export async function setPin(pin) {
  localStorage.setItem(PIN_KEY, await hashPin(pin))
}

export function clearPin() { localStorage.removeItem(PIN_KEY) }
export function hasPinSet() { return !!localStorage.getItem(PIN_KEY) }
