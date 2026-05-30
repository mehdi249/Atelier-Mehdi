import React, { useState, useRef, useEffect } from 'react'
import { generateId, compressImage } from '../../utils'
import { renderAllPages, getFileCategory } from '../../filePreview'
import { dxfToSvg } from '../../dxfRenderer'

const STAGES = [
  { key: 'draft',  label: 'Draft',  color: '#636366' },
  { key: 'fitted', label: 'Fitted', color: '#5e9eca' },
  { key: 'final',  label: 'Final',  color: '#c9a96e' },
]

const ADD_OPTIONS = [
  { key: 'pdf',   label: 'Import PDF / AI / SVG',      accept: '.pdf,.ai,.svg' },
  { key: 'dxf',   label: 'Import DXF',                 accept: '.dxf' },
  { key: 'clo3d', label: 'Import CLO3D (.zprj)',        accept: '.zprj' },
  { key: 'opf',   label: 'Import Optitex (.pds / .opf)', accept: '.pds,.opf' },
  { key: 'image', label: 'Import Image',               accept: 'image/*' },
]

// ── NATIVE FILE PREVIEW EXTRACTION ───────────────────────────────────────────

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload  = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(blob)
  })
}

// Validate that a data-url actually decodes as an image
function validateDataUrl(dataUrl) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload  = () => resolve(dataUrl)
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
}

// Comprehensive raw-byte scanner — finds the largest valid PNG, JPEG, or BMP
// embedded anywhere in the binary (works for uncompressed ZIP entries and many
// proprietary binary formats that embed a thumbnail).
async function scanForEmbeddedImage(bytes) {
  const PNG_SIG  = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]
  const PNG_IEND = [0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]
  const candidates = [] // { data, size, type }

  // ── PNG ──────────────────────────────────────────────────────────────────
  for (let i = 0; i < bytes.length - 8; i++) {
    if (PNG_SIG.every((b, j) => bytes[i + j] === b)) {
      for (let j = i + 8; j <= bytes.length - 8; j++) {
        if (PNG_IEND.every((b, k) => bytes[j + k] === b)) {
          const slice = bytes.slice(i, j + 8)
          if (slice.length > 256) candidates.push({ data: slice, type: 'image/png', size: slice.length })
          break
        }
      }
    }
  }

  // ── JPEG — search for the LARGEST block, not just first ─────────────────
  // For each JPEG start, scan backwards from end of file for the last EOI marker.
  // This avoids cutting off at a false FF D9 inside compressed image data.
  for (let i = 0; i < bytes.length - 4; i++) {
    if (bytes[i] === 0xFF && bytes[i + 1] === 0xD8 && bytes[i + 2] === 0xFF) {
      // Scan backwards from end of file for FF D9
      for (let j = bytes.length - 2; j > i + 512; j--) {
        if (bytes[j] === 0xFF && bytes[j + 1] === 0xD9) {
          const slice = bytes.slice(i, j + 2)
          if (slice.length > 512) candidates.push({ data: slice, type: 'image/jpeg', size: slice.length })
          break
        }
      }
      // Only try the first JPEG start — if largest JPEG fails we'll know
      break
    }
  }

  // ── BMP — header "BM" with embedded 4-byte file size ────────────────────
  for (let i = 0; i < bytes.length - 54; i++) {
    if (bytes[i] === 0x42 && bytes[i + 1] === 0x4D) {
      const sz = bytes[i+2] | (bytes[i+3] << 8) | (bytes[i+4] << 16) | (bytes[i+5] << 24)
      if (sz > 1024 && sz < 40 * 1024 * 1024 && i + sz <= bytes.length) {
        candidates.push({ data: bytes.slice(i, i + sz), type: 'image/bmp', size: sz })
      }
    }
  }

  // ── WebP — RIFF....WEBP ──────────────────────────────────────────────────
  for (let i = 0; i < bytes.length - 12; i++) {
    if (bytes[i] === 0x52 && bytes[i+1] === 0x49 && bytes[i+2] === 0x46 && bytes[i+3] === 0x46 &&
        bytes[i+8] === 0x57 && bytes[i+9] === 0x45 && bytes[i+10] === 0x42 && bytes[i+11] === 0x50) {
      const sz = 12 + (bytes[i+4] | (bytes[i+5]<<8) | (bytes[i+6]<<16) | (bytes[i+7]<<24))
      if (sz > 256 && i + sz <= bytes.length) {
        candidates.push({ data: bytes.slice(i, i + sz), type: 'image/webp', size: sz })
      }
    }
  }

  // Try candidates largest-first; return first that validates as a real image
  candidates.sort((a, b) => b.size - a.size)
  for (const c of candidates) {
    try {
      const dataUrl = await blobToDataUrl(new Blob([c.data], { type: c.type }))
      const valid   = await validateDataUrl(dataUrl)
      if (valid) return valid
    } catch (_) {}
  }
  return null
}


