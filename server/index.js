import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { homedir, networkInterfaces } from 'os'

const PORT           = 4321
const BASE_DIR       = join(homedir(), 'Documents', 'Atelier')
const DATA_DIR       = join(BASE_DIR, 'data')
const FILES_DIR      = join(BASE_DIR, 'files')
const COLLECTIONS_FILE = join(DATA_DIR, 'collections.json')

;[BASE_DIR, DATA_DIR, FILES_DIR].forEach(d => mkdirSync(d, { recursive: true }))

const app = express()
app.use(cors())
app.use(express.json({ limit: '50mb' }))

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, FILES_DIR),
  filename:    (_req, file,  cb) => cb(null, file.originalname),
})
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } })

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/ping', (_req, res) => res.json({ ok: true, server: 'atelier-mehdi' }))

// ── Collections JSON ──────────────────────────────────────────────────────────
app.get('/collections', (_req, res) => {
  if (!existsSync(COLLECTIONS_FILE)) return res.json({ collections: [] })
  try {
    res.json(JSON.parse(readFileSync(COLLECTIONS_FILE, 'utf8')))
  } catch {
    res.status(500).json({ error: 'Read error' })
  }
})

app.post('/collections', (req, res) => {
  try {
    writeFileSync(COLLECTIONS_FILE, JSON.stringify(req.body, null, 2), 'utf8')
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Write error' })
  }
})

// ── Binary file upload ────────────────────────────────────────────────────────
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' })
  res.json({ filename: req.file.filename })
})

// ── File serving ──────────────────────────────────────────────────────────────
app.get('/files/:filename', (req, res) => {
  const filepath = join(FILES_DIR, req.params.filename)
  if (!existsSync(filepath)) return res.status(404).end()
  res.sendFile(filepath)
})

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\nAtelier sync server — port ${PORT}`)
  console.log(`Data: ${BASE_DIR}\n`)
  const nets = networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`  → Enter this IP in the app:  ${net.address}`)
      }
    }
  }
  console.log()
})
