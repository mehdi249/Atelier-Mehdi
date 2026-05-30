export function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload  = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

export function downloadFile(dataUrl, filename) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
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

export function exportMindMapSVG(nodes, edges, collectionName) {
  if (nodes.length === 0) return

  const dims = {
    root:   { w: 150, h: 52 },
    branch: { w: 140, h: 44 },
    leaf:   { w: 130, h: 38 },
    image:  { w: 150, h: 110 },
  }
  function d(node) { return dims[node.type] || dims.leaf }

  const pad = 70
  const minX = Math.min(...nodes.map(n => n.x)) - pad
  const minY = Math.min(...nodes.map(n => n.y)) - pad
  const maxX = Math.max(...nodes.map(n => n.x + d(n).w)) + pad
  const maxY = Math.max(...nodes.map(n => n.y + d(n).h)) + pad
  const W = maxX - minX
  const H = maxY - minY

  function ncx(node) { return node.x + d(node).w / 2 - minX }
  function ncy(node) { return node.y + d(node).h / 2 - minY }

  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    `<defs><pattern id="g" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="12" cy="12" r="0.8" fill="#2c2c2e"/></pattern></defs>`,
    `<rect width="${W}" height="${H}" fill="#090909"/>`,
    `<rect width="${W}" height="${H}" fill="url(#g)"/>`,
  ]

  // Bezier edges
  for (const edge of edges) {
    const fn = nodes.find(n => n.id === edge.from)
    const tn = nodes.find(n => n.id === edge.to)
    if (!fn || !tn) continue
    const fx = ncx(fn), fy = ncy(fn), tx = ncx(tn), ty = ncy(tn)
    const mx = (fx + tx) / 2
    parts.push(`<path d="M${fx},${fy} C${mx},${fy} ${mx},${ty} ${tx},${ty}" stroke="#38383a" stroke-width="1.5" fill="none" stroke-linecap="round"/>`)
  }

  // Nodes
  const fills   = { root: '#c9a96e', branch: '#2c2c2e', leaf: '#1c1c1e' }
  const strokes = { root: 'none',    branch: '#38383a', leaf: '#2c2c2e' }
  const textFg  = { root: '#000000', branch: '#f5f5f7', leaf: '#8e8e93' }
  const fweights = { root: 700, branch: 500, leaf: 400 }
  const fsizes   = { root: 14, branch: 13, leaf: 12 }

  for (const node of nodes) {
    if (node.type === 'image') continue
    const nd = d(node)
    const x = node.x - minX
    const y = node.y - minY
    const bg  = fills[node.type]   || fills.leaf
    const str = strokes[node.type] || strokes.leaf
    const tc  = textFg[node.type]  || textFg.leaf
    const fw  = fweights[node.type] || 400
    const fs  = fsizes[node.type]   || 12
    const esc = node.text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    parts.push(`<rect x="${x}" y="${y}" width="${nd.w}" height="${nd.h}" rx="10" fill="${bg}" stroke="${str}" stroke-width="1"/>`)
    parts.push(`<text x="${x + nd.w/2}" y="${y + nd.h/2 + fs*0.38}" fill="${tc}" font-family="Helvetica Neue,Arial,sans-serif" font-size="${fs}" font-weight="${fw}" text-anchor="middle">${esc}</text>`)
  }

  parts.push('</svg>')

  const blob = new Blob([parts.join('\n')], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${collectionName.toLowerCase().replace(/\s+/g, '-')}-mindmap.svg`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
