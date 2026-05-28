export function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

export function compressImage(file) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 1200
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round((height / width) * MAX); width = MAX }
        else { width = Math.round((width / height) * MAX); height = MAX }
      }
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.78))
    }
    img.src = url
  })
}

export function calculateProgress(collection) {
  if (collection.progressOverride !== null && collection.progressOverride !== undefined) {
    return collection.progressOverride
  }
  const s = collection.stages
  const checks = [
    s.mindMap.nodes.length > 1,
    s.research.narrative.trim().length > 20 || s.research.images.length > 0,
    s.sketches.images.length > 0 || s.sketches.notes.trim().length > 20,
    s.styleCards.pieces.length > 0,
    s.patterns.images.length > 0 || s.patterns.notes.trim().length > 20,
    s.clo3d.images.length > 0 || s.clo3d.notes.trim().length > 20,
    s.construction.notes.trim().length > 20 || s.construction.images.length > 0,
    s.lookbook.images.length > 0,
  ]
  return Math.round((checks.filter(Boolean).length / 8) * 100)
}

export function currentStageLabel(collection) {
  const labels = ['Mind Map', 'Research', 'Sketches', 'Style Cards', 'Patterns', 'CLO3D', 'Construction', 'Lookbook']
  const s = collection.stages
  const checks = [
    s.mindMap.nodes.length > 1,
    s.research.narrative.trim().length > 20 || s.research.images.length > 0,
    s.sketches.images.length > 0 || s.sketches.notes.trim().length > 20,
    s.styleCards.pieces.length > 0,
    s.patterns.images.length > 0 || s.patterns.notes.trim().length > 20,
    s.clo3d.images.length > 0 || s.clo3d.notes.trim().length > 20,
    s.construction.notes.trim().length > 20 || s.construction.images.length > 0,
    s.lookbook.images.length > 0,
  ]
  const idx = checks.findIndex(c => !c)
  return idx === -1 ? 'Complete' : labels[idx]
}

export function exportCollectionJSON(collection) {
  const blob = new Blob([JSON.stringify(collection, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${collection.name.toLowerCase().replace(/\s+/g, '-')}-atelier.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
