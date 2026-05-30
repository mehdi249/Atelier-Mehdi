import { useState, useRef } from 'react'
import { generateId, compressImage } from '../../utils'

// ─── CONSTANTS ──────────────────────────────────────────────

const LENS_TYPES = [
  { key: 'emotion',      label: 'Emotion',      accent: '#bf94e4' },
  { key: 'silhouette',   label: 'Silhouette',   accent: '#5e9eca' },
  { key: 'material',     label: 'Material',     accent: '#c9a96e' },
  { key: 'function',     label: 'Function',     accent: '#63b67a' },
  { key: 'context',      label: 'Context',      accent: '#e4a46a' },
  { key: 'color',        label: 'Color',        accent: '#e473a0' },
  { key: 'construction', label: 'Construction', accent: '#7a9de4' },
]

const CHIP_CATS = [
  { key: 'material',     label: 'Material',     accent: '#c9a96e' },
  { key: 'silhouette',   label: 'Silhouette',   accent: '#5e9eca' },
  { key: 'detail',       label: 'Detail',       accent: '#bf94e4' },
  { key: 'construction', label: 'Construction', accent: '#7a9de4' },
  { key: 'color',        label: 'Color',        accent: '#e473a0' },
]

function lensAccent(type) { return LENS_TYPES.find(t => t.key === type)?.accent ?? '#48484a' }
function chipAccent(cat)  { return CHIP_CATS.find(c => c.key === cat)?.accent  ?? '#48484a' }

// ─── SHARED: CONCEPT TAGS ───────────────────────────────────

function ConceptTags({ concepts = [], onChange }) {
  const [val, setVal] = useState('')

  function commit() {
    const tag = val.trim()
    if (!tag || concepts.includes(tag)) { setVal(''); return }
    onChange([...concepts, tag])
    setVal('')
  }

  return (
    <div className="concept-tags">
      {concepts.map(t => (
        <span key={t} className="concept-chip">
          {t}
          <button onClick={() => onChange(concepts.filter(c => c !== t))}>×</button>
        </span>
      ))}
      <input
        className="concept-input"
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit() } }}
        onBlur={commit}
        placeholder="+ concept"
      />
    </div>
  )
}

// ─── COLLECT — CARD COMPONENTS ──────────────────────────────

function TextBlock({ block, onUpdate, onDelete, viewMode }) {
  return (
    <div className={`ref-block ref-text${block.pinned ? ' pinned' : ''}${viewMode === 'list' ? ' list-mode' : ''}`}>
      <div className="ref-block-top">
        <span className="ref-type-badge note">Note</span>
        <div className="ref-block-actions">
          <button
            className={`ref-pin${block.pinned ? ' active' : ''}`}
            onClick={() => onUpdate({ ...block, pinned: !block.pinned })}
            title="Pin as key insight"
          >★</button>
          <button className="btn-remove-sm" onClick={onDelete}>×</button>
        </div>
      </div>
      <textarea
        className="textarea textarea-sm ref-textarea"
        value={block.content}
        onChange={e => onUpdate({ ...block, content: e.target.value })}
        placeholder="Observation, quote, film note, cultural reference…"
        rows={3}
      />
      <input
        className="input input-sm"
        value={block.caption}
        onChange={e => onUpdate({ ...block, caption: e.target.value })}
        placeholder="Source / label…"
      />
      <ConceptTags concepts={block.concepts ?? []} onChange={c => onUpdate({ ...block, concepts: c })} />
    </div>
  )
}

