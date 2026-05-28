import { useState } from 'react'
import ImageUpload from '../ImageUpload'
import { generateId } from '../../utils'

function emptyLayer() {
  return { fabric: '', weight: '', supplier: '', notes: '' }
}

function createPiece() {
  return {
    id: generateId(),
    name: 'New Piece',
    description: '',
    fabricLayers: {
      shell: emptyLayer(),
      lining: null,
      insulation: null,
    },
    constructionNotes: '',
    images: [],
  }
}

function FabricLayer({ label, data, onChange, onRemove, removable }) {
  if (!data) {
    return (
      <button className="btn-ghost-sm" style={{ marginBottom: 8 }} onClick={() => onChange(emptyLayer())}>
        + Add {label}
      </button>
    )
  }
  return (
    <div className="fabric-layer">
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
  )
}

function PieceCard({ piece, onUpdate, onDelete }) {
  const [open, setOpen] = useState(true)

  function updateLayer(key, val) {
    onUpdate({ ...piece, fabricLayers: { ...piece.fabricLayers, [key]: val } })
  }

  function addImage(src) {
    onUpdate({ ...piece, images: [...piece.images, { id: generateId(), src, caption: '' }] })
  }

  return (
    <div className="piece-card">
      <div className="piece-header">
        <input
          className="piece-name-input"
          value={piece.name}
          onChange={e => onUpdate({ ...piece, name: e.target.value })}
          placeholder="Piece Name"
        />
        <button className="btn-icon" onClick={() => setOpen(o => !o)} title={open ? 'Collapse' : 'Expand'}>
          {open ? '▲' : '▼'}
        </button>
        <button className="btn-icon danger" onClick={onDelete} title="Delete piece">×</button>
      </div>

      {open && (
        <div className="piece-body">
          <div className="piece-section">
            <label className="label-sm">Description</label>
            <textarea
              className="textarea textarea-sm"
              value={piece.description}
              onChange={e => onUpdate({ ...piece, description: e.target.value })}
              placeholder="Brief description of this piece…"
              rows={2}
            />
          </div>

          <div className="piece-section">
            <label className="label-sm">Fabric Layers</label>
            <FabricLayer
              label="Shell"
              data={piece.fabricLayers.shell}
              onChange={v => updateLayer('shell', v)}
              onRemove={() => updateLayer('shell', null)}
              removable={false}
            />
            <FabricLayer
              label="Lining"
              data={piece.fabricLayers.lining}
              onChange={v => updateLayer('lining', v)}
              onRemove={() => updateLayer('lining', null)}
              removable={true}
            />
            <FabricLayer
              label="Insulation"
              data={piece.fabricLayers.insulation}
              onChange={v => updateLayer('insulation', v)}
              onRemove={() => updateLayer('insulation', null)}
              removable={true}
            />
          </div>

          <div className="piece-section">
            <label className="label-sm">Construction Notes</label>
            <textarea
              className="textarea textarea-sm"
              value={piece.constructionNotes}
              onChange={e => onUpdate({ ...piece, constructionNotes: e.target.value })}
              placeholder="Construction details, techniques, finishing…"
              rows={3}
            />
          </div>

          <div className="piece-section">
            <label className="label-sm">Images</label>
            <ImageUpload onAdd={addImage} compact />
            {piece.images.length > 0 && (
              <div className="image-grid image-grid-sm">
                {piece.images.map(img => (
                  <div key={img.id} className="image-item">
                    <img src={img.src} alt="" className="image-thumb" />
                    <button
                      className="btn-remove-img"
                      onClick={() => onUpdate({ ...piece, images: piece.images.filter(i => i.id !== img.id) })}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function StyleCards({ data, onChange }) {
  function addPiece() {
    onChange({ ...data, pieces: [...data.pieces, createPiece()] })
  }

  function updatePiece(id, updated) {
    onChange({ ...data, pieces: data.pieces.map(p => p.id === id ? updated : p) })
  }

  function deletePiece(id) {
    onChange({ ...data, pieces: data.pieces.filter(p => p.id !== id) })
  }

  return (
    <div className="stage-panel">
      <div className="stage-section-header">
        <h3 className="section-title" style={{ marginBottom: 0 }}>Style Cards</h3>
        <button className="btn-primary" onClick={addPiece}>+ Add Piece</button>
      </div>

      <textarea
        className="textarea"
        style={{ marginTop: 16, marginBottom: 28 }}
        value={data.notes}
        onChange={e => onChange({ ...data, notes: e.target.value })}
        placeholder="Collection style notes, overall direction…"
        rows={3}
      />

      <div className="pieces-list">
        {data.pieces.map(piece => (
          <PieceCard
            key={piece.id}
            piece={piece}
            onUpdate={updated => updatePiece(piece.id, updated)}
            onDelete={() => deletePiece(piece.id)}
          />
        ))}
      </div>

      {data.pieces.length === 0 && (
        <div className="empty-state-sm">No pieces yet — click + Add Piece to start.</div>
      )}
    </div>
  )
}
