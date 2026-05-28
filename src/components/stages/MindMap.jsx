import { useState, useRef, useEffect, useCallback } from 'react'
import { generateId, compressImage } from '../../utils'

const CANVAS_W = 1800
const CANVAS_H = 1100

const NODE_DIMS = {
  root:   { w: 150, h: 52 },
  branch: { w: 140, h: 44 },
  leaf:   { w: 130, h: 38 },
  image:  { w: 150, h: 110 },
}
function nd(node) { return NODE_DIMS[node.type] || NODE_DIMS.leaf }

function getTypeForNew(nodes) {
  if (nodes.length === 0) return 'root'
  if (nodes.filter(n => n.type !== 'root').length < 4) return 'branch'
  return 'leaf'
}

export default function MindMap({ data, onChange }) {
  const { nodes, edges } = data

  const [zoom, setZoom]           = useState(0.72)
  const [dragState, setDragState] = useState(null)
  const [editing, setEditing]     = useState(null)
  const [editText, setEditText]   = useState('')
  const [connectFrom, setConnectFrom] = useState(null)
  const [selected, setSelected]   = useState(null)

  const canvasRef    = useRef(null)
  const viewportRef  = useRef(null)
  const dragOffRef   = useRef({ x: 0, y: 0 })
  const dataRef      = useRef(data)
  const zoomRef      = useRef(zoom)
  const selectedRef  = useRef(null)
  // touch pinch state
  const pinchRef     = useRef(null)

  useEffect(() => { dataRef.current = data },       [data])
  useEffect(() => { zoomRef.current = zoom },       [zoom])
  useEffect(() => { selectedRef.current = selected }, [selected])

  // ── Ctrl+Scroll to zoom ──────────────────────────────────────
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    function onWheel(e) {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const delta = e.deltaY < 0 ? 0.08 : -0.08
      setZoom(z => +Math.max(0.25, Math.min(2.5, z + delta)).toFixed(2))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // ── Pinch-to-zoom (touch) ────────────────────────────────────
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return

    function dist(a, b) {
      const dx = a.clientX - b.clientX, dy = a.clientY - b.clientY
      return Math.sqrt(dx * dx + dy * dy)
    }

    function onTouchStart(e) {
      if (e.touches.length === 2) {
        e.preventDefault()
        pinchRef.current = { d: dist(e.touches[0], e.touches[1]), z: zoomRef.current }
      }
    }

    function onTouchMove(e) {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault()
        const d = dist(e.touches[0], e.touches[1])
        const scale = d / pinchRef.current.d
        const newZ = +Math.max(0.25, Math.min(2.5, pinchRef.current.z * scale)).toFixed(2)
        setZoom(newZ)
      }
    }

    function onTouchEnd(e) {
      if (e.touches.length < 2) pinchRef.current = null
    }

    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove',  onTouchMove,  { passive: false })
    el.addEventListener('touchend',   onTouchEnd,   { passive: false })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove',  onTouchMove)
      el.removeEventListener('touchend',   onTouchEnd)
    }
  }, [])

  // ── Keyboard: Delete / Escape ────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        setConnectFrom(null)
        setSelected(null)
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const tag = document.activeElement?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        const sel = selectedRef.current
        if (!sel) return
        if (sel.startsWith('node-')) removeNode(sel.slice(5))
        else if (sel.startsWith('edge-')) removeEdge(sel.slice(5))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── Node / edge removal ──────────────────────────────────────
  function removeNode(nodeId) {
    onChange({
      ...dataRef.current,
      nodes: dataRef.current.nodes.filter(n => n.id !== nodeId),
      edges: dataRef.current.edges.filter(e => e.from !== nodeId && e.to !== nodeId),
    })
    setSelected(null)
    setConnectFrom(null)
  }

  function removeEdge(edgeId) {
    onChange({ ...dataRef.current, edges: dataRef.current.edges.filter(e => e.id !== edgeId) })
    setSelected(null)
  }

  // ── Canvas coordinate conversion ─────────────────────────────
  function toCanvas(clientX, clientY) {
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: (clientX - rect.left) / zoomRef.current,
      y: (clientY - rect.top)  / zoomRef.current,
    }
  }

  // ── Add node ─────────────────────────────────────────────────
  function addNode() {
    const type = getTypeForNew(dataRef.current.nodes)
    const { w, h } = NODE_DIMS[type]
    const id = generateId()
    const cx = CANVAS_W / 2, cy = CANVAS_H / 2
    onChange({
      ...dataRef.current,
      nodes: [...dataRef.current.nodes, {
        id, type,
        x: cx - w / 2 + (Math.random() - 0.5) * 200,
        y: cy - h / 2 + (Math.random() - 0.5) * 200,
        text: 'New Node',
      }],
    })
  }

  // ── Image import ──────────────────────────────────────────────
  async function handleImageImport(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    const src = await compressImage(file)
    const id = generateId()
    onChange({
      ...dataRef.current,
      nodes: [...dataRef.current.nodes, {
        id, src, type: 'image',
        x: CANVAS_W / 2 - 75 + (Math.random() - 0.5) * 300,
        y: CANVAS_H / 2 - 55 + (Math.random() - 0.5) * 200,
        text: file.name.replace(/\.[^.]+$/, ''),
      }],
    })
  }

  // ── Fit view ─────────────────────────────────────────────────
  function fitView() {
    const n = dataRef.current.nodes
    if (n.length === 0) { setZoom(0.72); return }
    const pad = 80
    const minX = Math.min(...n.map(nd => nd.x)) - pad
    const minY = Math.min(...n.map(nd => nd.y)) - pad
    const maxX = Math.max(...n.map(node => node.x + (NODE_DIMS[node.type] || NODE_DIMS.leaf).w)) + pad
    const maxY = Math.max(...n.map(node => node.y + (NODE_DIMS[node.type] || NODE_DIMS.leaf).h)) + pad
    const vW = viewportRef.current?.clientWidth  || 900
    const vH = viewportRef.current?.clientHeight || 600
    const newZoom = Math.min(vW / (maxX - minX), vH / (maxY - minY), 1.5)
    setZoom(+Math.max(0.25, Math.min(2.5, newZoom)).toFixed(2))
  }

  // ── Connect from node handle ──────────────────────────────────
  function startConnect(e, nodeId) {
    e.stopPropagation()
    e.preventDefault()
    setConnectFrom(nodeId)
    setSelected(`node-${nodeId}`)
  }

  function completeConnect(targetId) {
    if (!connectFrom || connectFrom === targetId) { setConnectFrom(null); return }
    const exists = dataRef.current.edges.some(
      ed => (ed.from === connectFrom && ed.to === targetId) ||
            (ed.from === targetId && ed.to === connectFrom)
    )
    if (!exists) {
      onChange({
        ...dataRef.current,
        edges: [...dataRef.current.edges, { id: generateId(), from: connectFrom, to: targetId }],
      })
    }
    setConnectFrom(null)
  }

  // ── Pointer handlers ─────────────────────────────────────────
  function handleNodePointerDown(e, nodeId) {
    if (e.detail >= 2) return
    e.stopPropagation()

    // If we're in connect mode (from handle click), complete the connection
    if (connectFrom) {
      completeConnect(nodeId)
      return
    }

    const node = dataRef.current.nodes.find(n => n.id === nodeId)
    const pos = toCanvas(e.clientX, e.clientY)
    dragOffRef.current = { x: pos.x - node.x, y: pos.y - node.y }
    setDragState({ id: nodeId, x: node.x, y: node.y })
    setSelected(`node-${nodeId}`)
  }

  function handlePointerMove(e) {
    if (!dragState) return
    // Ignore if multi-touch (pinch in progress)
    if (pinchRef.current) return
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const { x, y } = toCanvas(clientX, clientY)
    const { w, h } = nd(dataRef.current.nodes.find(n => n.id === dragState.id) || { type: 'leaf' })
    setDragState(s => ({
      ...s,
      x: Math.max(0, Math.min(CANVAS_W - w, x - dragOffRef.current.x)),
      y: Math.max(0, Math.min(CANVAS_H - h, y - dragOffRef.current.y)),
    }))
  }

  function handlePointerUp() {
    if (!dragState) return
    onChange({
      ...dataRef.current,
      nodes: dataRef.current.nodes.map(n =>
        n.id === dragState.id ? { ...n, x: dragState.x, y: dragState.y } : n
      ),
    })
    setDragState(null)
  }

  function handleNodeDblClick(e, node) {
    e.stopPropagation()
    if (connectFrom) return
    setEditing(node.id)
    setEditText(node.text)
  }

  function commitEdit(nodeId) {
    onChange({
      ...dataRef.current,
      nodes: dataRef.current.nodes.map(n =>
        n.id === nodeId ? { ...n, text: editText.trim() || n.text } : n
      ),
    })
    setEditing(null)
  }

  function handleCanvasClick() {
    if (connectFrom) { setConnectFrom(null); return }
    setSelected(null)
  }

  // ── Helpers ──────────────────────────────────────────────────
  function getPos(node) {
    if (dragState?.id === node.id) return { x: dragState.x, y: dragState.y }
    return { x: node.x, y: node.y }
  }

  function center(node) {
    const pos = getPos(node)
    const { w, h } = nd(node)
    return { x: pos.x + w / 2, y: pos.y + h / 2 }
  }

  function bezier(a, b) {
    const mx = (a.x + b.x) / 2
    return `M ${a.x} ${a.y} C ${mx} ${a.y} ${mx} ${b.y} ${b.x} ${b.y}`
  }

  const isConnecting = !!connectFrom

  return (
    <div className="mm-wrapper">
      {/* ── Toolbar ── */}
      <div className="mm-toolbar">
        <div className="mm-group">
          <button className="mm-btn" onClick={addNode} title="Add Node">+</button>
          <label className="mm-btn mm-file-btn" title="Import image">
            ⊞
            <input type="file" accept="image/*" onChange={handleImageImport} style={{ display: 'none' }} />
          </label>
        </div>

        <div className="mm-sep" />

        <div className="mm-group">
          <button className="mm-btn" onClick={() => setZoom(z => +Math.max(0.25, z - 0.12).toFixed(2))} title="Zoom Out">−</button>
          <span className="mm-zoom">{Math.round(zoom * 100)}%</span>
          <button className="mm-btn" onClick={() => setZoom(z => +Math.min(2.5, z + 0.12).toFixed(2))} title="Zoom In">+</button>
          <button className="mm-btn" onClick={fitView} title="Fit all nodes in view">⊡</button>
        </div>

        {isConnecting && (
          <>
            <div className="mm-sep" />
            <span className="mm-connect-status">
              Click a node to connect — Esc to cancel
            </span>
            <button className="mm-btn" onClick={() => setConnectFrom(null)} title="Cancel connect">✕</button>
          </>
        )}

        <span className="mm-hint-text">Ctrl+Scroll or pinch · Double-click to edit · Delete removes selection</span>
      </div>

      {/* ── Viewport ── */}
      <div className="mm-viewport" ref={viewportRef}>
        <div className="mm-scroll-bg" style={{
          width: Math.max(CANVAS_W * zoom, viewportRef.current?.clientWidth  || 0),
          height: Math.max(CANVAS_H * zoom, viewportRef.current?.clientHeight || 0),
          minWidth: '100%',
          minHeight: '100%',
          position: 'relative',
          flexShrink: 0,
        }}>
          <div
            className="mm-canvas"
            ref={canvasRef}
            style={{ transform: `scale(${zoom})`, transformOrigin: '0 0', cursor: isConnecting ? 'crosshair' : 'default' }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onClick={handleCanvasClick}
          >
            {/* SVG edges */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
              {edges.map(edge => {
                const fn = nodes.find(n => n.id === edge.from)
                const tn = nodes.find(n => n.id === edge.to)
                if (!fn || !tn) return null
                const fc = center(fn), tc = center(tn)
                const isSel = selected === `edge-${edge.id}`
                return (
                  <path
                    key={edge.id}
                    d={bezier(fc, tc)}
                    className={`mm-edge${isSel ? ' selected' : ''}`}
                    style={{ pointerEvents: 'stroke' }}
                    onClick={e => {
                      e.stopPropagation()
                      setSelected(s => s === `edge-${edge.id}` ? null : `edge-${edge.id}`)
                    }}
                  />
                )
              })}
            </svg>

            {/* Nodes */}
            {nodes.map(node => {
              const pos = getPos(node)
              const { w, h } = nd(node)
              const isSel = selected === `node-${node.id}`
              const isSrc = connectFrom === node.id
              return (
                <div key={node.id} style={{ position: 'absolute', left: pos.x, top: pos.y }}>
                  <div
                    className={`mm-node type-${node.type}${isSel ? ' sel' : ''}${isSrc ? ' src' : ''}`}
                    style={{ width: w, height: h }}
                    onPointerDown={e => handleNodePointerDown(e, node.id)}
                    onDoubleClick={e => handleNodeDblClick(e, node)}
                  >
                    {node.type === 'image' ? (
                      <img
                        src={node.src}
                        alt={node.text}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, pointerEvents: 'none' }}
                      />
                    ) : editing === node.id ? (
                      <input
                        className="mm-node-input"
                        value={editText}
                        autoFocus
                        onChange={e => setEditText(e.target.value)}
                        onBlur={() => commitEdit(node.id)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitEdit(node.id)
                          if (e.key === 'Escape') setEditing(null)
                          e.stopPropagation()
                        }}
                        onPointerDown={e => e.stopPropagation()}
                      />
                    ) : (
                      <span className="mm-node-text">{node.text}</span>
                    )}
                  </div>

                  {/* × delete chip — shown when selected */}
                  {isSel && !isConnecting && (
                    <button
                      className="mm-node-delete"
                      onPointerDown={e => { e.stopPropagation(); removeNode(node.id) }}
                      title="Delete node"
                    >×</button>
                  )}

                  {/* ⊕ connect handle — shown when selected */}
                  {isSel && !isConnecting && node.type !== 'image' && (
                    <button
                      className="mm-node-connect"
                      onPointerDown={e => startConnect(e, node.id)}
                      title="Connect to another node"
                    >⊕</button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
