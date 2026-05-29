import { useState, useRef, useEffect } from 'react'
import { generateId, compressImage } from '../../utils'

const STAGES = [
  { key: 'rough',     label: 'Rough',      color: '#636366' },
  { key: 'iteration', label: 'Iterations', color: '#5e9eca' },
  { key: 'final',     label: 'Final',      color: '#c9a96e' },
]
const STAGE_ORDER = { final: 0, iteration: 1, rough: 2 }
const STAGE_TABS = [
  { key: 'all',       label: 'All' },
  { key: 'rough',     label: 'Rough' },
  { key: 'iteration', label: 'Iterations' },
  { key: 'final',     label: 'Final' },
]
const PRESET_TAGS = ['Top Pick', 'Needs Work', 'Selected']
const NEXT_STAGE = { rough: 'iteration', iteration: 'final', final: 'final' }

const ADD_OPTIONS = [
  { key: 'photo',     label: 'Import from Photos',  accept: 'image/*',  capture: undefined },
  { key: 'camera',    label: 'Take Photo',           accept: 'image/*',  capture: 'environment' },
  { key: 'blank',     label: 'Create Blank Sketch',  accept: null,       capture: undefined },
  { key: 'file',      label: 'Import PDF / File',    accept: 'image/*',  capture: undefined },
  { key: 'duplicate', label: 'Duplicate Last Sketch', accept: null,      capture: undefined },
]

function stageFor(key) { return STAGES.find(s => s.key === key) ?? STAGES[0] }

function getFamily(rootId, allCards) {
  const root = allCards.find(c => c.id === rootId)
  if (!root) return []
  const family = [root]
  const queue = [root.id]
  while (queue.length) {
    const id = queue.shift()
    const children = allCards.filter(c => c.parentId === id)
    family.push(...children)
    queue.push(...children.map(c => c.id))
  }
  return family.sort((a, b) => a.version - b.version)
}

function familyLatestStage(rootId, allCards) {
  const family = getFamily(rootId, allCards)
  if (family.some(c => c.stage === 'final')) return 'final'
  if (family.some(c => c.stage === 'iteration')) return 'iteration'
  return 'rough'
}

// ── ADD SKETCH MENU ──────────────────────────────────────────

function AddSketchMenu({ lastCard, onSelect, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('pointerdown', handler, true)
    return () => document.removeEventListener('pointerdown', handler, true)
  }, [onClose])
  return (
    <div className="sk-add-menu" ref={ref}>
      {ADD_OPTIONS.map(opt => (
        <button
          key={opt.key}
          className="sk-add-menu-item"
          onClick={() => onSelect(opt)}
          disabled={opt.key === 'duplicate' && !lastCard}
        >{opt.label}</button>
      ))}
    </div>
  )
}

// ── ADD SKETCH FORM ──────────────────────────────────────────

function AddSketchForm({ option, prefill, onSubmit, onClose }) {
  const [name, setName]   = useState(prefill?.name ?? '')
  const [stage, setStage] = useState(prefill?.stage ?? 'rough')
  const [note, setNote]   = useState('')
  const [src, setSrc]     = useState(prefill?.src ?? null)
  const fileRef = useRef(null)

  const needsFile = option.accept != null && !prefill?.src

  useEffect(() => {
    if (needsFile) fileRef.current?.click()
  }, [])

  async function handleFiles(files) {
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      try {
        const compressed = await compressImage(file)
        setSrc(compressed)
        break
      } catch (_) {}
    }
  }

  return (
    <div className="sk-form-overlay" onPointerDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sk-form-modal">
        <div className="sk-form-header">
          <span className="sk-form-title">{prefill?.isNextVersion ? 'Add Next Version' : option.label}</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        {option.accept != null && (
          <div
            className="sk-form-preview"
            onClick={() => { if (!src) fileRef.current?.click() }}
            style={{ cursor: src ? 'default' : 'pointer' }}
          >
            {src
              ? <img src={src} alt="Preview" />
              : <div className="sk-form-drop">
                  <span className="sk-form-drop-icon">↑</span>
                  <span>Tap to select image</span>
                </div>
            }
            <input
              ref={fileRef}
              type="file" accept={option.accept}
              capture={option.capture || undefined}
              style={{ display: 'none' }}
              onChange={e => { handleFiles(e.target.files); e.target.value = '' }}
            />
          </div>
        )}

        {prefill?.src && option.accept == null && (
          <div className="sk-form-preview" style={{ cursor: 'default' }}>
            <img src={prefill.src} alt="Source" />
          </div>
        )}

        <div className="sk-form-body">
          <div className="sk-detail-field">
            <label className="label-sm">Name</label>
            <input
              className="input input-sm"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Storm Coat — Front View"
              autoFocus={!needsFile}
            />
          </div>

          <div className="sk-detail-field">
            <label className="label-sm">Stage</label>
            <div className="sk-stage-select">
              {STAGES.map(s => (
                <button
                  key={s.key}
                  className={`sk-stage-btn${stage === s.key ? ' active' : ''}`}
                  style={{ '--stage-color': s.color }}
                  onClick={() => setStage(s.key)}
                >{s.label}</button>
              ))}
            </div>
          </div>

          <div className="sk-detail-field">
            <label className="label-sm">Notes</label>
            <textarea
              className="textarea textarea-sm"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Initial thoughts, references, decisions…"
              rows={3}
              style={{ resize: 'none' }}
            />
          </div>
        </div>

        <div className="sk-form-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={() => onSubmit({ name: name.trim() || 'Sketch', stage, note, src })}
            disabled={needsFile && !src}
          >Create Sketch</button>
        </div>
      </div>
    </div>
  )
}

