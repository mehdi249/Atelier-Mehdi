import { useState } from 'react'
import ImageUpload from '../ImageUpload'
import { generateId } from '../../utils'

export default function Research({ data, onChange }) {
  const [newUrl, setNewUrl] = useState('')

  function addUrl() {
    const url = newUrl.trim()
    if (!url) return
    onChange({ ...data, urls: [...data.urls, { id: generateId(), url }] })
    setNewUrl('')
  }

  function addImage(src) {
    onChange({ ...data, images: [...data.images, { id: generateId(), src, caption: '' }] })
  }

  function updateCaption(id, caption) {
    onChange({ ...data, images: data.images.map(i => i.id === id ? { ...i, caption } : i) })
  }

  return (
    <div className="stage-panel">
      <section className="stage-section">
        <h3 className="section-title">Narrative</h3>
        <textarea
          className="textarea"
          value={data.narrative}
          onChange={e => onChange({ ...data, narrative: e.target.value })}
          placeholder="Describe the concept, mood, starting point…"
          rows={9}
        />
      </section>

      <section className="stage-section">
        <h3 className="section-title">Reference URLs</h3>
        <div className="url-add">
          <input
            className="input"
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            placeholder="https://…"
            onKeyDown={e => e.key === 'Enter' && addUrl()}
          />
          <button className="btn-primary" onClick={addUrl}>Add</button>
        </div>
        {data.urls.length > 0 && (
          <ul className="url-list">
            {data.urls.map(u => (
              <li key={u.id} className="url-item">
                <a href={u.url} target="_blank" rel="noopener noreferrer">{u.url}</a>
                <button
                  className="btn-remove"
                  onClick={() => onChange({ ...data, urls: data.urls.filter(x => x.id !== u.id) })}
                >×</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="stage-section">
        <h3 className="section-title">Reference Images</h3>
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
