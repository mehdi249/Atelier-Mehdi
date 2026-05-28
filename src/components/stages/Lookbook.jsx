import ImageUpload from '../ImageUpload'
import { generateId } from '../../utils'

export default function Lookbook({ data, onChange }) {
  function addImage(src) {
    onChange({ ...data, images: [...data.images, { id: generateId(), src, caption: '' }] })
  }

  function updateCaption(id, caption) {
    onChange({ ...data, images: data.images.map(i => i.id === id ? { ...i, caption } : i) })
  }

  return (
    <div className="stage-panel">
      <section className="stage-section">
        <h3 className="section-title">Styling Notes</h3>
        <textarea
          className="textarea"
          value={data.notes}
          onChange={e => onChange({ ...data, notes: e.target.value })}
          placeholder="Lookbook concept, styling direction, shot list…"
          rows={4}
        />
      </section>

      <section className="stage-section">
        <h3 className="section-title">Lookbook Images</h3>
        <ImageUpload onAdd={addImage} />
        {data.images.length > 0 && (
          <div className="lookbook-grid">
            {data.images.map(img => (
              <div key={img.id} className="lookbook-item">
                <img src={img.src} alt={img.caption} className="lookbook-img" />
                <div className="lookbook-overlay">
                  <input
                    className="input input-caption"
                    value={img.caption}
                    onChange={e => updateCaption(img.id, e.target.value)}
                    placeholder="Caption…"
                    onClick={e => e.stopPropagation()}
                  />
                </div>
                <button
                  className="btn-remove-img"
                  onClick={() => onChange({ ...data, images: data.images.filter(i => i.id !== img.id) })}
                >×</button>
              </div>
            ))}
          </div>
        )}
        {data.images.length === 0 && (
          <div className="empty-state-sm">Drop lookbook photos here to build your grid.</div>
        )}
      </section>
    </div>
  )
}
