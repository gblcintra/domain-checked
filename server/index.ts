import 'dotenv/config'
import bcrypt from 'bcryptjs'
import cors from 'cors'
import Database from 'better-sqlite3'
import express from 'express'
import jwt from 'jsonwebtoken'
import dns from 'node:dns/promises'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.join(__dirname, 'data')
fs.mkdirSync(dataDir, { recursive: true })
const dbPath = path.join(dataDir, 'app.db')
const db = new Database(dbPath)
const app = express()
const port = Number(process.env.PORT || 3001)
const jwtSecret = process.env.JWT_SECRET || 'change-this-secret'
const appUrl = process.env.APP_URL || 'http://localhost:5173'

app.use(cors())
app.use(express.json())

function bootstrap() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS domains (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      hostname TEXT NOT NULL,
      protocol TEXT NOT NULL DEFAULT 'https',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_checked_at TEXT,
      last_status TEXT,
      last_http_code INTEGER,
      last_response_ms INTEGER,
      last_error TEXT,
      UNIQUE(user_id, hostname),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `)
}

bootstrap()

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, name: user.name }, jwtSecret, { expiresIn: '7d' })
}

function auth(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token ausente.' })
  }

  try {
    req.user = jwt.verify(header.slice(7), jwtSecret)
    next()
  } catch {
    return res.status(401).json({ error: 'Token inválido.' })
  }
}

async function checkDomain(domain) {
  const startedAt = Date.now()
  const url = `${domain.protocol}://${domain.hostname}`

  try {
    const lookup = await dns.lookup(domain.hostname)
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      headers: { 'user-agent': 'domain-checked-bot/1.0' }
    })

    return {
      status: response.ok ? 'online' : 'warning',
      httpCode: response.status,
      responseMs: Date.now() - startedAt,
      error: null,
      resolvedAddress: lookup.address
    }
  } catch (error) {
    return {
      status: 'offline',
      httpCode: null,
      responseMs: Date.now() - startedAt,
      error: error.message,
      resolvedAddress: null
    }
  }
}

app.get('/api/health', (_, res) => {
  res.json({ ok: true })
})

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' })
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase())
  if (existing) {
    return res.status(409).json({ error: 'E-mail já cadastrado.' })
  }

  const passwordHash = bcrypt.hashSync(password, 10)
  const result = db
    .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run(name, email.toLowerCase(), passwordHash)

  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(result.lastInsertRowid)
  return res.status(201).json({ token: signToken(user), user })
})

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email?.toLowerCase())

  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.status(401).json({ error: 'Credenciais inválidas.' })
  }

  const safeUser = { id: user.id, name: user.name, email: user.email }
  return res.json({ token: signToken(safeUser), user: safeUser })
})

app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body
  const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email?.toLowerCase())

  if (!user) {
    return res.json({ message: 'Se o e-mail existir, enviaremos instruções.' })
  }

  const token = crypto.randomBytes(24).toString('hex')
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30).toISOString()

  db.prepare('INSERT INTO reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)').run(user.id, token, expiresAt)

  return res.json({
    message: 'Token de redefinição criado com sucesso.',
    resetToken: token,
    resetUrl: `${appUrl}?resetToken=${token}`
  })
})

app.post('/api/auth/reset-password', (req, res) => {
  const { token, password } = req.body
  if (!token || !password) {
    return res.status(400).json({ error: 'Token e nova senha são obrigatórios.' })
  }

  const reset = db
    .prepare('SELECT * FROM reset_tokens WHERE token = ? AND used_at IS NULL')
    .get(token)

  if (!reset || new Date(reset.expires_at).getTime() < Date.now()) {
    return res.status(400).json({ error: 'Token inválido ou expirado.' })
  }

  const passwordHash = bcrypt.hashSync(password, 10)
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, reset.user_id)
  db.prepare('UPDATE reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?').run(reset.id)

  return res.json({ message: 'Senha atualizada com sucesso.' })
})

app.get('/api/auth/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(req.user.sub)
  res.json({ user })
})

app.get('/api/domains', auth, (req, res) => {
  const domains = db
    .prepare('SELECT * FROM domains WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user.sub)
  res.json({ domains })
})

app.post('/api/domains', auth, (req, res) => {
  const { hostname, protocol = 'https', notes = '' } = req.body
  if (!hostname) {
    return res.status(400).json({ error: 'Domínio é obrigatório.' })
  }

  try {
    const result = db
      .prepare('INSERT INTO domains (user_id, hostname, protocol, notes) VALUES (?, ?, ?, ?)')
      .run(req.user.sub, hostname.trim().toLowerCase(), protocol, notes)
    const domain = db.prepare('SELECT * FROM domains WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json({ domain })
  } catch {
    res.status(409).json({ error: 'Esse domínio já foi cadastrado.' })
  }
})

app.delete('/api/domains/:id', auth, (req, res) => {
  db.prepare('DELETE FROM domains WHERE id = ? AND user_id = ?').run(req.params.id, req.user.sub)
  res.status(204).send()
})

app.post('/api/domains/:id/check', auth, async (req, res) => {
  const domain = db.prepare('SELECT * FROM domains WHERE id = ? AND user_id = ?').get(req.params.id, req.user.sub)
  if (!domain) {
    return res.status(404).json({ error: 'Domínio não encontrado.' })
  }

  const result = await checkDomain(domain)
  db.prepare(`
    UPDATE domains
    SET last_checked_at = CURRENT_TIMESTAMP,
        last_status = ?,
        last_http_code = ?,
        last_response_ms = ?,
        last_error = ?
    WHERE id = ?
  `).run(result.status, result.httpCode, result.responseMs, result.error, domain.id)

  const updated = db.prepare('SELECT * FROM domains WHERE id = ?').get(domain.id)
  res.json({ domain: updated, diagnostics: result })
})

app.post('/api/domains/check-all', auth, async (req, res) => {
  const domains = db.prepare('SELECT * FROM domains WHERE user_id = ?').all(req.user.sub)
  const updated = []

  for (const domain of domains) {
    const result = await checkDomain(domain)
    db.prepare(`
      UPDATE domains
      SET last_checked_at = CURRENT_TIMESTAMP,
          last_status = ?,
          last_http_code = ?,
          last_response_ms = ?,
          last_error = ?
      WHERE id = ?
    `).run(result.status, result.httpCode, result.responseMs, result.error, domain.id)
    updated.push(db.prepare('SELECT * FROM domains WHERE id = ?').get(domain.id))
  }

  res.json({ domains: updated })
})

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
})
