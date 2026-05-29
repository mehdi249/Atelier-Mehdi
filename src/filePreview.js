import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export function getFileCategory(file) {
  const name = (file.name || '').toLowerCase()
  const type = (file.type || '').toLowerCase()
  if (name.endsWith('.ai'))  return 'ai'
  if (name.endsWith('.svg') || type === 'image/svg+xml') return 'svg'
  if (name.endsWith('.pdf') || type === 'application/pdf') return 'pdf'
  if (type.startsWith('image/')) return 'image'
  return 'unknown'
}

export function getFileBadgeLabel(fileCategory) {
  return { ai: 'AI', svg: 'SVG', pdf: 'PDF', image: '', unknown: '?' }[fileCategory] ?? ''
}

// Render an AI or PDF file → compressed JPEG data URL (first page / artboard)
async function renderPdfLike(file, maxPx = 1400) {
  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise
  const page = await pdf.getPage(1)
  const baseVp = page.getViewport({ scale: 1 })
  const scale = Math.min(maxPx / baseVp.width, maxPx / baseVp.height, 2)
  const vp = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width  = Math.round(vp.width)
  canvas.height = Math.round(vp.height)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  await page.render({ canvasContext: ctx, viewport: vp }).promise
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.88), pageCount: pdf.numPages }
}

// Render SVG text → raster JPEG via canvas
async function renderSvg(file, maxPx = 1400) {
  const text = await file.text()
  const blob = new Blob([text], { type: 'image/svg+xml;charset=utf-8' })
  const url  = URL.createObjectURL(blob)

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const w = img.naturalWidth  || 800
      const h = img.naturalHeight || 600
      const scale = Math.min(1, maxPx / w, maxPx / h)
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(w * scale)
      canvas.height = Math.round(h * scale)
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.88), pageCount: 1 })
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG render failed')) }
    img.src = url
  })
}

// Main entry: accepts any supported file, returns { dataUrl, pageCount, fileCategory }
// Returns null for unknown/unsupported types.
export async function renderFilePreview(file) {
  const cat = getFileCategory(file)
  try {
    if (cat === 'image') return null          // caller uses compressImage
    if (cat === 'ai' || cat === 'pdf') {
      const { dataUrl, pageCount } = await renderPdfLike(file)
      return { dataUrl, pageCount, fileCategory: cat }
    }
    if (cat === 'svg') {
      const { dataUrl, pageCount } = await renderSvg(file)
      return { dataUrl, pageCount, fileCategory: cat }
    }
  } catch (err) {
    console.warn(`[filePreview] failed to render ${file.name}:`, err)
  }
  return null
}