function UrlBlock({ block, onUpdate, onDelete, viewMode }) {
  const domain = (() => {
    try { return new URL(block.content).hostname.replace('www.', '') } catch { return '' }
  })()
  return (
    <div className={`ref-block ref-url${block.pinned ? ' pinned' : ''}${viewMode === 'list' ? ' list-mode' : ''}`}>
      <div className="ref-block-top">
        <span className="ref-type-badge link">Link</span>
        <div className="ref-block-actions">
          <button
            className={`ref-pin${block.pinned ? ' active' : ''}`}
            onClick={() => onUpdate({ ...block, pinned: !block.pinned })}
            title="Pin as key insight"
          >★</button>
          <button className="btn-remove-sm" onClick={onDelete}>×</button>
        </div>
      </div>
      {domain && (
        <a href={block.content} target="_blank" rel="noopener noreferrer" className="ref-domain">
          {domain} ↗
        </a>
      )}
      <input
        className="input input-sm"
        value={block.content}
        onChange={e => onUpdate({ ...block, content: e.target.value })}
        placeholder="https://…"
      />
      <input
        className="input input-sm"
        value={block.caption}
        onChange={e => onUpdate({ ...block, caption: e.target.value })}
        placeholder="Description…"
      />
      <ConceptTags concepts={block.concepts ?? []} onChange={c => onUpdate({ ...block, concepts: c })} />
    </div>
  )
}

function ImageBlock({ block, onUpdate, onDelete, viewMode }) {
  const fileRef = useRef(null)

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    const src = await compressImage(file)
    onUpdate({ ...block, content: src })
  }

  return (
    <div className={`ref-block ref-image${block.pinned ? ' pinned' : ''}${viewMode === 'list' ? ' list-mode' : ''}`}>
      <div className="ref-block-top">
        <span className="ref-type-badge image">Image</span>
        <div className="ref-block-actions">
          <button
            className={`ref-pin${block.pinned ? ' active' : ''}`}
            onClick={() => onUpdate({ ...block, pinned: !block.pinned })}
            title="Pin as key insight"
          >★</button>
          <button className="btn-remove-sm" onClick={onDelete}>×</button>
        </div>
      </div>
      {block.content ? (
        <div className="ref-image-wrap" onClick={() => fileRef.current?.click()}>
          <img src={block.content} alt={block.caption} className="ref-img" />
          <div className="ref-image-overlay">Replace</div>
        </div>
      ) : (
        <div className="ref-image-empty" onClick={() => fileRef.current?.click()}>
          + Add Image
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
      {viewMode !== 'board' && (
        <input
          className="input input-sm"
          value={block.caption}
          onChange={e => onUpdate({ ...block, caption: e.target.value })}
          placeholder="Caption…"
        />
      )}
      {block.content && viewMode === 'board' && (
        <input
          className="input input-sm"
          value={block.caption}
          onChange={e => onUpdate({ ...block, caption: e.target.value })}
          placeholder="Caption…"
        />
      )}
      <ConceptTags concepts={block.concepts ?? []} onChange={c => onUpdate({ ...block, concepts: c })} />
    </div>
  )
}

function CollectTab({ references, onUpdate }) {
  const [viewMode, setViewMode] = useState('board')

  function addRef(type) {
    onUpdate([...references, { id: generateId(), type, content: '', caption: '', concepts: [], pinned: false }])
  }

  function updateBlock(id, upd) { onUpdate(references.map(r => r.id === id ? upd : r)) }
  function deleteBlock(id)      { onUpdate(references.filter(r => r.id !== id)) }

  const sorted = [...references].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))

  const blockProps = (block) => ({
    key: block.id,
    block,
    viewMode,
    onUpdate: upd => updateBlock(block.id, upd),
    onDelete: () => deleteBlock(block.id),
  })

  function renderBlock(block) {
    if (block.type === 'image') return <ImageBlock {...blockProps(block)} />
    if (block.type === 'url')   return <UrlBlock   {...blockProps(block)} />
    return <TextBlock {...blockProps(block)} />
  }

  return (
    <div className="collect-tab">
      <div className="collect-toolbar">
        <div className="collect-add-row">
          <button className="btn-ghost-sm" onClick={() => addRef('text')}>+ Note</button>
          <button className="btn-ghost-sm" onClick={() => addRef('url')}>+ Link</button>
          <button className="btn-ghost-sm" onClick={() => addRef('image')}>+ Image</button>
        </div>
        <div className="view-mode-toggle">
          {[['board', '⊟ Board'], ['grid', '⊞ Grid'], ['list', '≡ List']].map(([k, l]) => (
            <button
              key={k}
              className={`view-mode-btn${viewMode === k ? ' active' : ''}`}
              onClick={() => setViewMode(k)}
            >{l}</button>
          ))}
        </div>
      </div>

      {references.length === 0 ? (
        <div className="empty-state">Start gathering — add notes, links and images</div>
      ) : viewMode === 'board' ? (
        <div className="ref-board">{sorted.map(renderBlock)}</div>
      ) : viewMode === 'grid' ? (
        <div className="ref-grid">{sorted.map(renderBlock)}</div>
      ) : (
        <div className="ref-list">{sorted.map(renderBlock)}</div>
      )}
    </div>
  )
}