// ── SKETCH CARD (grid) ───────────────────────────────────────

function SketchCard({ card, versionCount, latestStage, isSelected, onClick }) {
  const stage = stageFor(latestStage ?? card.stage)
  return (
    <div
      className={`sk-card sk-stage-${latestStage ?? card.stage}${isSelected ? ' selected' : ''}`}
      onClick={onClick}
    >
      <div className="sk-card-img">
        {card.src
          ? <img src={card.src} alt={card.name || 'Sketch'} draggable={false} />
          : <div className="sk-card-blank">✏</div>
        }
      </div>
      <div className="sk-card-footer">
        <div className="sk-card-meta">
          <span className="sk-stage-pill" style={{ color: stage.color }}>{stage.label}</span>
          <span className="sk-version">v{card.version}</span>
        </div>
        {card.name ? <p className="sk-card-name">{card.name}</p> : null}
        {card.note ? <p className="sk-card-note">{card.note}</p> : null}
        {versionCount > 1 && (
          <div className="sk-ver-badge">{versionCount} versions</div>
        )}
        {card.tags?.length > 0 && (
          <div className="sk-card-tags">
            {card.tags.map(t => <span key={t} className="sk-tag">{t}</span>)}
          </div>
        )}
      </div>
    </div>
  )
}

// ── COMPARE OVERLAY ──────────────────────────────────────────

