import { useState, useRef } from 'react'
import { generateId, compressImage } from '../../utils'

const SUB_TABS = [
  { key: 'collect',   label: 'Collect',   sub: 'Raw inspiration' },
  { key: 'analyze',   label: 'Analyze',   sub: 'Extract meaning' },
  { key: 'translate', label: 'Translate', sub: 'Design direction' },
]

// ─── COLLECT ────────────────────────────────────────────────

function TextBlock({ block, onUpdate, onDelete }) {
  return (
    <div className="ref-block ref-text">
      <div className="ref-block-header">
        <span className="ref-type-tag">Note</span>
        <button className="btn-remove-sm" onClick={onDelete}>×</button>
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
        placeholder="Label / source…"
      />
    </div>
  )
}

function UrlBlock({ block, onUpdate, onDelete }) {
  const domain = (() => {
    try { return new URL(block.content).hostname } catch { return block.content.replace(/^https?:\/\//, '').split('/')[0] }
  })()
  return (
    <div className="ref-block ref-url">
      <div className="ref-block-header">
        <span className="ref-type-tag">Link</span>
        <button className="btn-remove-sm" onClick={onDelete}>×</button>
      </div>
      <input
        className="input input-sm"
        value={block.content}
        onChange={e => onUpdate({ ...block, content: e.target.value })}
        placeholder="https://…"
      />
      {block.content && domain && (
        <div className="ref-url-preview">
          <a href={block.content} target="_blank" rel="noopener noreferrer" className="ref-url-link">
            {domain}
          </a>
        </div>
      )}
      <input
        className="input input-sm"
        value={block.caption}
        onChange={e => onUpdate({ ...block, caption: e.target.value })}
        placeholder="Description…"
      />
    </div>
  )
}

function ImageBlock({ block, onUpdate, onDelete }) {
  const fileRef = useRef(null)

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    const src = await compressImage(file)
    onUpdate({ ...block, content: src })
  }

  return (
    <div className="ref-block ref-image">
      <div className="ref-block-header">
        <span className="ref-type-tag">Image</span>
        <button className="btn-remove-sm" onClick={onDelete}>×</button>
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
      <input
        className="input input-sm"
        value={block.caption}
        onChange={e => onUpdate({ ...block, caption: e.target.value })}
        placeholder="Caption / source…"
      />
    </div>
  )
}

function CollectTab({ references, onUpdate }) {
  function addRef(type) {
    onUpdate([...references, { id: generateId(), type, content: '', caption: '', tags: [] }])
  }
  function updateBlock(id, updated) { onUpdate(references.map(r => r.id === id ? updated : r)) }
  function deleteBlock(id) { onUpdate(references.filter(r => r.id !== id)) }

  return (
    <div className="collect-tab">
      <div className="collect-add-row">
        <button className="btn-ghost-sm" onClick={() => addRef('text')}>+ Note</button>
        <button className="btn-ghost-sm" onClick={() => addRef('url')}>+ Link</button>
        <button className="btn-ghost-sm" onClick={() => addRef('image')}>+ Image</button>
      </div>

      {references.length === 0 ? (
        <div className="empty-state">Start gathering — add notes, links and images</div>
      ) : (
        <div className="ref-grid">
          {references.map(block => {
            const props = {
              key: block.id,
              block,
              onUpdate: upd => updateBlock(block.id, upd),
              onDelete: () => deleteBlock(block.id),
            }
            if (block.type === 'text')  return <TextBlock  {...props} />
            if (block.type === 'url')   return <UrlBlock   {...props} />
            if (block.type === 'image') return <ImageBlock {...props} />
            return null
          })}
        </div>
      )}
    </div>
  )
}

// ─── ANALYZE ────────────────────────────────────────────────

const INSIGHT_FIELDS = [
  { key: 'why',        label: 'Why is this interesting?' },
  { key: 'emotional',  label: 'What emotional quality does it carry?' },
  { key: 'silhouette', label: 'What silhouette language appears?' },
  { key: 'texture',    label: 'What textures or materials stand out?' },
  { key: 'functional', label: 'What functional ideas emerge?' },
]

function InsightCard({ insight, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="insight-card">
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
          <span className="insight-toggle">{expanded ? '−' : '+'}</span>
          <button
            className="btn-remove-sm"
            onClick={e => { e.stopPropagation(); onDelete() }}
          >×</button>
        </div>
      </div>

      {expanded && (
        <div className="insight-fields">
          {INSIGHT_FIELDS.map(f => (
            <div key={f.key} className="insight-field">
              <label className="label-sm">{f.label}</label>
              <textarea
                className="textarea textarea-sm"
                value={insight[f.key] || ''}
                onChange={e => onUpdate({ ...insight, [f.key]: e.target.value })}
                placeholder="…"
                rows={2}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AnalyzeTab({ insights, onUpdate }) {
  function addInsight() {
    onUpdate([...insights, {
      id: generateId(), title: 'New Insight',
      why: '', emotional: '', silhouette: '', texture: '', functional: '',
    }])
  }
  function updateInsight(id, upd) { onUpdate(insights.map(i => i.id === id ? upd : i)) }
  function deleteInsight(id)      { onUpdate(insights.filter(i => i.id !== id)) }

  return (
    <div className="analyze-tab">
      <div className="analyze-header">
        <p className="analyze-desc">
          Extract meaning from your references. What patterns, emotions, and ideas keep appearing?
        </p>
        <button className="btn-ghost-sm" onClick={addInsight}>+ New Insight</button>
      </div>

      {insights.length === 0 ? (
        <div className="empty-state">Add insight cards to analyze what your references mean</div>
      ) : (
        <div className="insight-list">
          {insights.map(ins => (
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

// ─── TRANSLATE ──────────────────────────────────────────────

function DirectionCard({ dir, onUpdate, onDelete }) {
  function addTranslation() {
    onUpdate({ ...dir, translations: [...(dir.translations || []), { id: generateId(), text: '' }] })
  }
  function updateTranslation(id, text) {
    onUpdate({ ...dir, translations: dir.translations.map(t => t.id === id ? { ...t, text } : t) })
  }
  function deleteTranslation(id) {
    onUpdate({ ...dir, translations: dir.translations.filter(t => t.id !== id) })
  }

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
        />
      </div>

      <div className="direction-arrow">↓</div>

      <div className="direction-translations">
        <div className="direction-translations-header">
          <label className="label-sm">Design Translations</label>
          <button className="btn-remove-sm" onClick={onDelete}>Remove</button>
        </div>
        {(dir.translations || []).map(t => (
          <div key={t.id} className="translation-row">
            <span className="translation-bullet">·</span>
            <input
              className="input input-sm"
              value={t.text}
              onChange={e => updateTranslation(t.id, e.target.value)}
              placeholder="e.g. Glossy ripstop shell with matte contrast underlayer"
            />
            <button className="btn-remove-sm" onClick={() => deleteTranslation(t.id)}>×</button>
          </div>
        ))}
        <button className="btn-ghost-sm" onClick={addTranslation} style={{ marginTop: 8 }}>+ Add</button>
      </div>
    </div>
  )
}

function TranslateTab({ directions, onUpdate }) {
  function addDirection() {
    onUpdate([...directions, { id: generateId(), research: '', translations: [] }])
  }
  function updateDir(id, upd) { onUpdate(directions.map(d => d.id === id ? upd : d)) }
  function deleteDir(id)      { onUpdate(directions.filter(d => d.id !== id)) }

  return (
    <div className="translate-tab">
      <div className="translate-header">
        <p className="translate-desc">
          Convert research insights into design language. Bridge inspiration to garment development.
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