async function extractZprjPreview(file) {
  const buffer = await file.arrayBuffer()
  const bytes  = new Uint8Array(buffer)

  // ① Try fflate ZIP extraction — pick the largest image (best render quality)
  try {
    const { unzipSync } = await import('fflate')
    const entries = unzipSync(bytes)
    const keys    = Object.keys(entries)

    const images = keys
      .filter(k => /\.(png|jpe?g?)$/i.test(k) && entries[k].length > 1024)
      .sort((a, b) => {
        // Prefer gallery/screenshot/render paths; otherwise take the largest file
        const scoreA = /gallery|screenshot|render|thumb/i.test(a) ? 1e8 : 0
        const scoreB = /gallery|screenshot|render|thumb/i.test(b) ? 1e8 : 0
        return (scoreB + entries[b].length) - (scoreA + entries[a].length)
      })

    if (images.length > 0) {
      const key  = images[0]
      const mime = /\.png$/i.test(key) ? 'image/png' : 'image/jpeg'
      const result = await blobToDataUrl(new Blob([entries[key]], { type: mime }))
      if (result) return result
    }
  } catch (e) {
    console.warn('fflate ZPRJ parse failed, falling back to raw scan:', e.message)
  }

  // ② Fallback: CLO3D often stores PNG renders uncompressed inside the ZIP,
  //    so their raw bytes are visible in the file and can be sliced out directly.
  return await scanForEmbeddedImage(bytes)
}

async function extractOptitexPreview(file) {
  const buffer = await file.arrayBuffer()
  const bytes  = new Uint8Array(buffer)

  // ① If ZIP-based (newer PDS/OPF), try fflate
  if (bytes[0] === 0x50 && bytes[1] === 0x4B) {
    try {
      const { unzipSync } = await import('fflate')
      const entries = unzipSync(bytes)
      const images  = Object.keys(entries)
        .filter(k => /\.(png|jpe?g?)$/i.test(k) && entries[k].length > 1024)
        .sort((a, b) => entries[b].length - entries[a].length)
      if (images.length > 0) {
        const key  = images[0]
        const mime = /\.png$/i.test(key) ? 'image/png' : 'image/jpeg'
        const result = await blobToDataUrl(new Blob([entries[key]], { type: mime }))
        if (result) return result
      }
    } catch (e) {
      console.warn('fflate Optitex parse failed:', e.message)
    }
  }

  // ② Raw binary scan for embedded preview image
  return await scanForEmbeddedImage(bytes)
}

function createVersion(num) {
  return {
    id: generateId(),
    versionNum: num,
    src: null,
    pages: [],
    pageCount: 0,
    fileCategory: null,
    nativeName: null,
    note: '',
    createdAt: Date.now(),
  }
}

function createPiece(name = 'Pattern Piece') {
  return {
    id: generateId(),
    name,
    stage: 'draft',
    sizeRange: '',
    seamAllowance: '',
    gradingNotes: '',
    versions: [],
    coverVersionId: null,
  }
}

// ── FILE PROCESSING ──────────────────────────────────────────────────────────

