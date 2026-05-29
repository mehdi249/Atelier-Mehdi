import React, { useState, useRef, useEffect } from 'react'
import { generateId, compressImage } from '../../utils'
import { renderFilePreview, renderAllPages, getFileCategory } from '../../filePreview'

const DESIGN_FILE_ACCEPT = 'image/*,.ai,.pdf,.svg,application/pdf,image/svg+xml'

function emptyLayer() {
  return { fabric: '', weight: '', supplier: '', notes: '', swatchSrc: null }
}

function createPiece(index = 0) {
  return {
    id: generateId(),
    name: 'New Piece',
    season: '',
    category: '',
    fit: '',
    styleCode: `SC-${String(index + 1).padStart(3, '0')}`,
    description: '',
    sketchFront: null,
    sketchBack: null,
    fabricLayers: {
      shell: emptyLayer(),
      lining: null,
      insulation: null,
    },
    constructionNotes: '',
    colorways: [],
    complete: false,
    images: [],
  }
}

// ── SKETCH SLOT ───────────────────────────────────────────────

function SketchSlot({ label, data, onChange }) {
  const fileRef = useRef(null)
  const [rendering, setRendering] = useState(false)
  const [pageIdx, setPageIdx] = useState(0)
  const swipeXRef = useRef(0)

  useEffect(() => { setPageIdx(0) }, [data?.src])

  const pages = data?.pages
  const hasPages = Array.isArray(pages) && pages.length > 1
  const displaySrc = hasPages ? pages[pageIdx] : data?.src

  async function handleFile(file) {
    const cat = getFileCategory(file)
    if (cat === 'unknown') return
    setRendering(true)
    try {
      if (cat === 'image') {
        const compressed = await compressImage(file)
        onChange({ src: compressed, fileCategory: 'image', pages: null, pageCount: 1 })
      } else {
        const result = await renderFilePreview(file, 1)
        if (!result?.dataUrl) return
        const isSinglePage = (result.pageCount ?? 1) <= 1
        const allPages = isSinglePage ? null : await renderAllPages(file)
        onChange({
          src: result.dataUrl,
          fileCategory: result.fileCategory,
          pages: allPages?.length > 1 ? allPages : null,
          pageCount: result.pageCount ?? 1,
        })
      }
    } catch (_) {
    } finally {
      setRendering(false)
    }
  }

  if (rendering) {
    return (
      <div className="tp-sketch-zone tp-sketch-zone-rendering">
        <span className="tp-sketch-label">{label}</span>
        <span className="tp-sketch-hint">Rendering…</span>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="tp-sketch-zone" onClick={() => fileRef.current.click()}>
        <input
          ref={fileRef}
          type="file"
          accept={DESIGN_FILE_ACCEPT}
          style={{ display: 'none' }}
          onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = '' }}
        />
        <span className="tp-sketch-label">{label}</span>
        <span className="tp-sketch-hint">↑ Upload flat sketch</span>
        <span className="tp-sketch-hint-sub">AI · PDF · SVG · Image</span>
      </div>
    )
  }

  return (
    <div
      className="tp-sketch-zone tp-sketch-zone-filled"
      onTouchStart={e => { swipeXRef.current = e.touches[0].clientX }}
      onTouchEnd={e => {
        if (!hasPages) return
        const dx = e.changedTouches[0].clientX - swipeXRef.current
        if (dx > 40)  setPageIdx(p => Math.max(0, p - 1))
        if (dx < -40) setPageIdx(p => Math.min(pages.length - 1, p + 1))
      }}
    >
      <span className="tp-sketch-label">{label}</span>
      <img src={displaySrc} alt={label} className="tp-sketch-img" draggable={false} />
      {hasPages && (
        <div className="tp-sketch-nav">
          <button
            className="tp-sketch-nav-btn"
            onClick={e => { e.stopPropagation(); setPageIdx(p => Math.max(0, p - 1)) }}
            disabled={pageIdx <= 0}
          >‹</button>
          <span className="tp-sketch-nav-count">{pageIdx + 1} / {pages.length}</span>
          <button
            className="tp-sketch-nav-btn"
            onClick={e => { e.stopPropagation(); setPageIdx(p => Math.min(pages.length - 1, p + 1)) }}
            disabled={pageIdx >= pages.length - 1}
          >›</button>
        </div>
      )}
      <button
        className="tp-sketch-clear"
        onClick={e => { e.stopPropagation(); onChange(null) }}
        title="Remove sketch"
      >×</button>
    </div>
  )
}

// ── FABRIC LAYER WITH SWATCH ──────────────────────────────────

