import DxfParser from 'dxf-parser'

export function dxfToSvg(text) {
  const parser = new DxfParser()
  let dxf
  try {
    dxf = parser.parseSync(text)
  } catch (e) {
    console.error('DXF parse error:', e)
    return null
  }

  const entities = dxf?.entities ?? []
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  function expandBounds(x, y) {
    if (!isFinite(x) || !isFinite(y)) return
    if (x < minX) minX = x; if (x > maxX) maxX = x
    if (y < minY) minY = y; if (y > maxY) maxY = y
  }

  for (const e of entities) {
    switch (e.type) {
      case 'LWPOLYLINE':
      case 'POLYLINE':
        for (const v of e.vertices ?? []) expandBounds(v.x, v.y)
        break
      case 'LINE':
        expandBounds(e.start?.x, e.start?.y)
        expandBounds(e.end?.x, e.end?.y)
        break
      case 'ARC':
      case 'CIRCLE': {
        const cx = e.center?.x ?? 0, cy = e.center?.y ?? 0, r = e.radius ?? 0
        expandBounds(cx - r, cy - r); expandBounds(cx + r, cy + r)
        break
      }
      case 'SPLINE':
        for (const cp of e.controlPoints ?? []) expandBounds(cp.x, cp.y)
        break
      case 'TEXT':
      case 'MTEXT':
        expandBounds(e.startPoint?.x ?? e.position?.x, e.startPoint?.y ?? e.position?.y)
        break
    }
  }

  if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 200; maxY = 200 }

  const pad = 12
  const W = maxX - minX + pad * 2
  const H = maxY - minY + pad * 2

  function tx(x) { return x - minX + pad }
  function ty(y) { return H - (y - minY + pad) } // flip Y-axis

  const svgEls = []

  for (const e of entities) {
    const lineColor = '#c9a96e'
    const textColor = 'rgba(255,255,255,0.45)'

    switch (e.type) {
      case 'LWPOLYLINE':
      case 'POLYLINE': {
        const verts = e.vertices ?? []
        if (verts.length < 2) break
        let d = `M ${tx(verts[0].x).toFixed(2)} ${ty(verts[0].y).toFixed(2)}`
        for (let i = 1; i < verts.length; i++) {
          d += ` L ${tx(verts[i].x).toFixed(2)} ${ty(verts[i].y).toFixed(2)}`
        }
        if (e.shape) d += ' Z'
        svgEls.push(`<path d="${d}" stroke="${lineColor}" stroke-width="0.8" fill="none" stroke-linejoin="round"/>`)
        break
      }
      case 'LINE':
        svgEls.push(
          `<line x1="${tx(e.start?.x??0).toFixed(2)}" y1="${ty(e.start?.y??0).toFixed(2)}" ` +
          `x2="${tx(e.end?.x??0).toFixed(2)}" y2="${ty(e.end?.y??0).toFixed(2)}" ` +
          `stroke="${lineColor}" stroke-width="0.8"/>`
        )
        break
      case 'ARC': {
        const cx = tx(e.center?.x ?? 0), cy = ty(e.center?.y ?? 0), r = e.radius ?? 0
        const sa = (e.startAngle ?? 0) * Math.PI / 180
        const ea = (e.endAngle ?? 0) * Math.PI / 180
        const x1 = cx + r * Math.cos(sa), y1 = cy - r * Math.sin(sa)
        const x2 = cx + r * Math.cos(ea), y2 = cy - r * Math.sin(ea)
        let span = (e.endAngle ?? 0) - (e.startAngle ?? 0)
        if (span < 0) span += 360
        const large = span > 180 ? 1 : 0
        svgEls.push(
          `<path d="M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 ${large} 0 ${x2.toFixed(2)} ${y2.toFixed(2)}" ` +
          `stroke="${lineColor}" stroke-width="0.8" fill="none"/>`
        )
        break
      }
      case 'CIRCLE': {
        const cx = tx(e.center?.x ?? 0), cy = ty(e.center?.y ?? 0)
        svgEls.push(`<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${(e.radius??1).toFixed(2)}" stroke="${lineColor}" stroke-width="0.8" fill="none"/>`)
        break
      }
      case 'SPLINE': {
        const cps = e.controlPoints ?? []
        if (cps.length < 2) break
        let d = `M ${tx(cps[0].x).toFixed(2)} ${ty(cps[0].y).toFixed(2)}`
        for (let i = 1; i < cps.length; i++) {
          d += ` L ${tx(cps[i].x).toFixed(2)} ${ty(cps[i].y).toFixed(2)}`
        }
        svgEls.push(`<path d="${d}" stroke="${lineColor}" stroke-width="0.8" fill="none"/>`)
        break
      }
      case 'TEXT':
      case 'MTEXT': {
        const x = tx(e.startPoint?.x ?? e.position?.x ?? 0)
        const y = ty(e.startPoint?.y ?? e.position?.y ?? 0)
        const txt = String(e.text ?? '').replace(/[<>&"]/g, c =>
          ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c])
        )
        svgEls.push(`<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" font-size="4" fill="${textColor}" font-family="monospace">${txt}</text>`)
        break
      }
    }
  }

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W.toFixed(2)} ${H.toFixed(2)}">`,
    `<rect width="${W.toFixed(2)}" height="${H.toFixed(2)}" fill="#111113"/>`,
    ...svgEls,
    '</svg>',
  ].join('\n')

  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)))
}