// ─── ANALYZE — LENS SYSTEM ──────────────────────────────────

function LensBlock({ lens, onUpdate, onDelete }) {
  const meta = LENS_TYPES.find(t => t.key === lens.type) ?? { label: lens.type, accent: '#48484a' }
  return (
    <div className="insight-lens" style={{ borderLeftColor: meta.accent }}>
      <div className="lens-header">
        <span className="lens-label" style={{ color: meta.accent }}>{meta.label}</span>
        <button className="btn-remove-sm" onClick={onDelete}>×</button>
      </div>
      <textarea
        className="textarea textarea-sm"
        value={lens.text}
        onChange={e => onUpdate({ ...lens, text: e.target.value })}
        placeholder={`${meta.label} observation…`}
        rows={2}
        style={{ resize: 'none' }}
      />
    </div>
  )
}

function InsightCard({ insight, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(true)
  const [showPicker, setShowPicker] = useState(false)

  // Handle old data format migration
  const lenses = insight.lenses ?? [
    insight.emotional  && { id: 'l-em',  type: 'emotion',    text: insight.emotional },
    insight.silhouette && { id: 'l-si',  type: 'silhouette', text: insight.silhouette },
    insight.texture    && { id: 'l-ma',  type: 'material',   text: insight.texture },
    insight.functional && { id: 'l-fn',  type: 'function',   text: insight.functional },
    insight.why        && { id: 'l-co',  type: 'context',    text: insight.why },
  ].filter(Boolean)

  function updateLenses(newLenses) { onUpdate({ ...insight, lenses: newLenses }) }

  function addLens(type) {
    updateLenses([...lenses, { id: generateId(), type, text: '' }])
    setShowPicker(false)
  }

  const usedTypes = lenses.map(l => l.type)

  return (
    <div className={`insight-card${insight.pinned ? ' pinned' : ''}`}>
      <div className="insight-card-header" onClick={() => setExpanded(x => !x)}>
        <input
          className="insight-title-input"
          value={insight.title}
          onChange={e => onUpdate({ ...insight, title: e.target.value })}
          onClick={e => e.stopPropagation()}
          onPointerDown={e => e.stopPropagation()}
          placeholder="Insight title…"
        />
        <div className="insight-card-actions">
          <button
            className={`insight-pin${insight.pinned ? ' active' : ''}`}
            onClick={e => { e.stopPropagation(); onUpdate({ ...insight, pinned: !insight.pinned }) }}
            title="Pin as key insight"
          >★</button>
          <span className="insight-toggle">{expanded ? '−' : '+'}</span>
          <button className="btn-remove-sm" onClick={e => { e.stopPropagation(); onDelete() }}>×</button>
        </div>
      </div>

      {expanded && (
        <div className="insight-body">
          {lenses.length > 0 && (
            <div className="insight-lenses">
              {lenses.map((lens, i) => (
                <LensBlock
                  key={lens.id}
                  lens={lens}
                  onUpdate={upd => updateLenses(lenses.map((l, j) => j === i ? upd : l))}
                  onDelete={() => updateLenses(lenses.filter((_, j) => j !== i))}
                />
              ))}
            </div>
          )}

          {showPicker ? (
            <div className="lens-picker">
              {LENS_TYPES.filter(t => !usedTypes.includes(t.key)).map(t => (
                <button
                  key={t.key}
                  className="lens-pick-btn"
                  style={{ '--lens-accent': t.accent }}
                  onClick={() => addLens(t.key)}
                >{t.label}</button>
              ))}
              <button className="btn-remove-sm" onClick={() => setShowPicker(false)}>✕</button>
            </div>
          ) : (
            <button className="add-lens-btn" onClick={() => setShowPicker(true)}>+ Add Lens</button>
          )}

          <ConceptTags
            concepts={insight.concepts ?? []}
            onChange={c => onUpdate({ ...insight, concepts: c })}
          />
        </div>
      )}
    </div>
  )
}

function AnalyzeTab({ insights, onUpdate }) {
  function addInsight() {
    onUpdate([...insights, { id: generateId(), title: 'New Insight', lenses: [], pinned: false, concepts: [] }])
  }
  function updateInsight(id, upd) { onUpdate(insights.map(i => i.id === id ? upd : i)) }
  function deleteInsight(id)      { onUpdate(insights.filter(i => i.id !== id)) }

  const sorted = [...insights].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))

  return (
    <div className="analyze-tab">
      <div className="analyze-header">
        <p className="analyze-desc">
          Extract meaning from your references. Add only the lenses that matter for each insight.
        </p>
        <button className="btn-ghost-sm" onClick={addInsight}>+ New Insight</button>
      </div>

      {insights.length === 0 ? (
        <div className="empty-state">Add insight cards to distill what your references mean</div>
      ) : (
        <div className="insight-list">
          {sorted.map(ins => (
            <InsightCard
              key={ins.id}
              insight={ins}
              onUpdate={upd => updateInsight(ins.id, upd)}
              onDelete={() => deleteInsight(ins.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── TRANSLATE — CHIP SYSTEM ────────────────────────────────

function DirectionCard({ dir, onUpdate, onDelete }) {
  const [activeCat, setActiveCat] = useState(null)
  const [inputVal, setInputVal]   = useState('')
  const inputRef = useRef(null)

  const chips = dir.chips ?? (dir.translations ?? []).map(t => ({ id: t.id, category: 'detail', text: t.text }))

  function startAdding(cat) {
    setActiveCat(cat)
    setInputVal('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function commitChip() {
    if (!inputVal.trim() || !activeCat) { setActiveCat(null); return }
    onUpdate({ ...dir, chips: [...chips, { id: generateId(), category: activeCat, text: inputVal.trim() }] })
    setInputVal('')
    setActiveCat(null)
  }

  function removeChip(id) { onUpdate({ ...dir, chips: chips.filter(c => c.id !== id) }) }

  const byCategory = CHIP_CATS.reduce((acc, cat) => {
    acc[cat.key] = chips.filter(c => c.category === cat.key)
    return acc
  }, {})
  // Include chips with unknown categories (e.g., migrated 'detail')
  const extra = chips.filter(c => !CHIP_CATS.find(k => k.key === c.category))

  return (
    <div className="direction-card">
      <div className="direction-insight-area">
        <label className="label-sm">Research Insight</label>
        <textarea
          className="textarea textarea-sm"
          value={dir.research}
          onChange={e => onUpdate({ ...dir, research: e.target.value })}
          placeholder="What did you discover? e.g. 'Rain creates reflective movement and atmospheric distortion'"
          rows={2}
          style={{ resize: 'none' }}
        />
      </div>

      <div className="direction-arrow">↓</div>

      <div className="direction-chips-area">
        <div className="chips-display">
          {CHIP_CATS.map(cat => byCategory[cat.key]?.map(chip => (
            <span key={chip.id} className="design-chip" style={{ '--chip-accent': cat.accent }}>
              <span className="chip-cat-label">{cat.label}</span>
              <span className="chip-text">{chip.text}</span>
              <button className="chip-remove" onClick={() => removeChip(chip.id)}>×</button>
            </span>
          )))}
          {extra.map(chip => (
            <span key={chip.id} className="design-chip" style={{ '--chip-accent': '#48484a' }}>
              <span className="chip-text">{chip.text}</span>
              <button className="chip-remove" onClick={() => removeChip(chip.id)}>×</button>
            </span>
          ))}
        </div>

        {activeCat ? (
          <div className="chip-add-form">
            <span className="chip-add-cat" style={{ color: chipAccent(activeCat) }}>
              {CHIP_CATS.find(c => c.key === activeCat)?.label}
            </span>
            <input
              ref={inputRef}
              className="input input-sm"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              placeholder={`Add ${activeCat} direction…`}
              onKeyDown={e => {
                if (e.key === 'Enter') commitChip()
                if (e.key === 'Escape') { setActiveCat(null); setInputVal('') }
              }}
            />
            <button className="btn-primary" style={{ fontSize: 11, padding: '5px 12px', flexShrink: 0 }} onClick={commitChip}>Add</button>
            <button className="btn-remove-sm" onClick={() => { setActiveCat(null); setInputVal('') }}>✕</button>
          </div>
        ) : (
          <div className="chip-cat-row">
            {CHIP_CATS.map(cat => (
              <button
                key={cat.key}
                className="chip-cat-btn"
                style={{ '--chip-accent': cat.accent }}
                onClick={() => startAdding(cat.key)}
              >+ {cat.label}</button>
            ))}
            <button className="btn-remove-sm direction-delete" onClick={onDelete}>Remove</button>
          </div>
        )}
      </div>
    </div>
  )
}

function TranslateTab({ directions, onUpdate }) {
  function addDirection() {
    onUpdate([...directions, { id: generateId(), research: '', chips: [] }])
  }
  function updateDir(id, upd) { onUpdate(directions.map(d => d.id === id ? upd : d)) }
  function deleteDir(id)      { onUpdate(directions.filter(d => d.id !== id)) }

  return (
    <div className="translate-tab">
      <div className="translate-header">
        <p className="translate-desc">
          Convert research into design language. One insight, a handful of decisions.
        </p>
        <button className="btn-ghost-sm" onClick={addDirection}>+ New Direction</button>
      </div>

      {directions.length === 0 ? (
        <div className="empty-state">Add direction cards to translate research into design decisions</div>
      ) : (
        <div className="direction-list">
          {directions.map(dir => (
            <DirectionCard
              key={dir.id}
              dir={dir}
              onUpdate={upd => updateDir(dir.id, upd)}
              onDelete={() => deleteDir(dir.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── MAIN ───────────────────────────────────────────────────

const SUB_TABS = [
  { key: 'collect',   label: 'Collect',   sub: 'Raw inspiration' },
  { key: 'analyze',   label: 'Analyze',   sub: 'Extract meaning' },
  { key: 'translate', label: 'Translate', sub: 'Design direction' },
]

export default function Research({ data, onChange }) {
  const [tab, setTab] = useState('collect')

  const references = data.references ?? []
  const insights   = data.insights   ?? []
  const directions = data.directions ?? []

  return (
    <div className="research-wrap">
      <div className="research-sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.key}
            className={`rsub-tab${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            <span className="rsub-label">{t.label}</span>
            <span className="rsub-sub">{t.sub}</span>
          </button>
        ))}
      </div>

      <div className="research-content">
        {tab === 'collect' && (
          <CollectTab
            references={references}
            onUpdate={refs => onChange({ ...data, references: refs })}
          />
        )}
        {tab === 'analyze' && (
          <AnalyzeTab
            insights={insights}
            onUpdate={ins => onChange({ ...data, insights: ins })}
          />
        )}
        {tab === 'translate' && (
          <TranslateTab
            directions={directions}
            onUpdate={dirs => onChange({ ...data, directions: dirs })}
          />
        )}
      </div>
    </div>
  )
}