function CompareOverlay({ family, compareIds, onClose }) {
  const [ids, setIds] = useState(compareIds)
  const cards = ids.map(id => family.find(c => c.id === id)).filter(Boolean)

  return (
    <div className="sk-compare-overlay">
      <div className="sk-compare-header">
        <span>Compare Versions</span>
        <button className="btn-ghost" onClick={onClose}>Done</button>
      </div>

      {/* Version picker */}
      <div className="sk-compare-picker">
        {[0, 1].map(slot => (
          <div key={slot} className="sk-compare-slot-pick">
            {family.map(c => {
              const s = stageFor(c.stage)
              const active = ids[slot] === c.id
              return (
                <button
                  key={c.id}
                  className={`sk-compare-pick-btn${active ? ' active' : ''}`}
                  style={{ '--stage-color': s.color, borderColor: active ? s.color : undefined }}
                  onClick={() => setIds(prev => { const next = [...prev]; next[slot] = c.id; return next })}
                >v{c.version}</button>
              )
            })}
          </div>
        ))}
      </div>

      <div className="sk-compare-grid">
        {cards.map(card => {
          const s = stageFor(card.stage)
          return (
            <div key={card.id} className="sk-compare-pane">
              {card.src
                ? <img src={card.src} alt="" className="sk-compare-img" />
                : <div className="sk-compare-blank" />
              }
              <div className="sk-compare-label">
                <span style={{ color: s.color }}>{s.label}</span>
                {' · '}v{card.version}
                {card.name ? <span> · {card.name}</span> : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── DETAIL PANEL ─────────────────────────────────────────────

function DetailPanel({ family, activeId, onSetActiveId, onAction, onUpdateCard, onClose }) {
  const [tagInput, setTagInput] = useState('')
  const activeCard = family.find(c => c.id === activeId) ?? family[family.length - 1]
  if (!activeCard) return null

  const prevCard = (() => {
    const idx = family.findIndex(c => c.id === activeCard.id)
    return idx > 0 ? family[idx - 1] : null
  })()

  function commitTag() {
    const t = tagInput.trim()
    if (!t || activeCard.tags?.includes(t)) { setTagInput(''); return }
    onUpdateCard({ ...activeCard, tags: [...(activeCard.tags ?? []), t] })
    setTagInput('')
  }

  const stage = stageFor(activeCard.stage)

  return (
    <div className="sk-detail">
      <div className="sk-detail-header">
        <div className="sk-detail-title-row">
          <span className="sk-detail-title">{activeCard.name || 'Sketch'}</span>
          {family.length > 1 && (
            <span className="sk-detail-vcnt">{family.length} versions</span>
          )}
        </div>
        <button className="btn-icon" onClick={onClose} title="Close">✕</button>
      </div>

      {/* Preview */}
      <div className="sk-detail-preview">
        {activeCard.src
          ? <img src={activeCard.src} alt={activeCard.name || 'Sketch'} draggable={false} />
          : <div className="sk-detail-blank">✏</div>
        }
      </div>

      {/* Actions */}
      <div className="sk-detail-actions-bar">
        <button className="btn-ghost-sm" onClick={() => onAction('next-version', activeCard)} title="Upload new version">+ Version</button>
        <button className="btn-ghost-sm" onClick={() => onAction('duplicate-iter', activeCard)} title="Copy as next iteration">Duplicate</button>
        <button
          className="btn-ghost-sm"
          onClick={() => onAction('mark-final', activeCard)}
          disabled={activeCard.stage === 'final'}
          title="Mark this version as final"
        >Mark Final</button>
        {prevCard && (
          <button className="btn-ghost-sm" onClick={() => onAction('compare', activeCard, prevCard)} title="Compare with previous version">Compare</button>
        )}
      </div>

      {/* Version timeline */}
      {family.length > 1 && (
        <div className="sk-timeline">
          <span className="sk-tl-label">Version History</span>
          {family.map((card, i) => {
            const s = stageFor(card.stage)
            const isActive = card.id === activeCard.id
            return (
              <div
                key={card.id}
                className={`sk-tl-item${isActive ? ' active' : ''}`}
                onClick={() => onSetActiveId(card.id)}
              >
                <div className="sk-tl-connector">
                  {i > 0 && <div className="sk-tl-line" />}
                  <div
                    className="sk-tl-dot"
                    style={isActive
                      ? { background: s.color, borderColor: s.color }
                      : { borderColor: s.color }
                    }
                  />
                </div>
                <div className="sk-tl-thumb">
                  {card.src ? <img src={card.src} alt="" /> : <div className="sk-tl-blank" />}
                </div>
                <div className="sk-tl-meta">
                  <span className="sk-tl-version">v{card.version}</span>
                  <span className="sk-tl-stage" style={{ color: s.color }}>{s.label}</span>
                  {card.name && <span className="sk-tl-name">{card.name}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit active version */}
      <div className="sk-detail-body">
        <div className="sk-detail-field">
          <label className="label-sm">Name</label>
          <input
            className="input input-sm"
            value={activeCard.name ?? ''}
            onChange={e => onUpdateCard({ ...activeCard, name: e.target.value })}
            placeholder="Sketch name…"
          />
        </div>

        <div className="sk-detail-field">
          <label className="label-sm">Stage</label>
          <div className="sk-stage-select">
            {STAGES.map(s => (
              <button
                key={s.key}
                className={`sk-stage-btn${activeCard.stage === s.key ? ' active' : ''}`}
                style={{ '--stage-color': s.color }}
                onClick={() => onUpdateCard({ ...activeCard, stage: s.key })}
              >{s.label}</button>
            ))}
          </div>
        </div>

        <div className="sk-detail-field">
          <label className="label-sm">Notes</label>
          <textarea
            className="textarea textarea-sm"
            value={activeCard.note ?? ''}
            onChange={e => onUpdateCard({ ...activeCard, note: e.target.value })}
            placeholder="Observations, decisions, what to refine…"
            rows={3}
            style={{ resize: 'none' }}
          />
        </div>

        <div className="sk-detail-field">
          <label className="label-sm">Tags</label>
          <div className="sk-tags-edit">
            {(activeCard.tags ?? []).map(t => (
              <span key={t} className="sk-tag sk-tag-rm">
                {t}
                <button onClick={() => onUpdateCard({ ...activeCard, tags: activeCard.tags.filter(x => x !== t) })}>×</button>
              </span>
            ))}
            {PRESET_TAGS.filter(t => !(activeCard.tags ?? []).includes(t)).map(t => (
              <button key={t} className="sk-preset-tag" onClick={() => onUpdateCard({ ...activeCard, tags: [...(activeCard.tags ?? []), t] })}>
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
        <button className="btn-remove-sm" onClick={() => onAction('delete', activeCard)}>Delete Version</button>
      </div>
    </div>
  )
}

// ── MAIN EXPORT ──────────────────────────────────────────────

export default function Sketches({ data, onChange }) {
  const [stageFilter, setStageFilter]         = useState('all')
  const [selectedRootId, setSelectedRootId]   = useState(null)
  const [activeVersionId, setActiveVersionId] = useState(null)
  const [showMenu, setShowMenu]               = useState(false)
  const [formState, setFormState]             = useState(null)
  const [compareIds, setCompareIds]           = useState(null)

  const cards = data.cards ?? (data.images ?? []).map(img => ({
    id: img.id, src: img.src, name: '', stage: 'rough', version: 1,
    note: img.caption || '', tags: [], parentId: null,
  }))

  function save(newCards) { onChange({ ...data, cards: newCards }) }

  const roots   = cards.filter(c => !c.parentId)
  const lastCard = cards[cards.length - 1] ?? null

  // Filter roots by latest stage in their family
  const filteredRoots = stageFilter === 'all'
    ? roots
    : roots.filter(r => familyLatestStage(r.id, cards) === stageFilter)

  const sortedRoots = [...filteredRoots].sort((a, b) =>
    (STAGE_ORDER[familyLatestStage(a.id, cards)] ?? 2) -
    (STAGE_ORDER[familyLatestStage(b.id, cards)] ?? 2)
  )

  const selectedFamily = selectedRootId ? getFamily(selectedRootId, cards) : []
  const activeId = activeVersionId ?? selectedFamily[selectedFamily.length - 1]?.id

  const counts = {
    all:       roots.length,
    rough:     roots.filter(r => familyLatestStage(r.id, cards) === 'rough').length,
    iteration: roots.filter(r => familyLatestStage(r.id, cards) === 'iteration').length,
    final:     roots.filter(r => familyLatestStage(r.id, cards) === 'final').length,
  }

  function updateCard(upd) { save(cards.map(c => c.id === upd.id ? upd : c)) }

  function handleAction(type, card, card2) {
    if (type === 'next-version') {
      setFormState({
        option: ADD_OPTIONS[0],
        prefill: {
          name: card.name ?? '',
          stage: NEXT_STAGE[card.stage] ?? 'iteration',
          src: null,
          parentId: card.id,
          version: card.version + 1,
          isNextVersion: true,
        },
      })
    } else if (type === 'duplicate-iter') {
      setFormState({
        option: { ...ADD_OPTIONS[0], key: 'photo', accept: null },
        prefill: {
          name: card.name ?? '',
          stage: NEXT_STAGE[card.stage] ?? 'iteration',
          src: card.src,
          parentId: card.id,
          version: card.version + 1,
          isNextVersion: true,
        },
      })
    } else if (type === 'mark-final') {
      updateCard({ ...card, stage: 'final' })
    } else if (type === 'compare') {
      setCompareIds([card.id, card2.id])
    } else if (type === 'delete') {
      let newCards = cards.filter(c => c.id !== card.id)
      if (!card.parentId) {
        // Deleting root: promote direct children to roots
        newCards = newCards.map(c => c.parentId === card.id ? { ...c, parentId: null } : c)
      }
      save(newCards)
      const remaining = getFamily(selectedRootId, newCards)
      if (remaining.length === 0) {
        setSelectedRootId(null)
        setActiveVersionId(null)
      } else if (card.id === activeId) {
        const newRoot = !card.parentId && newCards.find(c => c.parentId === null && c.id !== card.id)
        if (!card.parentId && newRoot) setSelectedRootId(newRoot.id)
        setActiveVersionId(remaining[remaining.length - 1].id)
      }
    }
  }

  function handleMenuSelect(option) {
    setShowMenu(false)
    if (option.key === 'duplicate') {
      setFormState({
        option: { ...option, accept: null },
        prefill: {
          name: lastCard?.name ?? '',
          stage: lastCard?.stage ?? 'rough',
          src: lastCard?.src ?? null,
          parentId: null,
          version: 1,
        },
      })
    } else {
      setFormState({
        option,
        prefill: { name: '', stage: 'rough', src: null, parentId: null, version: 1 },
      })
    }
  }

  function handleFormSubmit({ name, stage, note, src }) {
    const { prefill } = formState
    const newCard = {
      id: generateId(),
      src,
      name,
      stage,
      note,
      tags: [],
      parentId: prefill?.parentId ?? null,
      version: prefill?.version ?? 1,
      createdAt: Date.now(),
    }
    const newCards = [...cards, newCard]
    save(newCards)

    if (!prefill?.parentId) {
      setSelectedRootId(newCard.id)
      setActiveVersionId(newCard.id)
    } else {
      setActiveVersionId(newCard.id)
    }
    setFormState(null)
  }

  function openEmptyStateMenu() { setShowMenu(true) }

  return (
    <div className="sk-workspace">
      {/* Toolbar */}
      <div className="sk-toolbar">
        <div className="sk-toolbar-row">
          <div className="sk-add-btn-wrap">
            <button className="btn-primary sk-add-btn" onClick={() => setShowMenu(m => !m)}>
              + Add Sketch ▾
            </button>
            {showMenu && (
              <AddSketchMenu
                lastCard={lastCard}
                onSelect={handleMenuSelect}
                onClose={() => setShowMenu(false)}
              />
            )}
          </div>
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
          {sortedRoots.length === 0 ? (
            cards.length === 0 ? (
              <div className="sk-empty">
                <p className="sk-empty-title">Start your sketch development</p>
                <p className="sk-empty-text">Add rough sketches, refinements, and final looks to build this collection.</p>
                <div className="sk-empty-actions">
                  <button className="btn-primary" onClick={openEmptyStateMenu}>+ Add Sketch</button>
                  <button className="btn-ghost" onClick={() => {
                    setFormState({ option: ADD_OPTIONS[0], prefill: { name: '', stage: 'rough', src: null, parentId: null, version: 1 } })
                  }}>Import from Photos</button>
                </div>
              </div>
            ) : (
              <div className="empty-state">No sketches match the current filter</div>
            )
          ) : (
            <div className="sk-grid">
              {sortedRoots.map(card => {
                const family = getFamily(card.id, cards)
                const latestStage = family[family.length - 1].stage
                return (
                  <SketchCard
                    key={card.id}
                    card={card}
                    versionCount={family.length}
                    latestStage={latestStage}
                    isSelected={selectedRootId === card.id}
                    onClick={() => {
                      if (selectedRootId === card.id) {
                        setSelectedRootId(null)
                        setActiveVersionId(null)
                      } else {
                        setSelectedRootId(card.id)
                        setActiveVersionId(family[family.length - 1].id)
                      }
                    }}
                  />
                )
              })}
            </div>
          )}
        </div>

        {selectedRootId && selectedFamily.length > 0 && (
          <DetailPanel
            family={selectedFamily}
            activeId={activeId}
            onSetActiveId={setActiveVersionId}
            onAction={handleAction}
            onUpdateCard={updateCard}
            onClose={() => { setSelectedRootId(null); setActiveVersionId(null) }}
          />
        )}
      </div>

      {/* Add form modal */}
      {formState && (
        <AddSketchForm
          option={formState.option}
          prefill={formState.prefill}
          onSubmit={handleFormSubmit}
          onClose={() => setFormState(null)}
        />
      )}

      {/* Compare overlay */}
      {compareIds && selectedFamily.length >= 2 && (
        <CompareOverlay
          family={selectedFamily}
          compareIds={compareIds}
          onClose={() => setCompareIds(null)}
        />
      )}
    </div>
  )
}
