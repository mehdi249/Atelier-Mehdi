import { useState, useRef, useEffect } from 'react'
import MindMap from './stages/MindMap'
import Research from './stages/Research'
import Sketches from './stages/Sketches'
import StyleCards from './stages/StyleCards'
import GenericStage from './stages/GenericStage'
import Lookbook from './stages/Lookbook'
import { exportCollectionJSON, exportMindMapSVG } from '../utils'

const MindMapIcon = () => (
  <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
    <circle cx="10" cy="10" r="2.5"/>
    <line x1="8.2" y1="8.2" x2="4" y2="4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <circle cx="3" cy="3" r="1.8"/>
    <line x1="11.8" y1="8.2" x2="16" y2="4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <circle cx="17" cy="3" r="1.8"/>
    <line x1="8.2" y1="11.8" x2="4" y2="16" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <circle cx="3" cy="17" r="1.8"/>
    <line x1="11.8" y1="11.8" x2="16" y2="16" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <circle cx="17" cy="17" r="1.8"/>
  </svg>
)

const STAGES = [
  { key: 'mindMap',      label: 'Mind Map',     icon: <MindMapIcon /> },
  { key: 'research',     label: 'Research',     icon: '◎' },
  { key: 'sketches',     label: 'Sketches',     icon: '✐' },
  { key: 'styleCards',   label: 'Style Cards',  icon: '⊟' },
  { key: 'patterns',     label: 'Patterns',     icon: '⊞' },
  { key: 'clo3d',        label: 'CLO3D',        icon: '⬢' },
  { key: 'construction', label: 'Construction', icon: '◫' },
  { key: 'lookbook',     label: 'Lookbook',     icon: '▣' },
]

export default function ProjectView({ collection, onUpdate, onUpdateStage, onDelete, onBack }) {
  const [activeStage, setActiveStage] = useState('mindMap')
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(collection.name)
  const [editTagline, setEditTagline] = useState(collection.tagline)
  const [editColor, setEditColor] = useState(collection.coverColor)
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef(null)

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
        </div>
      </div>

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
