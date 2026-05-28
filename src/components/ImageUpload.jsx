import { useRef, useState } from 'react'
import { compressImage } from '../utils'

export default function ImageUpload({ onAdd, compact = false }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  async function handleFiles(files) {
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      try {
        const src = await compressImage(file)
        onAdd(src)
      } catch (e) {
        console.error('Failed to compress image:', e)
      }
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div
      className={`image-upload-zone${compact ? ' compact' : ''}${dragging ? ' dragging' : ''}`}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={e => { handleFiles(e.target.files); e.target.value = '' }}
      />
      <span>{compact ? '+ Add Images' : 'Drop images here or click to upload'}</span>
    </div>
  )
}