function FabricLayer({ label, data, onChange, onRemove, removable }) {
  const swatchRef = useRef(null)

  if (!data) {
    return (
      <button className="btn-ghost-sm" style={{ marginBottom: 8 }} onClick={() => onChange(emptyLayer())}>
        + Add {label}
      </button>
    )
  }

  async function handleSwatch(file) {
    if (!file.type.startsWith('image/')) return
    try {
      const compressed = await compressImage(file)
      onChange({ ...data, swatchSrc: compressed })
    } catch (_) {}
  }

  return (
    <div className="tp-fabric-row">
      <div
        className="tp-swatch-slot"
        onClick={() => swatchRef.current.click()}
        title="Upload swatch photo"
      >
        <input
          ref={swatchRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => { if (e.target.files[0]) handleSwatch(e.target.files[0]); e.target.value = '' }}
        />
        {data.swatchSrc
          ? <img src={data.swatchSrc} alt={`${label} swatch`} className="tp-swatch-img" />
          : <span className="tp-swatch-placeholder">{label.charAt(0)}</span>
        }
      </div>
      <div className="tp-fabric-content">
        <div className="fabric-layer-header">
          <span className="layer-label">{label}</span>
          {removable && <button className="btn-remove-sm" onClick={onRemove}>Remove</button>}
        </div>
        <div className="fabric-fields">
          <input className="input input-sm" value={data.fabric} onChange={e => onChange({ ...data, fabric: e.target.value })} placeholder="Fabric" />
          <input className="input input-sm" value={data.weight} onChange={e => onChange({ ...data, weight: e.target.value })} placeholder="Weight / GSM" />
          <input className="input input-sm" value={data.supplier} onChange={e => onChange({ ...data, supplier: e.target.value })} placeholder="Supplier" />
          <input className="input input-sm" value={data.notes} onChange={e => onChange({ ...data, notes: e.target.value })} placeholder="Colour, finish, notes…" />
        </div>
      </div>
    </div>
  )
}

// ── COLORWAYS ─────────────────────────────────────────────────

function Colorways({ colorways, onChange }) {
  const swatchRef = useRef(null)
  const [activeId, setActiveId] = useState(null)

  function add() {
    onChange([...colorways, { id: generateId(), name: '', hex: '#c9a96e', swatchSrc: null }])
  }

  function update(id, patch) {
    onChange(colorways.map(c => c.id === id ? { ...c, ...patch } : c))
  }

  function remove(id) {
    onChange(colorways.filter(c => c.id !== id))
  }

  async function handleSwatchFile(id, file) {
    if (!file.type.startsWith('image/')) return
    try {
      const compressed = await compressImage(file)
      update(id, { swatchSrc: compressed })
    } catch (_) {}
  }

  return (
    <div className="tp-colorways">
      <input
        ref={swatchRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => {
          if (e.target.files[0] && activeId) handleSwatchFile(activeId, e.target.files[0])
          e.target.value = ''
          setActiveId(null)
        }}
      />
      {colorways.map(c => (
        <div key={c.id} className="tp-colorway">
          <div
            className="tp-colorway-swatch"
            style={{ background: c.swatchSrc ? undefined : c.hex }}
            onClick={() => { setActiveId(c.id); swatchRef.current?.click() }}
            title="Click to upload swatch photo"
          >
            {c.swatchSrc && <img src={c.swatchSrc} alt="" />}
          </div>
          <input
            className="tp-colorway-name"
            value={c.name}
            onChange={e => update(c.id, { name: e.target.value })}
            placeholder="Name"
          />
          {!c.swatchSrc && (
            <input
              type="color"
              className="tp-colorway-hex"
              value={c.hex}
              onChange={e => update(c.id, { hex: e.target.value })}
              title="Pick colour"
            />
          )}
          <button className="tp-colorway-remove" onClick={() => remove(c.id)} title="Remove">×</button>
        </div>
      ))}
      <button className="tp-colorway-add btn-ghost-sm" onClick={add}>+ Add Color</button>
    </div>
  )
}

// ── TECH PACK CARD ────────────────────────────────────────────