async function processFile(file, versionNum) {
  const ext = file.name.split('.').pop().toLowerCase()

  if (ext === 'zprj') {
    const previewSrc = await extractZprjPreview(file)
    return {
      ...createVersion(versionNum),
      fileCategory: 'zprj',
      nativeName: file.name,
      src: previewSrc,
      pages: previewSrc ? [previewSrc] : [],
      pageCount: previewSrc ? 1 : 0,
    }
  }

  if (ext === 'pds' || ext === 'opf') {
    const previewSrc = await extractOptitexPreview(file)
    return {
      ...createVersion(versionNum),
      fileCategory: ext,
      nativeName: file.name,
      src: previewSrc,
      pages: previewSrc ? [previewSrc] : [],
      pageCount: previewSrc ? 1 : 0,
    }
  }

  if (ext === 'dxf') {
    const text = await file.text()
    const src = dxfToSvg(text)
    return {
      ...createVersion(versionNum),
      fileCategory: 'dxf',
      src,
      pages: src ? [src] : [],
      pageCount: src ? 1 : 0,
    }
  }

  const cat = getFileCategory(file)
  if (cat === 'image') {
    const src = await compressImage(file)
    return { ...createVersion(versionNum), fileCategory: 'image', src, pages: [src], pageCount: 1 }
  }

  const pages = await renderAllPages(file, 1200)
  return {
    ...createVersion(versionNum),
    fileCategory: cat,
    src: pages[0] ?? null,
    pages,
    pageCount: pages.length,
  }
}

// ── ADD PATTERN MENU ─────────────────────────────────────────────────────────

