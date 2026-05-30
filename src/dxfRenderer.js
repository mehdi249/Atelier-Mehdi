import DxfParser from 'dxf-parser'

// Entity types that contribute to the geometric bounding box (skip text)
const GEO_TYPES = new Set(['LWPOLYLINE','POLYLINE','LINE','ARC','CIRCLE','SPLINE','ELLIPSE'])

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
  // Only use geometric entities for bounds — ignore text/dimensions
  const geoEntities = entities.filter(e => GEO_TYPES.has(e.type))

  if (geoEntities.length === 0) return null

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  function expand(x, y) {
    if (!isFinite(x) || !isFinite(y)) return
    if (x < minX) minX = x; if (x > maxX) maxX = x
    if (y < minY) minY = y; if (y > maxY) maxY = y
  }

  for (const e of geoEntities) {
    switch (e.type) {
      case 'LWPOLYLINE':
      case 'POLYLINE':
        for (const v of e.vertices ?? []) expand(v.x, v.y)
        break
      case 'LINE':
        expand(e.start?.x, e.start?.y); expand(e.end?.x, e.end?.y)
        break
      case 'ARC':
      case 'CIRCLE': {
        const { x: cx = 0, y: cy = 0 } = e.center ?? {}
        const r = e.radius ?? 0
        expand(cx - r, cy - r); expand(cx + r, cy + r)
        break
      }
      case 'SPLINE':
        for (const cp of e.controlPoints ?? []) expand(cp.x, cp.y)
        break
      case 'ELLIPSE': {
        const { x: cx = 0, y: cy = 0 } = e.center ?? {}
        const rx = Math.hypot(e.majorAxisEndPoint?.x ?? 0, e.majorAxisEndPoint?.y ?? 0)
        const ry = rx * (e.axisRatio ?? 1)
        expand(cx - rx, cy - ry); expand(cx + rx, cy + ry)
        break
      }
    }
  }

  if (!isFinite(minX)) return null

  const span = Math.max(maxX - minX, maxY - minY, 1)
  // Adaptive stroke width: ~0.5% of the geometric span, clamped
  const sw = Math.max(0.3, Math.min(span * 0.005, 2)).toFixed(2)

  const pad = span * 0.04
  const W = maxX - minX + pad * 2
  const H = maxY - minY + pad * 2

  function tx(x) { return x - minX + pad }
  function ty(y) { return H - (y - minY + pad) } // flip Y-axis (DXF = Y-up)

  const els = []
  const LINE_COLOR   = '#c9a96e'
  const CLOSED_FILL  = 'rgba(201,169,110,0.06)'
  const GRAIN_COLOR  = 'rgba(255,255,255,0.35)'  // dashed internal lines

  for (const e of geoEntities) {
    // Distinguish outer seam lines (often on layer "CUT" or "OUTLINE") vs internal
    const layer = String(e.layer ?? '').toLowerCase()
    const isInternal = layer.includes('grain') || layer.includes('fold') ||
                       layer.includes('anno')  || layer.includes('mark')
    const stroke = isInternal ? GRAIN_COLOR : LINE_COLOR
    const dash   = isInternal ? ` stroke-dasharray="${(sw * 4).toFixed(1)},${(sw * 3).toFixed(1)}"` : ''

    switch (e.type) {
      case 'LWPOLYLINE':
      case 'POLYLINE': {
        const verts = e.vertices ?? []
        if (verts.length < 2) break
        let d = `M ${tx(verts[0].x).toFixed(2)} ${ty(verts[0].y).toFixed(2)}`
        for (let i = 1; i < verts.length; i++) {
          d += ` L ${tx(verts[i].x).toFixed(2)} ${ty(verts[i].y).toFixed(2)}`
        }
        const closed = e.shape || e.closed
        if (closed) d += ' Z'
        const fill = (closed && !isInternal) ? CLOSED_FILL : 'none'
        els.push(`<path d="${d}" stroke="${stroke}" stroke-width="${sw}" fill="${fill}" stroke-linejoin="round"${dash}/>`)
        break
      }
      case 'LINE':
        els.push(
          `<line x1="${tx(e.start?.x??0).toFixed(2)}" y1="${ty(e.start?.y??0).toFixed(2)}" ` +
          `x2="${tx(e.end?.x??0).toFixed(2)}" y2="${ty(e.end?.y??0).toFixed(2)}" ` +
          `stroke="${stroke}" stroke-width="${sw}"${dash}/>`
        )
        break
      case 'ARC': {
        const cx = tx(e.center?.x ?? 0), cy = ty(e.center?.y ?? 0)
        const r  = e.radius ?? 0
        const sa = (e.startAngle ?? 0) * Math.PI / 180
        const ea = (e.endAngle   ?? 0) * Math.PI / 180
        const x1 = cx + r * Math.cos(sa), y1 = cy - r * Math.sin(sa)
        const x2 = cx + r * Math.cos(ea), y2 = cy - r * Math.sin(ea)
        let span2 = (e.endAngle ?? 0) - (e.startAngle ?? 0)
        if (span2 < 0) span2 += 360
        const large = span2 > 180 ? 1 : 0
        els.push(
          `<path d="M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 ${large} 0 ${x2.toFixed(2)} ${y2.toFixed(2)}" ` +
          `stroke="${stroke}" stroke-width="${sw}" fill="none"${dash}/>`
        )
        break
      }
      case 'CIRCLE': {
        const cx = tx(e.center?.x ?? 0), cy = ty(e.center?.y ?? 0)
        els.push(
          `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${(e.radius??1).toFixed(2)}" ` +
          `stroke="${stroke}" stroke-width="${sw}" fill="none"${dash}/>`
        )
        break
      }
      case 'SPLINE': {
        const cps = e.controlPoints ?? []
        if (cps.length < 2) break
        // Approximate spline as a smooth cubic bezier through control points
        let d = `M ${tx(cps[0].x).toFixed(2)} ${ty(cps[0].y).toFixed(2)}`
        if (cps.length === 2) {
          d += ` L ${tx(cps[1].x).toFixed(2)} ${ty(cps[1].y).toFixed(2)}`
        } else {
          for (let i = 1; i < cps.length - 1; i++) {
            const mx = (cps[i].x + cps[i+1 < cps.length ? i+1 : i].x) / 2
            const my = (cps[i].y + cps[i+1 < cps.length ? i+1 : i].y) / 2
            d += ` Q ${tx(cps[i].x).toFixed(2)} ${ty(cps[i].y).toFixed(2)} ${tx(mx).toFixed(2)} ${ty(my).toFixed(2)}`
          }
          d += ` L ${tx(cps[cps.length-1].x).toFixed(2)} ${ty(cps[cps.length-1].y).toFixed(2)}`
        }
        els.push(`<path d="${d}" stroke="${stroke}" stroke-width="${sw}" fill="none"${dash}/>`)
        break
      }
      case 'ELLIPSE': {
        const { x: cx = 0, y: cy = 0 } = e.center ?? {}
        const rx = Math.hypot(e.majorAxisEndPoint?.x ?? 0, e.majorAxisEndPoint?.y ?? 0)
        const ry = rx * (e.axisRatio ?? 1)
        els.push(
          `<ellipse cx="${tx(cx).toFixed(2)}" cy="${ty(cy).toFixed(2)}" rx="${rx.toFixed(2)}" ry="${ry.toFixed(2)}" ` +
          `stroke="${stroke}" stroke-width="${sw}" fill="none"${dash}/>`
        )
        break
      }
    }
  }

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W.toFixed(2)} ${H.toFixed(2)}">`,
    `<rect width="${W.toFixed(2)}" height="${H.toFixed(2)}" fill="#0e0e10"/>`,
    ...els,
    '</svg>',
  ].join('\n')

  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)))
}
