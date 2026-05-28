import { useState, useRef, useEffect } from 'react'
import { generateId, compressImage } from '../../utils'

const NODE_W = 130
const NODE_H = 44
const CANVAS_W = 1100
const CANVAS_H = 580

function getTypeForNew(nodes) {
  if (nodes.length === 0) return 'root'
  if (nodes.length < 5) return 'branch'
  return 'leaf'
}

export default function MindMap({ data, onChange }) {
  const { nodes, edges } = data
  const [dragState, setDragState] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editText, setEditText] = useState('')
  const [mode, setMode] = useState('default')
  const [connectFrom, setConnectFrom] = useState(null)
  const [selected, setSelected] = useState(null)
  const canvasRef = useRef(null)
  const dragOffRef = useRef({ x: 0, y: 0 })
  const dataRef = useRef(data)
  useEffect(() => { dataRef.current = data }, [data])

  function addNode() {
    const id = generateId()
    const type = getTypeForNew(nodes)
    onChange({
      ...data,
      nodes: [...nodes, {
        id,
        x: 80 + Math.random() * (CANVAS_W - NODE_W - 160),
        y: 80 + Math.random() * (CANVAS_H - NODE_H - 160),
        text: 'New Node',
        type,
      }]
    })
  }

  function deleteNode(nodeId) {
    onChange({
      ...dataRef.current,
      nodes: dataRef.current.nodes.filter(n => n.id !== nodeId),
      edges: dataRef.current.edges.filter(e => e.from !== nodeId && e.to !== nodeId),
    })
    if (selected === `node-${nodeId}`) setSelected(null)
  }

  function deleteEdge(edgeId) {
    onChange({ ...dataRef.current, edges: dataRef.current.edges.filter(e => e.id !== edgeId) })
    if (selected === `edge-${edgeId}`) setSelected(null)
  }

  function deleteSelected() {
    if (!selected) return
    if (selected.startsWith('node-')) deleteNode(selected.slice(5))
    else if (selected.startsWith('edge-')) deleteEdge(selected.slice(5))
  }

  function handleNodePointerDown(e, nodeId) {
    if (e.detail >= 2) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)

    if (mode === 'connect') {
      if (!connectFrom) {
        setConnectFrom(nodeId)
      } else if (connectFrom !== nodeId) {
        const exists = dataRef.current.edges.some(
          ed => (ed.from === connectFrom && ed.to === nodeId) || (ed.from === nodeId && ed.to === connectFrom)
        )
        if (!exists) {
          onChange({
            ...dataRef.current,
            edges: [...dataRef.current.edges, { id: generateId(), from: connectFrom, to: nodeId }],
          })
        }
        setConnectFrom(null)
      }
      return
    }

    if (mode === 'delete') {
      deleteNode(nodeId)
      return
    }

    const node = dataRef.current.nodes.find(n => n.id === nodeId)
    const rect = canvasRef.current.getBoundingClientRect()
    dragOffRef.current = { x: e.clientX - rect.left - node.x, y: e.clientY - rect.top - node.y }
    setDragState({ id: nodeId, x: node.x, y: node.y })
    setSelected(`node-${nodeId}`)
  }

  function handlePointerMove(e) {
    if (!dragState) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(CANVAS_W - NODE_W, e.clientX - rect.left - dragOffRef.current.x))
    const y = Math.max(0, Math.min(CANVAS_H - NODE_H, e.clientY - rect.top - dragOffRef.current.y))
    setDragState(s => ({ ...s, x, y }))
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
    if (mode !== 'default') return
    setEditing(node.id)
    setEditText(node.text)
  }

  function commitEdit(nodeId) {
    onChange({
      ...dataRef.current,
      nodes: dataRef.current.nodes.map(n => n.id === nodeId ? { ...n, text: editText.trim() || n.text } : n),
    })
    setEditing(null)
  }

  function getNodePos(node) {
    if (dragState?.id === node.id) return { x: dragState.x, y: dragState.y }
    return { x: node.x, y: node.y }
  }

  function nodeCenter(node) {
    const pos = getNodePos(node)
    return { x: pos.x + NODE_W / 2, y: pos.y + NODE_H / 2 }
  }

  async function handleImageImport(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    const src = await compressImage(file)
    const id = generateId()
    onChange({
      ...dataRef.current,
      nodes: [...dataRef.current.nodes, {
        id, src,
        x: 80 + Math.random() * 300,
        y: 80 + Math.random() * 200,
        text: file.name.replace(/\.[^.]+$/, ''),
        type: 'image',
      }],
    })
  }

  const cursor = mode === 'connect' ? 'crosshair' : mode === 'delete' ? 'not-allowed' : 'default'

  return (
    <div className="mindmap-wrapper">
      <div className="mindmap-toolbar">
        <button className={`btn-ghost-sm${mode === 'default' ? ' active' : ''}`} onClick={() => { setMode('default'); setConnectFrom(null) }}>
          Select
        </button>
        <button className="btn-ghost-sm" onClick={addNode}>+ Node</button>
        <button
          className={`btn-ghost-sm${mode === 'connect' ? ' active' : ''}`}
          onClick={() => { setMode(m => m === 'connect' ? 'default' : 'connect'); setConnectFrom(null) }}
        >
          {mode === 'connect' ? (connectFrom ? 'Pick target…' : 'Connect: pick source') : 'Connect'}
        </button>
        <button
          className={`btn-ghost-sm${mode === 'delete' ? ' active' : ''}`}
          onClick={() => setMode(m => m === 'delete' ? 'default' : 'delete')}
        >
          Delete Mode
        </button>
        <label className="btn-ghost-sm file-label">
          Import Image
          <input type="file" accept="image/*" onChange={handleImageImport} style={{ display: 'none' }} />
        </label>
        {selected && mode === 'default' && (
          <button className="btn-ghost-sm danger" onClick={deleteSelected}>Remove Selected</button>
        )}
      </div>

      <div className="mindmap-outer">
        <div
          className="mindmap-canvas-wrap"
          ref={canvasRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{ cursor }}
          onClick={() => { if (mode === 'connect' && !connectFrom) return; setSelected(null) }}
        >
          <svg className="mindmap-svg">
            {edges.map(edge => {
              const fromNode = nodes.find(n => n.id === edge.from)
              const toNode = nodes.find(n => n.id === edge.to)
              if (!fromNode || !toNode) return null
              const from = nodeCenter(fromNode)
              const to = nodeCenter(toNode)
              const isSelected = selected === `edge-${edge.id}`
              return (
                <line
                  key={edge.id}
                  x1={from.x} y1={from.y}
                  x2={to.x} y2={to.y}
                  className={`mindmap-edge${isSelected ? ' selected' : ''}`}
                  style={{ pointerEvents: 'stroke' }}
                  onClick={e => {
                    e.stopPropagation()
                    if (mode === 'delete') { deleteEdge(edge.id); return }
                    setSelected(s => s === `edge-${edge.id}` ? null : `edge-${edge.id}`)
                  }}
                />
              )
            })}
          </svg>

          {nodes.map(node => {
            const pos = getNodePos(node)
            const isSelected = selected === `node-${node.id}`
            const isSource = connectFrom === node.id
            return (
              <div
                key={node.id}
                className={`mindmap-node type-${node.type}${isSelected ? ' selected' : ''}${isSource ? ' connect-source' : ''}`}
                style={{
                  left: pos.x,
                  top: pos.y,
                  width: node.type === 'image' ? 140 : NODE_W,
                  height: node.type === 'image' ? 100 : (node.type === 'root' ? 48 : node.type === 'branch' ? 40 : 36),
                }}
                onPointerDown={e => handleNodePointerDown(e, node.id)}
                onDoubleClick={e => handleNodeDblClick(e, node)}
              >
                {node.type === 'image' ? (
                  <img src={node.src} alt={node.text} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4, pointerEvents: 'none' }} />
                ) : editing === node.id ? (
                  <input
                    className="node-input"
                    value={editText}
                    autoFocus
                    onChange={e => setEditText(e.target.value)}
                    onBlur={() => commitEdit(node.id)}
                    onKeyDown={e => { if (e.key === 'Enter') commitEdit(node.id); if (e.key === 'Escape') setEditing(null) }}
                    onPointerDown={e => e.stopPropagation()}
                  />
                ) : (
                  <span className="node-text">{node.text}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <p className="mindmap-hint">Double-click to edit · Drag to move · Use Connect to link nodes · Click edge to select and remove it</p>
    </div>
  )
}