function AddPatternMenu({ onAdd }) {
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [accept, setAccept]   = useState('')
  const menuRef  = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function close(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  function pick(acceptStr) {
    setAccept(acceptStr)
    setOpen(false)
    setTimeout(() => inputRef.current?.click(), 30)
  }

  async function handleFiles(files) {
    setLoading(true)
    for (const file of Array.from(files)) {
      const version = await processFile(file, 1)
      const piece = {
        ...createPiece(file.name.replace(/\.[^.]+$/, '')),
        versions: [version],
        coverVersionId: version.id,
      }
      onAdd(piece)
    }
    setLoading(false)
  }

  return (
    <div className="pt-add-wrap" ref={menuRef}>
      <input ref={inputRef} type="file" multiple accept={accept} style={{ display: 'none' }}
        onChange={e => { handleFiles(e.target.files); e.target.value = '' }} />
      <button className="btn-primary-sm" disabled={loading} onClick={() => setOpen(o => !o)}>
        {loading ? 'Importing…' : '+ Add Pattern ▾'}
      </button>
      {open && (
        <div className="pt-add-menu">
          {ADD_OPTIONS.map(o => (
            <button key={o.key} onClick={() => pick(o.accept)}>{o.label}</button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── NATIVE FILE BADGE ────────────────────────────────────────────────────────

function nativeAppLabel(ext) {
  if (ext === 'zprj') return 'Open in CLO3D'
  if (ext === 'pds' || ext === 'opf') return 'Open in Optitex'
  return 'Native file'
}

function NativeBadge({ filename }) {
  const ext = filename?.split('.').pop()?.toLowerCase()
  return (
    <div className="pt-native-badge">
      <span className="pt-native-icon">⬢</span>
      <div className="pt-native-text">
        <span className="pt-native-label">Native file — {nativeAppLabel(ext)}</span>
        <span className="pt-native-name">{filename}</span>
      </div>
    </div>
  )
}

// Small overlay chip shown on top of an extracted preview image
function NativeChip({ filename }) {
  const ext = filename?.split('.').pop()?.toUpperCase()
  return <span className="pt-native-chip">{ext}</span>
}

// ── VERSION THUMBNAIL ────────────────────────────────────────────────────────

function VersionThumb({ version, isActive, onClick }) {
  return (
    <button
      className={`pt-ver-thumb${isActive ? ' active' : ''}`}
      onClick={e => { e.stopPropagation(); onClick(version.id) }}
      title={`v${version.versionNum}${version.note ? ': ' + version.note : ''}`}
    >
      <div className="pt-ver-thumb-img">
        {version.src
          ? <img src={version.src} alt="" />
          : version.nativeName
            ? <span className="pt-ver-native-icon">⬢</span>
            : <span className="pt-ver-empty-icon">—</span>
        }
      </div>
      <span className="pt-ver-thumb-label">v{version.versionNum}</span>
    </button>
  )
}

// ── PATTERN CARD ─────────────────────────────────────────────────────────────

function PatternCard({ piece, pieceNum, activeVersionId, onSelectVersion, onClick }) {
  const stage       = STAGES.find(s => s.key === piece.stage) ?? STAGES[0]
  const coverVer    = piece.versions.find(v => v.id === piece.coverVersionId) ?? piece.versions[0]

  return (
    <div
      className={`tp-piece-card${activeVersionId ? ' selected' : ''}`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="tp-piece-card-header">
        <span className="tp-piece-card-label">Pattern | PIECE {String(pieceNum).padStart(2, '0')}</span>
        <span className="tp-piece-card-name">{piece.name}</span>
        <span className="pt-stage-pill" style={{ color: stage.color, borderColor: stage.color + '55' }}>
          {stage.label}
        </span>
        {piece.versions.length > 0 && (
          <span className="pt-ver-count">{piece.versions.length}v</span>
        )}
      </div>

      {/* Body */}
      <div className="tp-piece-card-body">
        {/* Left: version thumbnails */}
        <div className="tp-piece-card-left">
          {piece.versions.length > 0
            ? piece.versions.map(v => (
                <VersionThumb
                  key={v.id}
                  version={v}
                  isActive={v.id === activeVersionId}
                  onClick={vId => onSelectVersion(piece.id, vId)}
                />
              ))
            : <div className="tp-piece-card-left-empty"><span>No versions</span></div>
          }
        </div>

        {/* Right: cover preview */}
        <div className="tp-piece-card-right" style={{ position: 'relative' }}>
          {coverVer?.src ? (
            <>
              <img src={coverVer.src} alt={piece.name} className="tp-piece-card-sketch" />
              {coverVer.nativeName && <NativeChip filename={coverVer.nativeName} />}
            </>
          ) : coverVer?.nativeName ? (
            <NativeBadge filename={coverVer.nativeName} />
          ) : (
            <div className="tp-piece-cover-empty">
              <span className="tp-piece-cover-plus">+</span>
              <span className="tp-piece-cover-hint">Upload pattern</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── DETAIL PANEL ─────────────────────────────────────────────────────────────

function PatternDetailPanel({ piece, pieceNum, activeVersionId, onActiveVersion, onUpdate, onDelete, onClose }) {
  const [pageIdx,      setPageIdx]      = useState(0)
  const [addLoading,   setAddLoading]   = useState(false)
  const [addMenuOpen,  setAddMenuOpen]  = useState(false)
  const [addAccept,    setAddAccept]    = useState('')
  const [editMode,     setEditMode]     = useState(false)
  // editMode state: local copy of versions for reorder/rename
  const [editVersions, setEditVersions] = useState([])
  const [dragIdx,      setDragIdx]      = useState(null)
  const inputRef      = useRef(null)
  const previewImgRef = useRef(null)
  const addMenuRef    = useRef(null)

  useEffect(() => {
    if (!addMenuOpen) return
    function close(e) { if (addMenuRef.current && !addMenuRef.current.contains(e.target)) setAddMenuOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [addMenuOpen])

  function pickVersionFiles(accept) {
    setAddAccept(accept)
    setAddMenuOpen(false)
    setTimeout(() => inputRef.current?.click(), 30)
  }

  function enterEdit() {
    setEditVersions(piece.versions.map(v => ({ ...v })))
    setEditMode(true)
  }

  function saveEdit() {
    // Renumber versions sequentially based on new order
    const renumbered = editVersions.map((v, i) => ({ ...v, versionNum: i + 1 }))
    onUpdate({ ...piece, versions: renumbered })
    setEditMode(false)
  }

  function updateEditNote(id, note) {
    setEditVersions(vs => vs.map(v => v.id === id ? { ...v, note } : v))
  }

  // Drag-to-reorder via mouse and touch
  function handleDragStart(i)  { setDragIdx(i) }
  function handleDragOver(e, i) {
    e.preventDefault()
    if (dragIdx === null || dragIdx === i) return
    const next = [...editVersions]
    const [moved] = next.splice(dragIdx, 1)
    next.splice(i, 0, moved)
    setEditVersions(next)
    setDragIdx(i)
  }
  function handleDragEnd() { setDragIdx(null) }

  const activeVer = piece.versions.find(v => v.id === activeVersionId) ?? piece.versions[0]
  const pages     = activeVer?.pages ?? []
  const hasPages  = pages.length > 1
  const showDots  = hasPages && pages.length <= 10

  useEffect(() => setPageIdx(0), [activeVersionId])

  function set(field, value) { onUpdate({ ...piece, [field]: value }) }

  function setVer(id, fields) {
    onUpdate({ ...piece, versions: piece.versions.map(v => v.id === id ? { ...v, ...fields } : v) })
  }

  async function addVersion(files) {
    setAddLoading(true)
    for (const file of Array.from(files)) {
      const nextNum = (piece.versions[piece.versions.length - 1]?.versionNum ?? 0) + 1
      const ver = await processFile(file, nextNum)
      onUpdate({
        ...piece,
        versions: [...piece.versions, ver],
        coverVersionId: piece.coverVersionId ?? ver.id,
      })
    }
    setAddLoading(false)
  }

  async function addPreviewImage(file) {
    if (!file || !activeVer) return
    const src = await compressImage(file)
    setVer(activeVer.id, { src, pages: [src], pageCount: 1 })
  }

  function setCover() {
    if (!activeVer) return
    const coverSrc = hasPages ? pages[pageIdx] : activeVer.src
    onUpdate({
      ...piece,
      coverVersionId: activeVer.id,
      versions: piece.versions.map(v => v.id === activeVer.id ? { ...v, src: coverSrc } : v),
    })
  }

  function removeVersion(id) {
    const remaining = piece.versions.filter(v => v.id !== id)
    onUpdate({
      ...piece,
      versions: remaining,
      coverVersionId: remaining.length
        ? piece.coverVersionId === id ? remaining[0].id : piece.coverVersionId
        : null,
    })
  }

  const isCover = piece.coverVersionId === activeVer?.id

  return (
    <>
      <div className="tp-detail-backdrop" onClick={onClose} />
      <div className="tp-detail">

        {/* Header */}
        <div className="tp-detail-header">
          <div className="tp-detail-header-left">
            <span className="tp-detail-label">Pattern | PIECE {String(pieceNum).padStart(2, '0')}</span>
            <input
              className="tp-detail-name-input"
              value={piece.name}
              onChange={e => set('name', e.target.value)}
            />
          </div>
          <button className="tp-detail-close" onClick={onClose}>×</button>
        </div>

        {/* Preview */}
        <div className={`tp-sketch-panel${activeVer?.src || pages.length ? ' tp-sketch-panel-filled' : activeVer?.nativeName ? '' : ' tp-sketch-panel-empty'}`}
          style={{ minHeight: 240 }}
          onClick={(!activeVer?.src && !activeVer?.nativeName && pages.length === 0) ? () => inputRef.current?.click() : undefined}
        >
          {activeVer?.nativeName && !activeVer?.src ? (
            <>
              <NativeBadge filename={activeVer.nativeName} />
              <input
                ref={previewImgRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => { addPreviewImage(e.target.files[0]); e.target.value = '' }}
              />
              <button
                className="btn-ghost-sm"
                style={{ marginTop: 12, fontSize: 11 }}
                onClick={() => previewImgRef.current?.click()}
              >
                + Add preview image
              </button>
            </>
          ) : activeVer?.src || pages.length ? (
            <>
              {hasPages && (
                <div className="tp-sketch-panel-counter">Page {pageIdx + 1} of {pages.length}</div>
              )}
              <img
                src={hasPages ? pages[pageIdx] : activeVer.src}
                alt={piece.name}
                className="tp-sketch-panel-img"
              />
              {activeVer.nativeName && <NativeChip filename={activeVer.nativeName} />}
              {hasPages && pageIdx > 0 && (
                <button className="tp-sketch-panel-arrow tp-sketch-panel-prev" onClick={() => setPageIdx(i => i - 1)}>‹</button>
              )}
              {hasPages && pageIdx < pages.length - 1 && (
                <button className="tp-sketch-panel-arrow tp-sketch-panel-next" onClick={() => setPageIdx(i => i + 1)}>›</button>
              )}
              {showDots && (
                <div className="tp-sketch-panel-dots">
                  {pages.map((_, i) => (
                    <button key={i}
                      className={`tp-sketch-panel-dot${i === pageIdx ? ' active' : ''}`}
                      onClick={() => setPageIdx(i)} />
                  ))}
                </div>
              )}
              <div className="tp-sketch-panel-actions">
                <button
                  className={`tp-sketch-panel-cover-btn${isCover ? ' is-cover' : ''}`}
                  onClick={setCover}
                >
                  {isCover ? '✓ Cover' : 'Set as Cover'}
                </button>
                {activeVer && (
                  <button className="tp-sketch-panel-remove-btn" onClick={() => removeVersion(activeVer.id)}>
                    Remove
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <span style={{ fontSize: 28, color: 'var(--text-dim)', fontWeight: 200 }}>+</span>
              <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
                Upload pattern
              </span>
              <span style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 2 }}>
                PDF · DXF · AI · SVG · Image
              </span>
            </>
          )}
        </div>

        {/* Version note */}
        {activeVer && (
          <div className="pt-ver-note-row">
            <textarea
              className="input"
              rows={2}
              style={{ width: '100%', resize: 'none', fontSize: 12 }}
              placeholder="Version notes…"
              value={activeVer.note}
              onChange={e => setVer(activeVer.id, { note: e.target.value })}
            />
          </div>
        )}

        <div className="tp-detail-scroll">

          {/* Stage */}
          <div className="tp-detail-section">
            <div className="tp-section-label">Stage</div>
            <div className="pt-stage-row">
              {STAGES.map(s => (
                <button
                  key={s.key}
                  className="pt-stage-btn"
                  style={{
                    borderColor:  piece.stage === s.key ? s.color : 'var(--border)',
                    color:        piece.stage === s.key ? s.color : 'var(--text-muted)',
                    background:   piece.stage === s.key ? s.color + '18' : 'transparent',
                  }}
                  onClick={() => set('stage', s.key)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fields */}
          <div className="tp-detail-fields">
            <div>
              <label className="tp-field-label">Size Range</label>
              <input className="input" value={piece.sizeRange}
                onChange={e => set('sizeRange', e.target.value)} placeholder="XS – XL" />
            </div>
            <div>
              <label className="tp-field-label">Seam Allowance</label>
              <input className="input" value={piece.seamAllowance}
                onChange={e => set('seamAllowance', e.target.value)} placeholder="1 cm" />
            </div>
          </div>

          {/* Grading notes */}
          <div className="tp-detail-section">
            <label className="tp-field-label">Grading Notes</label>
            <textarea className="input" rows={3}
              style={{ width: '100%', resize: 'none', fontSize: 12 }}
              value={piece.gradingNotes}
              onChange={e => set('gradingNotes', e.target.value)}
              placeholder="Grading rules, ease, construction notes…"
            />
          </div>

          {/* Versions list */}
          <div className="tp-detail-section">
            <div className="pt-ver-section-header">
              <span className="tp-section-label">Versions</span>
              {!editMode
                ? <button className="pt-ver-edit-btn" onClick={enterEdit}>Edit</button>
                : <button className="pt-ver-edit-btn gold" onClick={saveEdit}>Done</button>
              }
            </div>

            {editMode ? (
              /* ── Edit mode: draggable + renameable ── */
              <div className="pt-ver-list">
                {editVersions.map((v, i) => (
                  <div
                    key={v.id}
                    className={`pt-ver-row pt-ver-row-edit${dragIdx === i ? ' dragging' : ''}`}
                    draggable
                    onDragStart={() => handleDragStart(i)}
                    onDragOver={e => handleDragOver(e, i)}
                    onDragEnd={handleDragEnd}
                  >
                    <span className="pt-ver-drag-handle">⠿</span>
                    <div className="pt-ver-row-thumb">
                      {v.src ? <img src={v.src} alt="" /> : v.nativeName ? <span style={{ fontSize: 14 }}>⬢</span> : null}
                    </div>
                    <span className="pt-ver-row-num">v{i + 1}</span>
                    <input
                      className="pt-ver-name-input"
                      value={v.note}
                      placeholder="Version name…"
                      onChange={e => updateEditNote(v.id, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              /* ── Normal mode: tap to switch preview ── */
              <div className="pt-ver-list">
                {piece.versions.map(v => (
                  <div
                    key={v.id}
                    className={`pt-ver-row${v.id === activeVersionId ? ' active' : ''}`}
                    onClick={() => onActiveVersion(v.id)}
                  >
                    <div className="pt-ver-row-thumb">
                      {v.src
                        ? <img src={v.src} alt="" />
                        : v.nativeName
                          ? <span style={{ fontSize: 14 }}>⬢</span>
                          : null}
                    </div>
                    <span className="pt-ver-row-num">v{v.versionNum}</span>
                    <span className="pt-ver-row-note">
                      {v.note || v.nativeName || (v.fileCategory === 'dxf' ? 'DXF pattern' : `${v.fileCategory ?? ''} file`)}
                    </span>
                    {v.id === piece.coverVersionId && (
                      <span className="pt-ver-row-cover">COVER</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <input ref={inputRef} type="file" multiple
              accept={addAccept}
              style={{ display: 'none' }}
              onChange={e => { addVersion(e.target.files); e.target.value = '' }}
            />
            <div className="pt-add-wrap" ref={addMenuRef} style={{ marginTop: 8 }}>
              <button
                className="btn-ghost-sm"
                style={{ width: '100%' }}
                onClick={() => setAddMenuOpen(o => !o)}
                disabled={addLoading}
              >
                {addLoading ? 'Importing…' : '+ Add Version ▾'}
              </button>
              {addMenuOpen && (
                <div className="pt-add-menu" style={{ bottom: 'calc(100% + 4px)', top: 'auto' }}>
                  {ADD_OPTIONS.map(o => (
                    <button key={o.key} onClick={() => pickVersionFiles(o.accept)}>{o.label}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="tp-detail-footer">
          <button className="btn-danger-sm" onClick={onDelete}>Delete piece</button>
        </div>
      </div>
    </>
  )
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────

export default function Patterns({ data, onChange }) {
  const pieces = data.pieces ?? []
  const [selectedPieceId,   setSelectedPieceId]   = useState(null)
  const [selectedVersionId, setSelectedVersionId] = useState(null)

  function updatePieces(next) { onChange({ ...data, pieces: next }) }
  function addPiece(piece)     { updatePieces([...pieces, piece]) }
  function updatePiece(id, p)  { updatePieces(pieces.map(x => x.id === id ? p : x)) }
  function deletePiece(id) {
    updatePieces(pieces.filter(p => p.id !== id))
    if (selectedPieceId === id) { setSelectedPieceId(null); setSelectedVersionId(null) }
  }

  function handleSelectVersion(pieceId, verId) {
    setSelectedPieceId(pieceId)
    setSelectedVersionId(verId)
  }

  const selectedPiece = pieces.find(p => p.id === selectedPieceId)

  return (
    <div className="tp-workspace">
      <div className="tp-toolbar">
        <span className="tp-title">Patterns</span>
        <AddPatternMenu onAdd={addPiece} />
      </div>

      <div className="tp-body">
        {pieces.length === 0 ? (
          <div className="pt-empty">
            <span className="pt-empty-icon">◫</span>
            <p>No pattern pieces yet</p>
            <p className="pt-empty-sub">Import a PDF, DXF, CLO3D, or image file to get started</p>
          </div>
        ) : (
          <div className="tp-grid">
            {pieces.map((piece, i) => (
              <PatternCard
                key={piece.id}
                piece={piece}
                pieceNum={i + 1}
                activeVersionId={piece.id === selectedPieceId ? selectedVersionId : null}
                onSelectVersion={handleSelectVersion}
                onClick={() => {
                  setSelectedPieceId(piece.id)
                  setSelectedVersionId(piece.versions[0]?.id ?? null)
                }}
              />
            ))}
          </div>
        )}
      </div>

      {selectedPiece && (
        <PatternDetailPanel
          piece={selectedPiece}
          pieceNum={pieces.indexOf(selectedPiece) + 1}
          activeVersionId={selectedVersionId}
          onActiveVersion={verId => setSelectedVersionId(verId)}
          onUpdate={p => updatePiece(selectedPiece.id, p)}
          onDelete={() => deletePiece(selectedPiece.id)}
          onClose={() => { setSelectedPieceId(null); setSelectedVersionId(null) }}
        />
      )}
    </div>
  )
}
