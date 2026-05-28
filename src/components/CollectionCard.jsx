import { useState, useEffect, useRef } from 'react'
import { calculateProgress, currentStageLabel } from '../utils'

export default function CollectionCard({ collection, onOpen, onDelete, onExport }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const progress = calculateProgress(collection)
  const stage = currentStageLabel(collection)

  useEffect(() => {
    if (!menuOpen) return
    function close(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  return (
    <div className="collection-card" onClick={onOpen}>
      <div className="card-cover" style={{ background: collection.coverColor }}>
        <div className="card-progress-bar">
          <div className="card-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="card-body">
        <div className="card-top">
          <h3 className="card-name">{collection.name}</h3>
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              className="btn-menu"
              onClick={e => { e.stopPropagation(); setMenuOpen(m => !m) }}
              title="Options"
            >⋯</button>
            {menuOpen && (
              <div className="card-menu">
                <button onClick={e => { e.stopPropagation(); onExport(); setMenuOpen(false) }}>
                  Export JSON
                </button>
                <button onClick={e => { e.stopPropagation(); window.print(); setMenuOpen(false) }}>
                  Export PDF
                </button>
                <button
                  className="danger"
                  onClick={e => {
                    e.stopPropagation()
                    if (window.confirm(`Delete "${collection.name}"?`)) onDelete()
                    setMenuOpen(false)
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
        {collection.tagline && <p className="card-tagline">{collection.tagline}</p>}
        <div className="card-footer">
          <span className="card-stage">{stage}</span>
          <span className="card-pct">{progress}%</span>
        </div>
      </div>
    </div>
  )
}
