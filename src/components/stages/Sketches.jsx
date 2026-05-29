import { useState, useRef } from 'react'
import { generateId, compressImage } from '../../utils'

const STAGES = [
  { key: 'rough',     label: 'Rough',       color: '#636366' },
  { key: 'iteration', label: 'Iterations',  color: '#5e9eca' },
  { key: 'final',     label: 'Final',       color: '#c9a96e' },
]
const STAGE_ORDER = { final: 0, iteration: 1, rough: 2 }
const PRESET_TAGS = ['Top Pick', 'Needs Work', 'Selected']

const STAGE_TABS = [
  { key: 'all',       label: 'All' },
  { key: 'rough',     label: 'Rough' },
  { key: 'iteration', label: 'Iterations' },
  { key: 'final',     label: 'Final' },
]

function stageFor(key) { return STAGES.find(s => s.key === key) ?? STAGES[0] }

// ─── SKETCH CARD ────────────────────────────────────────────

function SketchCard({ card, isSelected, onClick }) {
  const stage = stageFor(card.stage)
  return (
    <div
      className={`sk-card sk-stage-${card.stage}${isSelected ? ' selected' : ''}`}
      onClick={onClick}
    >
      <div className="sk-card-img">
        <img src={card.src} alt={card.note || 'Sketch'} draggable={false} />
      </div>
      <div className="sk-card-footer">
        <div className="sk-card-meta">
          <span className="sk-stage-pill" style={{ color: stage.color }}>{stage.label}</span>
          <span className="sk-version">v{card.version}</span>
        </div>
        {card.note ? <p className="sk-card-note">{card.note}</p> : null}
        {card.tags.length > 0 && (
          <div className="sk-card-tags">
            {card.tags.map(t => <span key={t} className="sk-tag">{t}</span>)}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── DETAIL PANEL ───────────────────────────────────────────

function DetailPanel({ card, allCards, onUpdate, onDelete, onDuplicate, onClose }) {
  const [tagInput, setTagInput] = useState('')

  function commitTag() {
    const t = tagInput.trim()
    if (!t || card.tags.includes(t)) { setTagInput(''); return }
    onUpdate({ ...card, tags: [...card.tags, t] })
    setTagInput('')
  }

  const parent = card.parentId ? allCards.find(c => c.id === card.parentId) : null

  return (
    <div className="sk-detail">
      <div className="sk-detail-header">
        <span className="sk-detail-title">Sketch Detail</span>
        <button className="btn-icon" onClick={onClose} title="Close">✕</button>
      </div>

      <div className="sk-detail-preview">
        <img src={card.src} alt={card.note || 'Sketch'} draggable={false} />
      </div>

      <div className="sk-detail-body">
        {/* Stage selector */}
        <div className="sk-detail-field">
          <label className="label-sm">Stage</label>
          <div className="sk-stage-select">
            {STAGES.map(s => (
              <button
                key={s.key}
                className={`sk-stage-btn${card.stage === s.key ? ' active' : ''}`}
                style={{ '--stage-color': s.color }}
                onClick={() => onUpdate({ ...card, stage: s.key })}
              >{s.label}</button>
            ))}
          </div>
        </div>

        {/* Version info */}
        <div className="sk-detail-field">
          <label className="label-sm">Version</label>
          <span className="sk-version-display">
            v{card.version}
            {parent && <span className="sk-lineage"> — derived from v{parent.version}</span>}
          </span>
        </div>

        {/* Notes */}
        <div className="sk-detail-field">
          <label className="label-sm">Notes</label>
          <textarea
            className="textarea textarea-sm"
            value={card.note}
            onChange={e => onUpdate({ ...card, note: e.target.value })}
            placeholder="Observations, decisions, what to refine…"
            rows={4}
            style={{ resize: 'none' }}
          />
        </div>

        {/* Tags */}
        <div className="sk-detail-field">
          <label className="label-sm">Tags</label>
          <div className="sk-tags-edit">
            {card.tags.map(t => (
              <span key={t} className="sk-tag sk-tag-rm">
                {t}
                <button onClick={() => onUpdate({ ...card, tags: card.tags.filter(x => x !== t) })}>×</button>
              </span>
            ))}
            {PRESET_TAGS.filter(t => !card.tags.includes(t)).map(t => (
              <button key={t} className="sk-preset-tag" onClick={() => onUpdate({ ...card, tags: [...card.tags, t] })}>
                + {t}
              </button>
            ))}
            <input
              className="sk-tag-input"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commitTag() } }}
              onBlur={commitTag}
              placeholder="+ tag"
            />
          </div>
        </div>
      </div>

      <div className="sk-detail-actions">
        <button
          className="btn-ghost-sm"
          onClick={() => onDuplicate(card)}
          title="Create a new copy to iterate on"
        >Duplicate</button>
        <button
          className="btn-remove-sm"
          style={{ marginLeft: 'auto' }}
          onClick={onDelete}
        >Delete</button>
      </div>
    </div>
  )
}

// ─── MAIN EXPORT ────────────────────────────────────────────

export default function Sketches({ data, onChange }) {
  const [stageFilter, setStageFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const fileRef = useRef(null)

  const cards = data.cards ?? (data.images ?? []).map(img => ({
    id: img.id,
    src: img.src,
    stage: 'rough',
    version: 1,
    note: img.caption || '',
    tags: [],
    parentId: null,
  }))

  function save(newCards) { onChange({ ...data, cards: newCards }) }

  async function handleAddFiles(files) {
    const newCards = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      try {
        const src = await compressImage(file)
        newCards.push({
          id: generateId(), src,
          stage: 'rough',
          version: 1,
          note: '', tags: [], parentId: null,
        })
      } catch (_) {}
    }
    if (newCards.length) save([...cards, ...newCards])
  }

  function updateCard(id, upd) { save(cards.map(c => c.id === id ? upd : c)) }

  function deleteCard(id) {
    save(cards.filter(c => c.id !== id))
    if (selected === id) setSelected(null)
  }

  function duplicateCard(card) {
    const copy = {
      ...card,
      id: generateId(),
      stage: card.stage === 'rough' ? 'iteration' : card.stage,
      version: card.version + 1,
      parentId: card.id,
      note: '',
    }
    save([...cards, copy])
    setSelected(copy.id)
  }

  const counts = {
    all:       cards.length,
    rough:     cards.filter(c => c.stage === 'rough').length,
    iteration: cards.filter(c => c.stage === 'iteration').length,
    final:     cards.filter(c => c.stage === 'final').length,
  }

  let visible = stageFilter === 'all' ? cards : cards.filter(c => c.stage === stageFilter)
  visible = [...visible].sort((a, b) => (STAGE_ORDER[a.stage] ?? 2) - (STAGE_ORDER[b.stage] ?? 2))

  const selectedCard = selected ? cards.find(c => c.id === selected) : null

  return (
    <div className="sk-workspace">
      {/* Toolbar */}
      <div className="sk-toolbar">
        <div className="sk-toolbar-row">
          <button className="btn-primary sk-add-btn" onClick={() => fileRef.current?.click()}>
            + Add Sketch
          </button>
          <input
            ref={fileRef}
            type="file" accept="image/*" multiple
            style={{ display: 'none' }}
            onChange={e => { handleAddFiles(e.target.files); e.target.value = '' }}
          />
        </div>
        <div className="sk-toolbar-row sk-tabs-row">
          {STAGE_TABS.map(tab => (
            <button
              key={tab.key}
              className={`sk-tab${stageFilter === tab.key ? ' active' : ''}`}
              onClick={() => setStageFilter(tab.key)}
            >
              {tab.label}
              {counts[tab.key] > 0 && <span className="sk-tab-count">{counts[tab.key]}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="sk-body">
        <div className="sk-main">
          {visible.length === 0 ? (
            cards.length === 0 ? (
              <div className="sk-empty">
                <p className="sk-empty-title">Start your sketch development</p>
                <p className="sk-empty-text">Add rough sketches, refinements, and final looks to build this collection.</p>
                <div className="sk-empty-actions">
                  <button className="btn-primary" onClick={() => fileRef.current?.click()}>+ Add Sketch</button>
                  <button className="btn-ghost" onClick={() => fileRef.current?.click()}>Import from Photos</button>
                </div>
              </div>
            ) : (
              <div className="empty-state">No sketches match the current filter</div>
            )
          ) : (
            <div className="sk-grid">
              {visible.map(card => (
                <SketchCard
                  key={card.id}
                  card={card}
                  isSelected={selected === card.id}
                  onClick={() => setSelected(s => s === card.id ? null : card.id)}
                />
              ))}
            </div>
          )}
        </div>

        {selectedCard && (
          <DetailPanel
            card={selectedCard}
            allCards={cards}
            onUpdate={upd => updateCard(selectedCard.id, upd)}
            onDelete={() => deleteCard(selectedCard.id)}
            onDuplicate={duplicateCard}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  )
}
