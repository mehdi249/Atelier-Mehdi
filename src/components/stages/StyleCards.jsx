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
    sketch: null,
    sketchFront: null,
    sketchBack: null,
    fabricLayers: { shell: emptyLayer(), lining: null, insulation: null },
    constructionNotes: '',
    colorways: [],
    complete: false,
    images: [],
  }
}

// ── TECH PACK SKETCH PANEL ────────────────────────────────────
// Single upload zone that renders all pages and shows a carousel.

function TechPackSketchPanel({ piece, onUpdate }) {
  const fileRef  = useRef(null)
  const [rendering, setRendering] = useState(false)
  const [pageIdx, setPageIdx]     = useState(0)
  const swipeXRef = useRef(0)

  const sketch   = piece.sketch
  const pages    = sketch?.pages
  const hasPages = Array.isArray(pages) && pages.length > 1
  const showDots = hasPages && pages.length <= 10
  const displaySrc  = hasPages ? pages[pageIdx] : sketch?.src
  const isCoverPage = (sketch?.coverPageIdx ?? 0) === pageIdx

  useEffect(() => { setPageIdx(0) }, [sketch?.src])

  async function handleFile(file) {
    const cat = getFileCategory(file)
    if (cat === 'unknown') return
    setRendering(true)
    try {
      if (cat === 'image') {
        const compressed = await compressImage(file)
        onUpdate({ ...piece, sketch: { src: compressed, pages: [compressed], pageCount: 1, fileCategory: 'image', coverPageIdx: 0 } })
      } else {
        const result = await renderFilePreview(file, 1)
        if (!result?.dataUrl) return
        const isSingle   = (result.pageCount ?? 1) <= 1
        const rawPages   = isSingle ? null : await renderAllPages(file)
        const safePages  = rawPages?.length > 0 ? rawPages : [result.dataUrl]
        onUpdate({
          ...piece,
          sketch: {
            src: result.dataUrl,
            pages: safePages,
            pageCount: result.pageCount ?? 1,
            fileCategory: result.fileCategory,
            coverPageIdx: 0,
          },
        })
      }
    } catch (_) {
    } finally {
      setRendering(false)
    }
  }

  function setCover() {
    if (!hasPages || isCoverPage) return
    onUpdate({ ...piece, sketch: { ...sketch, src: pages[pageIdx], coverPageIdx: pageIdx } })
  }

  // ── Loading ──
  if (rendering) {
    return (
      <div className="tp-sketch-panel tp-sketch-panel-loading">
        <div className="tp-sketch-panel-spin">⟳</div>
        <span className="tp-sketch-panel-loading-text">Rendering pages…</span>
      </div>
    )
  }

  // ── Empty ──
  if (!sketch) {
    return (
      <div className="tp-sketch-panel tp-sketch-panel-empty" onClick={() => fileRef.current.click()}>
        <input
          ref={fileRef}
          type="file"
          accept={DESIGN_FILE_ACCEPT}
          style={{ display: 'none' }}
          onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = '' }}
        />
        <span className="tp-sketch-panel-up-icon">↑</span>
        <span className="tp-sketch-panel-up-label">Upload Tech Pack</span>
        <span className="tp-sketch-panel-up-hint">AI · PDF · SVG · Image</span>
      </div>
    )
  }

  // ── Carousel ──
  return (
    <div
      className="tp-sketch-panel tp-sketch-panel-filled"
      onTouchStart={e => { swipeXRef.current = e.touches[0].clientX }}
      onTouchEnd={e => {
        if (!hasPages) return
        const dx = e.changedTouches[0].clientX - swipeXRef.current
        if (dx > 40)  setPageIdx(p => Math.max(0, p - 1))
        if (dx < -40) setPageIdx(p => Math.min(pages.length - 1, p + 1))
      }}
    >
      {/* Page counter */}
      {hasPages && (
        <div className="tp-sketch-panel-counter">Page {pageIdx + 1} of {pages.length}</div>
      )}

      <img src={displaySrc} alt={`Page ${pageIdx + 1}`} className="tp-sketch-panel-img" draggable={false} />

      {/* Left / right arrows */}
      {hasPages && pageIdx > 0 && (
        <button className="tp-sketch-panel-arrow tp-sketch-panel-prev" onClick={() => setPageIdx(p => p - 1)}>‹</button>
      )}
      {hasPages && pageIdx < pages.length - 1 && (
        <button className="tp-sketch-panel-arrow tp-sketch-panel-next" onClick={() => setPageIdx(p => p + 1)}>›</button>
      )}

      {/* Dots (≤10 pages) */}
      {showDots && (
        <div className="tp-sketch-panel-dots">
          {pages.map((_, i) => (
            <button
              key={i}
              className={`tp-sketch-panel-dot${i === pageIdx ? ' active' : ''}`}
              onClick={() => setPageIdx(i)}
              aria-label={`Page ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Actions bar */}
      <div className="tp-sketch-panel-actions">
        {hasPages && (
          <button
            className={`tp-sketch-panel-cover-btn${isCoverPage ? ' is-cover' : ''}`}
            onClick={setCover}
            disabled={isCoverPage}
          >
            {isCoverPage ? '★ Cover' : 'Set as Cover'}
          </button>
        )}
        <button
          className="tp-sketch-panel-remove-btn"
          onClick={() => onUpdate({ ...piece, sketch: null })}
        >
          Remove
        </button>
      </div>
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
    try { onChange({ ...data, swatchSrc: await compressImage(file) }) } catch (_) {}
  }

  return (
    <div className="tp-fabric-row">
      <div className="tp-swatch-slot" onClick={() => swatchRef.current.click()} title="Upload swatch">
        <input ref={swatchRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { if (e.target.files[0]) handleSwatch(e.target.files[0]); e.target.value = '' }} />
        {data.swatchSrc
          ? <img src={data.swatchSrc} alt="" className="tp-swatch-img" />
          : <span className="tp-swatch-placeholder">{label.charAt(0)}</span>
        }
      </div>
      <div className="tp-fabric-content">
        <div className="fabric-layer-header">
          <span className="layer-label">{label}</span>
          {removable && <button className="btn-remove-sm" onClick={onRemove}>Remove</button>}
        </div>
        <div className="fabric-fields">
          <input className="input input-sm" value={data.fabric}   onChange={e => onChange({ ...data, fabric:   e.target.value })} placeholder="Fabric" />
          <input className="input input-sm" value={data.weight}   onChange={e => onChange({ ...data, weight:   e.target.value })} placeholder="Weight / GSM" />
          <input className="input input-sm" value={data.supplier} onChange={e => onChange({ ...data, supplier: e.target.value })} placeholder="Supplier" />
          <input className="input input-sm" value={data.notes}    onChange={e => onChange({ ...data, notes:    e.target.value })} placeholder="Colour, finish, notes…" />
        </div>
      </div>
    </div>
  )
}

// ── COLORWAYS ─────────────────────────────────────────────────

function Colorways({ colorways, onChange }) {
  const swatchRef = useRef(null)
  const [activeId, setActiveId] = useState(null)

  function add()              { onChange([...colorways, { id: generateId(), name: '', hex: '#c9a96e', swatchSrc: null }]) }
  function update(id, patch)  { onChange(colorways.map(c => c.id === id ? { ...c, ...patch } : c)) }
  function remove(id)         { onChange(colorways.filter(c => c.id !== id)) }

  async function handleSwatchFile(id, file) {
    if (!file.type.startsWith('image/')) return
    try { update(id, { swatchSrc: await compressImage(file) }) } catch (_) {}
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
            title="Upload swatch photo"
          >
            {c.swatchSrc && <img src={c.swatchSrc} alt="" />}
          </div>
          <input className="tp-colorway-name" value={c.name} onChange={e => update(c.id, { name: e.target.value })} placeholder="Name" />
          {!c.swatchSrc && (
            <input type="color" className="tp-colorway-hex" value={c.hex} onChange={e => update(c.id, { hex: e.target.value })} />
          )}
          <button className="tp-colorway-remove" onClick={() => remove(c.id)} title="Remove">×</button>
        </div>
      ))}
      <button className="tp-colorway-add btn-ghost-sm" onClick={add}>+ Add Color</button>
    </div>
  )
}

// ── PIECE GRID CARD ───────────────────────────────────────────

function PieceCard({ piece, isSelected, onClick }) {
  // Support both new `sketch` field and legacy `sketchFront` for backward compat
  const coverSrc  = piece.sketch?.src ?? piece.sketchFront?.src
  const pageCount = piece.sketch?.pages?.length ?? 0

  return (
    <div
      className={`tp-piece-card${isSelected ? ' selected' : ''}${piece.complete ? ' complete' : ''}`}
      onClick={onClick}
    >
      <div className="tp-piece-cover">
        {coverSrc
          ? <img src={coverSrc} alt={piece.name} />
          : (
            <div className="tp-piece-cover-empty">
              <span className="tp-piece-cover-plus">+</span>
              <span className="tp-piece-cover-hint">Upload sketch</span>
            </div>
          )
        }
        <div className={`tp-piece-dot${piece.complete ? ' complete' : ''}`} />
        {pageCount > 1 && <span className="tp-piece-pages">{pageCount} pages</span>}
      </div>
      <div className="tp-piece-footer">
        <span className="tp-piece-name">{piece.name}</span>
        {piece.styleCode && <span className="tp-piece-code">{piece.styleCode}</span>}
      </div>
    </div>
  )
}

// ── DETAIL PANEL ──────────────────────────────────────────────

function PieceDetailPanel({ piece, pieceNum, onUpdate, onDelete, onClose }) {
  function updateLayer(key, val) {
    onUpdate({ ...piece, fabricLayers: { ...piece.fabricLayers, [key]: val } })
  }

  const classStr = [piece.category, piece.season, piece.styleCode, piece.name].filter(Boolean).join(' // ')

  return (
    <div className="tp-detail">
      {/* Header */}
      <div className="tp-detail-header">
        <div className="tp-detail-header-left">
          <span className="tp-detail-page-label">Style Overview | PAGE {pieceNum}</span>
          <input
            className="tp-detail-name-input"
            value={piece.name}
            onChange={e => onUpdate({ ...piece, name: e.target.value })}
            placeholder="Style Name"
          />
        </div>
        <button className="btn-icon" onClick={onClose} title="Close">✕</button>
      </div>

      {/* Unified multi-page sketch carousel */}
      <TechPackSketchPanel piece={piece} onUpdate={onUpdate} />

      {/* Metadata fields */}
      <div className="tp-detail-fields">
        <div className="tp-detail-field">
          <label className="tp-field-label">SEASON</label>
          <input className="tp-field-input" value={piece.season ?? ''} onChange={e => onUpdate({ ...piece, season: e.target.value })} placeholder="AW25" />
        </div>
        <div className="tp-detail-field">
          <label className="tp-field-label">CATEGORY</label>
          <input className="tp-field-input" value={piece.category ?? ''} onChange={e => onUpdate({ ...piece, category: e.target.value })} placeholder="Outerwear" />
        </div>
        <div className="tp-detail-field">
          <label className="tp-field-label">FIT</label>
          <input className="tp-field-input" value={piece.fit ?? ''} onChange={e => onUpdate({ ...piece, fit: e.target.value })} placeholder="Oversized" />
        </div>
        <div className="tp-detail-field">
          <label className="tp-field-label">STYLE CODE</label>
          <input className="tp-field-input" value={piece.styleCode ?? ''} onChange={e => onUpdate({ ...piece, styleCode: e.target.value })} placeholder="SC-001" />
        </div>
      </div>

      {classStr && <div className="tp-class-string-row">{classStr}</div>}

      {/* Fabric layers */}
      <div className="tp-detail-section">
        <div className="tp-section-label">FABRIC LAYERS</div>
        <FabricLayer label="Shell"      data={piece.fabricLayers?.shell      ?? emptyLayer()} onChange={v => updateLayer('shell', v)}      removable={false} onRemove={null} />
        <FabricLayer label="Lining"     data={piece.fabricLayers?.lining     ?? null}          onChange={v => updateLayer('lining', v)}     onRemove={() => updateLayer('lining', null)}     removable={true} />
        <FabricLayer label="Insulation" data={piece.fabricLayers?.insulation ?? null}          onChange={v => updateLayer('insulation', v)} onRemove={() => updateLayer('insulation', null)} removable={true} />
      </div>

      {/* Colorways */}
      <div className="tp-detail-section">
        <div className="tp-section-label">COLORWAYS</div>
        <Colorways colorways={piece.colorways ?? []} onChange={colorways => onUpdate({ ...piece, colorways })} />
      </div>

      {/* Construction notes */}
      <div className="tp-detail-section">
        <div className="tp-section-label">CONSTRUCTION NOTES</div>
        <textarea
          className="textarea textarea-sm"
          value={piece.constructionNotes ?? ''}
          onChange={e => onUpdate({ ...piece, constructionNotes: e.target.value })}
          placeholder="Stitching, seam allowances, finishing details…"
          rows={4}
          style={{ resize: 'none' }}
        />
      </div>

      {/* Footer */}
      <div className="tp-detail-footer">
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
  const [selectedId, setSelectedId] = useState(null)
  const pieces      = data.pieces ?? []
  const allComplete = pieces.length > 0 && pieces.every(p => p.complete)

  function addPiece() {
    const p = createPiece(pieces.length)
    onChange({ ...data, pieces: [...pieces, p] })
    setSelectedId(p.id)
  }

  function updatePiece(id, updated) {
    onChange({ ...data, pieces: pieces.map(p => p.id === id ? updated : p) })
  }

  function deletePiece(id) {
    onChange({ ...data, pieces: pieces.filter(p => p.id !== id) })
    setSelectedId(null)
  }

  const selectedPiece = pieces.find(p => p.id === selectedId)
  const selectedIdx   = pieces.findIndex(p => p.id === selectedId)

  return (
    <div className="tp-workspace">
      <div className="tp-toolbar">
        <div className="tp-toolbar-left">
          <h3 className="tp-title">Style Cards</h3>
          {allComplete && <span className="tp-collection-complete">✓ Collection Complete</span>}
        </div>
        <button className="btn-primary" style={{ fontSize: 12, padding: '7px 16px' }} onClick={addPiece}>
          + Add Piece
        </button>
      </div>

      <div className="tp-body">
        {pieces.length === 0 ? (
          <div className="sk-empty" style={{ maxWidth: 400, margin: '60px auto' }}>
            <p className="sk-empty-title">Build your tech pack</p>
            <p className="sk-empty-text">Add a piece to start — each card holds the flat sketch, fabric specs, colorways, and construction notes.</p>
            <button className="btn-primary" onClick={addPiece}>+ Add Piece</button>
          </div>
        ) : (
          <div className="tp-grid">
            {pieces.map(piece => (
              <PieceCard
                key={piece.id}
                piece={piece}
                isSelected={selectedId === piece.id}
                onClick={() => setSelectedId(selectedId === piece.id ? null : piece.id)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedPiece && (
        <>
          <div className="tp-detail-backdrop" onClick={() => setSelectedId(null)} />
          <PieceDetailPanel
            piece={selectedPiece}
            pieceNum={String(selectedIdx + 1).padStart(2, '0')}
            onUpdate={updated => updatePiece(selectedPiece.id, updated)}
            onDelete={() => deletePiece(selectedPiece.id)}
            onClose={() => setSelectedId(null)}
          />
        </>
      )}
    </div>
  )
}
