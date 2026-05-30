import https from 'https'
import http from 'http'
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { homedir, networkInterfaces } from 'os'

const PORT      = 4321
const PORT_HTTP = 4322   // HTTP-only port used to serve the cert installer before HTTPS is trusted

const BASE_DIR         = join(homedir(), 'Documents', 'Atelier')
const DATA_DIR         = join(BASE_DIR, 'data')
const FILES_DIR        = join(BASE_DIR, 'files')
const COLLECTIONS_FILE = join(DATA_DIR, 'collections.json')

;[BASE_DIR, DATA_DIR, FILES_DIR].forEach(d => mkdirSync(d, { recursive: true }))

const CERT_FILE = process.env.ATELIER_CERT || ''
const KEY_FILE  = process.env.ATELIER_KEY  || ''
const CA_FILE   = process.env.ATELIER_CA   || ''
const HOSTNAME  = process.env.ATELIER_HOSTNAME || 'your-mac.local'

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

// ── Root CA download — install this on iPhone once to trust HTTPS ─────────────
app.get('/install-cert', (_req, res) => {
  if (!CA_FILE || !existsSync(CA_FILE)) return res.status(404).send('Certificate not found. Run start.sh first.')
  res.setHeader('Content-Type', 'application/x-x509-ca-cert')
  res.setHeader('Content-Disposition', 'attachment; filename="atelier-ca.pem"')
  res.sendFile(CA_FILE)
})

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

// ── Startup banner ────────────────────────────────────────────────────────────
function printStartup() {
  const nets = networkInterfaces()
  let ip = '127.0.0.1'
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) { ip = net.address; break }
    }
  }

  const proto = (CERT_FILE && existsSync(CERT_FILE)) ? 'https' : 'http'
  console.log(`\nAtelier sync server — port ${PORT} (${proto.toUpperCase()})`)
  console.log(`Data: ${BASE_DIR}\n`)
  console.log(`  Enter in app → ${ip}  or  ${HOSTNAME}`)

  if (proto === 'https') {
    console.log(`\n  ── First time on a new iPhone/iPad ──────────────────────`)
    console.log(`  1. Open Safari → http://${HOSTNAME}:${PORT_HTTP}/install-cert`)
    console.log(`     (tap Allow to download the certificate file)`)
    console.log(`  2. Settings → General → VPN & Device Management → install`)
    console.log(`  3. Settings → General → About → Certificate Trust Settings`)
    console.log(`     → toggle "Atelier Local CA" to ON`)
    console.log(`  4. Open Atelier app → Wi-Fi icon → enter ${ip} → Connect`)
    console.log(`  ─────────────────────────────────────────────────────────\n`)
  }
}

// ── Start servers ─────────────────────────────────────────────────────────────
if (CERT_FILE && existsSync(CERT_FILE)) {
  // HTTPS on 4321 (primary — used by the PWA)
  https.createServer(
    { cert: readFileSync(CERT_FILE), key: readFileSync(KEY_FILE) },
    app
  ).listen(PORT, '0.0.0.0', printStartup)

  // HTTP on 4322 (cert installer only — needed before HTTPS is trusted on a new device)
  http.createServer(app).listen(PORT_HTTP, '0.0.0.0', () => {})
} else {
  // Fallback: plain HTTP (before certs are generated)
  http.createServer(app).listen(PORT, '0.0.0.0', printStartup)
}