function TechPackCard({ piece, pageNum, onUpdate, onDelete }) {
  const classStr = [piece.category, piece.season, piece.styleCode, piece.name]
    .filter(Boolean)
    .join(' // ')

  function updateLayer(key, val) {
    onUpdate({ ...piece, fabricLayers: { ...piece.fabricLayers, [key]: val } })
  }

  return (
    <div className={`tp-card${piece.complete ? ' tp-card-complete' : ''}`}>
      <div className="tp-page-label">Style Overview | PAGE {pageNum}</div>

      {/* ── Header ── */}
      <div className="tp-header">
        <div className="tp-header-fields">
          <div className="tp-field tp-field-wide">
            <label className="tp-field-label">STYLE NAME</label>
            <input
              className="tp-field-input"
              value={piece.name}
              onChange={e => onUpdate({ ...piece, name: e.target.value })}
              placeholder="Style Name"
            />
          </div>
          <div className="tp-field">
            <label className="tp-field-label">SEASON</label>
            <input className="tp-field-input" value={piece.season ?? ''} onChange={e => onUpdate({ ...piece, season: e.target.value })} placeholder="AW25" />
          </div>
          <div className="tp-field">
            <label className="tp-field-label">CATEGORY</label>
            <input className="tp-field-input" value={piece.category ?? ''} onChange={e => onUpdate({ ...piece, category: e.target.value })} placeholder="Outerwear" />
          </div>
          <div className="tp-field">
            <label className="tp-field-label">FIT</label>
            <input className="tp-field-input" value={piece.fit ?? ''} onChange={e => onUpdate({ ...piece, fit: e.target.value })} placeholder="Oversized" />
          </div>
          <div className="tp-field">
            <label className="tp-field-label">STYLE CODE</label>
            <input className="tp-field-input" value={piece.styleCode ?? ''} onChange={e => onUpdate({ ...piece, styleCode: e.target.value })} placeholder="SC-001" />
          </div>
        </div>
        {classStr && <div className="tp-class-string">{classStr}</div>}
      </div>

      {/* ── Flat Sketches ── */}
      <div className="tp-section">
        <div className="tp-section-label">FLAT SKETCHES</div>
        <div className="tp-sketch-grid">
          <SketchSlot
            label="FRONT"
            data={piece.sketchFront ?? null}
            onChange={val => onUpdate({ ...piece, sketchFront: val })}
          />
          <SketchSlot
            label="BACK"
            data={piece.sketchBack ?? null}
            onChange={val => onUpdate({ ...piece, sketchBack: val })}
          />
        </div>
      </div>

      {/* ── Fabric Layers ── */}
      <div className="tp-section">
        <div className="tp-section-label">FABRIC LAYERS</div>
        <FabricLayer
          label="Shell"
          data={piece.fabricLayers?.shell ?? emptyLayer()}
          onChange={v => updateLayer('shell', v)}
          removable={false}
          onRemove={null}
        />
        <FabricLayer
          label="Lining"
          data={piece.fabricLayers?.lining ?? null}
          onChange={v => updateLayer('lining', v)}
          onRemove={() => updateLayer('lining', null)}
          removable={true}
        />
        <FabricLayer
          label="Insulation"
          data={piece.fabricLayers?.insulation ?? null}
          onChange={v => updateLayer('insulation', v)}
          onRemove={() => updateLayer('insulation', null)}
          removable={true}
        />
      </div>

      {/* ── Colorways ── */}
      <div className="tp-section">
        <div className="tp-section-label">COLORWAYS</div>
        <Colorways
          colorways={piece.colorways ?? []}
          onChange={colorways => onUpdate({ ...piece, colorways })}
        />
      </div>

      {/* ── Construction Notes ── */}
      <div className="tp-section">
        <div className="tp-section-label">CONSTRUCTION NOTES</div>
        <textarea
          className="textarea textarea-sm"
          value={piece.constructionNotes ?? ''}
          onChange={e => onUpdate({ ...piece, constructionNotes: e.target.value })}
          placeholder="Stitching, seam allowances, finishing details, special techniques…"
          rows={4}
          style={{ resize: 'none' }}
        />
      </div>

      {/* ── Footer ── */}
      <div className="tp-card-footer">
        <button
          className={`tp-complete-btn${piece.complete ? ' complete' : ''}`}
          onClick={() => onUpdate({ ...piece, complete: !piece.complete })}
        >
          {piece.complete ? '✓ Complete' : 'Mark Complete'}
        </button>
        <button className="btn-icon danger" onClick={onDelete} title="Delete piece">×</button>
      </div>
    </div>
  )
}

// ── MAIN EXPORT ───────────────────────────────────────────────

export default function StyleCards({ data, onChange }) {
  const pieces = data.pieces ?? []
  const allComplete = pieces.length > 0 && pieces.every(p => p.complete)

  function addPiece() {
    onChange({ ...data, pieces: [...pieces, createPiece(pieces.length)] })
  }

  function updatePiece(id, updated) {
    onChange({ ...data, pieces: pieces.map(p => p.id === id ? updated : p) })
  }

  function deletePiece(id) {
    onChange({ ...data, pieces: pieces.filter(p => p.id !== id) })
  }

  return (
    <div className="tp-workspace">
      <div className="tp-toolbar">
        <div className="tp-toolbar-left">
          <h3 className="tp-title">Tech Pack</h3>
          {allComplete && (
            <span className="tp-collection-complete">✓ Collection Complete</span>
          )}
        </div>
        <button className="btn-primary" style={{ fontSize: 12, padding: '7px 16px' }} onClick={addPiece}>
          + Add Piece
        </button>
      </div>

      {pieces.length === 0 ? (
        <div className="sk-empty" style={{ maxWidth: 420, margin: '60px auto' }}>
          <p className="sk-empty-title">Start your tech pack</p>
          <p className="sk-empty-text">Add a piece to create your first style card — flat sketches, fabric specs, colorways, and construction notes all in one place.</p>
          <button className="btn-primary" onClick={addPiece}>+ Add Piece</button>
        </div>
      ) : (
        <div className="tp-cards-list">
          {pieces.map((piece, i) => (
            <TechPackCard
              key={piece.id}
              piece={piece}
              pageNum={String(i + 1).padStart(2, '0')}
              onUpdate={updated => updatePiece(piece.id, updated)}
              onDelete={() => deletePiece(piece.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
