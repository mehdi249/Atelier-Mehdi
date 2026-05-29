import { useState, useRef, useEffect, useCallback } from 'react'

const THRESHOLD = 64   // px of pull required to trigger
const MAX_PULL  = 82   // max visual pull distance

// Walk up the DOM and return true only if no scrollable ancestor has scrollTop > 0
function isScrolledToTop(el) {
  let node = el
  while (node && node !== document.documentElement) {
    const oy = window.getComputedStyle(node).overflowY
    if ((oy === 'auto' || oy === 'scroll') && node.scrollTop > 2) return false
    node = node.parentElement
  }
  return window.scrollY < 2
}

export default function PullToRefresh({ onRefresh, children }) {
  const [pullY, setPullY]   = useState(0)
  const [phase, setPhase]   = useState('idle') // idle | pulling | ready | refreshing | done

  const startYRef  = useRef(0)
  const activeRef  = useRef(false)
  const phaseRef   = useRef('idle')

  function go(p, y) {
    phaseRef.current = p
    setPhase(p)
    if (y !== undefined) setPullY(y)
  }

  const refresh = useCallback(async () => {
    go('refreshing', THRESHOLD)
    try { await onRefresh() } catch (_) {}
    go('done', THRESHOLD)
    setTimeout(() => go('idle', 0), 700)
  }, [onRefresh])

  useEffect(() => {
    function onStart(e) {
      if (phaseRef.current === 'refreshing') return
      if (!isScrolledToTop(e.target)) return
      startYRef.current = e.touches[0].clientY
      activeRef.current = true
    }

    function onMove(e) {
      if (!activeRef.current || phaseRef.current === 'refreshing') return
      const dy = e.touches[0].clientY - startYRef.current
      if (dy <= 0 || !isScrolledToTop(e.target)) { activeRef.current = false; return }
      const pull = Math.min(Math.round(dy * 0.45), MAX_PULL)
      go(pull >= THRESHOLD ? 'ready' : 'pulling', pull)
    }

    function onEnd() {
      if (!activeRef.current) return
      activeRef.current = false
      if (phaseRef.current === 'ready') {
        refresh()
      } else {
        go('idle', 0)
      }
    }

    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove',  onMove,  { passive: true })
    document.addEventListener('touchend',   onEnd,   { passive: true })
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove',  onMove)
      document.removeEventListener('touchend',   onEnd)
    }
  }, [refresh])

  const visible = pullY > 4
  const settling = phase === 'idle' || phase === 'done'

  return (
    <>
      <div
        className={`ptr-bar${phase === 'refreshing' ? ' ptr-refreshing' : ''}${phase === 'done' ? ' ptr-done' : ''}`}
        style={{
          height: visible ? pullY : 0,
          opacity: visible ? 1 : 0,
          transition: settling ? 'height 0.28s ease, opacity 0.28s ease' : 'none',
        }}
        aria-hidden
      >
        <div className={`ptr-icon${phase === 'refreshing' ? ' ptr-spin' : ''}`}>
          {phase === 'done'       ? '✓' :
           phase === 'refreshing' ? '↻' :
           phase === 'ready'      ? '↑' : '↓'}
        </div>
        <span className="ptr-label">
          {phase === 'done'       ? 'Updated'        :
           phase === 'refreshing' ? 'Syncing…'       :
           phase === 'ready'      ? 'Release to sync':
                                    'Pull to sync'}
        </span>
      </div>
      {children}
    </>
  )
}
