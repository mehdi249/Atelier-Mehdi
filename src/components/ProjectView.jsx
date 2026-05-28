import { useState, useRef, useEffect } from 'react'
import MindMap from './stages/MindMap'
import Research from './stages/Research'
import Sketches from './stages/Sketches'
import StyleCards from './stages/StyleCards'
import GenericStage from './stages/GenericStage'
import Lookbook from './stages/Lookbook'
import { calculateProgress, exportCollectionJSON, exportMindMapSVG } from '../utils'

const STAGES = [
  { key: 'mindMap',      label: 'Mind Map',     icon: '◎' },
  { key: 'research',     label: 'Research',     icon: '◈' },
  { key: 'sketches',     label: 'Sketches',     icon: '◇' },
  { key: 'styleCards',   label: 'Style Cards',  icon: '◆' },
  { key: 'patterns',     label: 'Patterns',     icon: '◐' },
  { key: 'clo3d',        label: 'CLO3D',        icon: '◉' },
  { key: 'construction', label: 'Construction', icon: '◑' },
  { key: 'lookbook',     label: 'Lookbook',     icon: '◼' },
]

export default function ProjectView({ collection, onUpdate, onUpdateStage, onDelete, onBack }) {
  const [activeStage, setActiveStage] = useState('mindMap')
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(collection.name)
  const [editTagline, setEditTagline] = useState(collection.tagline)
  const [editColor, setEditColor] = useState(collection.coverColor)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [progressVal, setProgressVal] = useState('')
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef(null)

  const progress = calculateProgress(collection)

  useEffect(() => {
    if (!exportOpen) return
    function close(e) {
      if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [exportOpen])

  function saveEdit() {
    const trimmed = editName.trim().toUpperCase()
    onUpdate(c => ({
      name: trimmed || c.name,
      tagline: editTagline.trim(),
      coverColor: editColor,
    }))
    setEditing(false)
  }

  function openProgressModal() {
    setProgressVal(collection.progressOverride ?? '')
    setShowProgressModal(true)
  }

  function applyProgress() {
    const val = progressVal === '' ? null : Math.max(0, Math.min(100, Number(progressVal)))
    onUpdate(() => ({ progressOverride: val }))
    setShowProgressModal(false)
  }

  function renderStage() {
    const stageData = collection.stages[activeStage]
    const update = (data) => onUpdateStage(activeStage, data)
    switch (activeStage) {
      case 'mindMap':      return <MindMap data={stageData} onChange={update} />
      case 'research':     return <Research data={stageData} onChange={update} />
      case 'sketches':     return <Sketches data={stageData} onChange={update} />
      case 'styleCards':   return <StyleCards data={stageData} onChange={update} />
      case 'patterns':     return <GenericStage title="Patterns" data={stageData} onChange={update} />
      case 'clo3d':        return <GenericStage title="CLO3D" data={stageData} onChange={update} />
      case 'construction': return <GenericStage title="Construction" data={stageData} onChange={update} />
      case 'lookbook':     return <Lookbook data={stageData} onChange={update} />
      default:             return null
    }
  }

  return (
    <div className="project-view">
      <div className="project-header">
        <button className="btn-back" onClick={onBack}>← Collections</button>

        <div className="project-title-area">
          {editing ? (
            <div className="edit-header-form">
              <input
                className="input input-large"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="NAME"
                style={{ width: 200 }}
                onKeyDown={e => e.key === 'Enter' && saveEdit()}
                autoFocus
              />
              <input
                className="input"
                value={editTagline}
                onChange={e => setEditTagline(e.target.value)}
                placeholder="Tagline"
                style={{ width: 200 }}
              />
              <input
                type="color"
                className="input-color"
                value={editColor}
                onChange={e => setEditColor(e.target.value)}
              />
              <div className="edit-actions">
                <button className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
                <button className="btn-primary" onClick={saveEdit}>Save</button>
              </div>
            </div>
          ) : (
            <div className="project-title-display">
              <div className="project-color-dot" style={{ background: collection.coverColor }} />
              <div>
                <h2 className="project-name">{collection.name}</h2>
                {collection.tagline && <p className="project-tagline">{collection.tagline}</p>}
              </div>
              <button
                className="btn-icon"
                onClick={() => { setEditName(collection.name); setEditTagline(collection.tagline); setEditColor(collection.coverColor); setEditing(true) }}
                title="Edit collection"
              >✎</button>
            </div>
          )}
        </div>

        <div className="project-header-right">
          <div className="progress-area">
            <div className="progress-bar-thin">
              <div className="progress-fill-thin" style={{ width: `${progress}%` }} />
            </div>
            <button className="progress-pct-btn" onClick={openProgressModal} title="Override progress">
              {progress}%
            </button>
          </div>

          {/* Export dropdown */}
          <div className="export-wrap" ref={exportRef}>
            <button className="btn-ghost-sm" onClick={() => setExportOpen(o => !o)}>
              Export ↓
            </button>
            {exportOpen && (
              <div className="export-menu">
                <button onClick={() => { exportCollectionJSON(collection); setExportOpen(false) }}>
                  Export JSON
                </button>
                {activeStage === 'mindMap' && (
                  <button onClick={() => {
                    exportMindMapSVG(
                      collection.stages.mindMap.nodes,
                      collection.stages.mindMap.edges,
                      collection.name
                    )
                    setExportOpen(false)
                  }}>
                    Mind Map SVG
                  </button>
                )}
                <button onClick={() => { window.print(); setExportOpen(false) }}>
                  Print / PDF
                </button>
              </div>
            )}
          </div>

          <button
            className="btn-danger-sm"
            onClick={() => { if (window.confirm(`Delete "${collection.name}"?`)) onDelete() }}
          >Delete</button>
        </div>
      </div>

      {showProgressModal && (
        <div className="modal-overlay" onClick={() => setShowProgressModal(false)}>
          <div className="modal small" onClick={e => e.stopPropagation()}>
            <h3>Override Progress</h3>
            <p className="text-muted">Auto-calculated: {calculateProgress({ ...collection, progressOverride: null })}%</p>
            <input
              className="input"
              type="number"
              min="0"
              max="100"
              value={progressVal}
              onChange={e => setProgressVal(e.target.value)}
              placeholder="0–100"
              autoFocus
            />
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => { onUpdate(() => ({ progressOverride: null })); setShowProgressModal(false) }}>
                Reset to Auto
              </button>
              <button className="btn-primary" onClick={applyProgress}>Apply</button>
            </div>
          </div>
        </div>
      )}

      <nav className="stage-nav">
        {STAGES.map(s => (
          <button
            key={s.key}
            className={`stage-tab${activeStage === s.key ? ' active' : ''}`}
            onClick={() => setActiveStage(s.key)}
          >
            <span className="stage-icon">{s.icon}</span>
            <span className="stage-label">{s.label}</span>
          </button>
        ))}
      </nav>

      <div className="stage-content">
        {renderStage()}
      </div>
    </div>
  )
}
