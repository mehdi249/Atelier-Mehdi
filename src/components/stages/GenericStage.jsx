import ImageUpload from '../ImageUpload'
import { generateId } from '../../utils'

export default function GenericStage({ title, data, onChange }) {
  function addImage(src) {
    onChange({ ...data, images: [...data.images, { id: generateId(), src, caption: '' }] })
  }

  function updateCaption(id, caption) {
    onChange({ ...data, images: data.images.map(i => i.id === id ? { ...i, caption } : i) })
  }

  return (
    <div className="stage-panel">
      <section className="stage-section">
        <h3 className="section-title">Notes</h3>
        <textarea
          className="textarea"
          value={data.notes}
          onChange={e => onChange({ ...data, notes: e.target.value })}
          placeholder={`${title} notes…`}
          rows={9}
        />
      </section>

      <section className="stage-section">
        <h3 className="section-title">Files & Images</h3>
        <ImageUpload onAdd={addImage} />
        {data.images.length > 0 && (
          <div className="image-grid">
            {data.images.map(img => (
              <div key={img.id} className="image-item">
                <img src={img.src} alt={img.caption} className="image-thumb" />
                <button
                  className="btn-remove-img"
                  onClick={() => onChange({ ...data, images: data.images.filter(i => i.id !== img.id) })}
                >×</button>
                <input
                  className="input input-caption"
                  value={img.caption}
                  onChange={e => updateCaption(img.id, e.target.value)}
                  placeholder="Caption…"
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
