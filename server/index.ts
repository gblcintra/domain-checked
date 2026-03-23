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
const host = process.env.HOST || '0.0.0.0'
const jwtSecret = process.env.JWT_SECRET || 'change-this-secret'
const appUrl = process.env.APP_URL || 'http://localhost:5173'
const emailProvider = String(process.env.EMAIL_PROVIDER || 'resend').trim().toLowerCase()
const resendApiKey = process.env.RESEND_API_KEY || ''
const emailFrom = process.env.EMAIL_FROM || 'Auth <auth@send.seudominio.com.br>'
const emailSubject = process.env.EMAIL_SUBJECT || 'Token de recuperação de senha'

app.use(cors())
app.use(express.json())

function addColumnIfMissing(tableName, columnName, definition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all()
  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`)
  }
}

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
      registration_expires_at TEXT,
      registration_checked_at TEXT,
      registration_status TEXT,
      registrar TEXT,
      registrant TEXT,
      registration_availability TEXT,
      rdap_url TEXT,
      registration_details TEXT,
      registration_error TEXT,
      UNIQUE(user_id, hostname),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `)

  addColumnIfMissing('domains', 'registration_expires_at', 'registration_expires_at TEXT')
  addColumnIfMissing('domains', 'registration_checked_at', 'registration_checked_at TEXT')
  addColumnIfMissing('domains', 'registration_status', 'registration_status TEXT')
  addColumnIfMissing('domains', 'registrar', 'registrar TEXT')
  addColumnIfMissing('domains', 'registrant', 'registrant TEXT')
  addColumnIfMissing('domains', 'registration_availability', 'registration_availability TEXT')
  addColumnIfMissing('domains', 'rdap_url', 'rdap_url TEXT')
  addColumnIfMissing('domains', 'registration_details', 'registration_details TEXT')
  addColumnIfMissing('domains', 'registration_error', 'registration_error TEXT')
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


async function sendPasswordRecoveryEmail({ email, token, expiresAt, appBaseUrl }) {
  if (emailProvider !== 'resend') {
    throw new Error('Provedor de e-mail não suportado. Defina EMAIL_PROVIDER=resend.')
  }

  if (!resendApiKey || !emailFrom) {
    throw new Error('Serviço de e-mail não configurado. Defina RESEND_API_KEY e EMAIL_FROM.')
  }

  const resetUrl = `${appBaseUrl}?resetToken=${encodeURIComponent(token)}`
  const expirationDate = new Date(expiresAt).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'UTC'
  })
  const emailBody = buildRecoveryEmail({ token, resetUrl, expiresAt: expirationDate })
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: emailFrom,
      to: [email],
      subject: emailSubject,
      text: emailBody
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Resend ${response.status}: ${errorText || 'Falha ao enviar e-mail.'}`)
  }
}

function normalizeDate(value) {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed.toISOString()
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return null
}

function getVcardField(entity, fieldName) {
  if (!entity?.vcardArray?.[1]) {
    return null
  }

  const entry = entity.vcardArray[1].find((item) => item[0] === fieldName)
  return typeof entry?.[3] === 'string' ? entry[3] : null
}

function getEntityName(entity) {
  if (!entity) {
    return null
  }

  return firstNonEmpty(
    getVcardField(entity, 'fn'),
    getVcardField(entity, 'org'),
    entity.publicIds?.find((item) => item?.identifier)?.identifier,
    entity.handle
  )
}

function getEntityByRole(entities, roleName) {
  if (!Array.isArray(entities)) {
    return null
  }

  return entities.find((item) => Array.isArray(item.roles) && item.roles.includes(roleName)) || null
}

function getWhoisLookupUrl(hostname) {
  return `https://www.whois.com/whois/${hostname}`
}

function normalizeDomainInput(input, fallbackProtocol = 'https') {
  if (typeof input !== 'string') {
    throw new TypeError('Domínio é obrigatório.')
  }

  const trimmed = input.trim()
  if (!trimmed) {
    throw new Error('Domínio é obrigatório.')
  }

  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `${fallbackProtocol}://${trimmed}`

  let parsed
  try {
    parsed = new URL(withScheme)
  } catch {
    throw new Error('Informe um domínio válido, sem caminhos ou parâmetros inválidos.')
  }

  if (!parsed.hostname) {
    throw new Error('Informe um domínio válido.')
  }

  if (parsed.username || parsed.password || (parsed.port && !['80', '443'].includes(parsed.port))) {
    throw new Error('Informe apenas o domínio principal, sem usuário, senha ou porta personalizada.')
  }

  if (parsed.pathname && parsed.pathname !== '/') {
    throw new Error('Informe apenas o domínio, sem páginas internas ou caminhos.')
  }

  if (parsed.search || parsed.hash) {
    throw new Error('Informe apenas o domínio, sem parâmetros ou âncoras.')
  }

  return {
    hostname: parsed.hostname.replace(/\.$/, '').toLowerCase(),
    protocol: parsed.protocol === 'http:' ? 'http' : 'https'
  }
}

async function fetchJson(url, options: { signal?: AbortSignal } = {}) {
  const response = await fetch(url, {
    ...options,
    signal: options.signal || AbortSignal.timeout(8000)
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ao consultar ${url}`)
  }

  return response.json()
}

async function getRdapCandidates(hostname) {
  const defaultCandidates = [
    `https://rdap.org/domain/${hostname}`,
    `https://rdap.verisign.com/com/v1/domain/${hostname}`
  ]

  const labels = hostname.toLowerCase().split('.').filter(Boolean)
  if (labels.length < 2) {
    return defaultCandidates
  }

  try {
    const bootstrap = await fetchJson('https://data.iana.org/rdap/dns.json')
    const services = Array.isArray(bootstrap.services) ? bootstrap.services : []

    for (let size = labels.length - 1; size > 0; size -= 1) {
      const suffix = labels.slice(-size).join('.')
      const match = services.find((entry) => Array.isArray(entry?.[0]) && entry[0].includes(suffix))
      const urls = Array.isArray(match?.[1]) ? match[1] : []
      if (urls.length > 0) {
        return [...new Set(urls.map((baseUrl) => `${String(baseUrl).replace(/\/$/, '')}/domain/${hostname}`).concat(defaultCandidates))]
      }
    }
  } catch {
    return defaultCandidates
  }

  return defaultCandidates
}

function findEventDate(events, actions) {
  const allowedActions = actions.map((action) => action.toLowerCase())
  const match = events.find((item) => {
    const eventAction = String(item?.eventAction || '').toLowerCase().trim()
    return allowedActions.some((action) => eventAction === action || eventAction.includes(action) || action.includes(eventAction))
  })
  return normalizeDate(match?.eventDate)
}

function formatRegistrationDetails(payload, { registrar, registrant, availability }: { registrar?: string; registrant?: string; availability?: string } = {}) {
  const details = [
    availability === 'registered' ? 'Disponibilidade: indisponível para novo registro' : null,
    availability === 'available' ? 'Disponibilidade: disponível para registro' : null,
    typeof payload.objectClassName === 'string' ? `Tipo: ${payload.objectClassName}` : null,
    typeof payload.handle === 'string' ? `Handle: ${payload.handle}` : null,
    registrant ? `Titular: ${registrant}` : null,
    registrar ? `Registrador: ${registrar}` : null,
    Array.isArray(payload.status) && payload.status.length > 0 ? `Status: ${payload.status.join(', ')}` : null,
    Array.isArray(payload.nameservers) ? `Nameservers: ${payload.nameservers.length}` : null,
    typeof payload.port43 === 'string' ? `WHOIS: ${payload.port43}` : null
  ].filter(Boolean)

  return details.length > 0 ? details.join(' • ') : null
}

function parseRegistrationStatus(expiresAt) {
  if (!expiresAt) {
    return 'unknown'
  }

  const diffMs = new Date(expiresAt).getTime() - Date.now()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffMs < 0) {
    return 'expired'
  }

  if (diffDays <= 30) {
    return 'expiring_soon'
  }

  return 'active'
}

function parseRdapResponse(payload, domain, candidate, whoisLookupUrl) {
  const events = Array.isArray(payload.events) ? payload.events : []
  const expiresAt = findEventDate(events, ['expiration'])
  const lastChangedAt = findEventDate(events, ['last changed'])
  const registrationCreatedAt = findEventDate(events, ['registration'])
  const registrarEntity = getEntityByRole(payload.entities, 'registrar')
  const registrantEntity = getEntityByRole(payload.entities, 'registrant')
  const checkedAt = new Date().toISOString()
  const registrar = getEntityName(registrarEntity) || firstNonEmpty(payload.port43, payload.ldhName)
  const registrant = getEntityName(registrantEntity)
  const registrationAvailability = 'registered'
  const registrationDetails = formatRegistrationDetails(payload, {
    registrar,
    registrant,
    availability: registrationAvailability
  })
  const registrationStatus = parseRegistrationStatus(expiresAt)

  return {
    registrationExpiresAt: expiresAt,
    registrationCheckedAt: checkedAt,
    registrationStatus,
    registrationAvailability,
    registrar,
    registrant,
    rdapUrl: whoisLookupUrl || candidate,
    registrationError: expiresAt
      ? null
      : `RDAP sem data de expiração para ${domain.hostname}. Consulte manualmente em ${whoisLookupUrl}`,
    registrationDetails: firstNonEmpty(
      registrationDetails,
      registrationCreatedAt ? `Criado em ${registrationCreatedAt}` : null,
      lastChangedAt ? `Atualizado em ${lastChangedAt}` : null
    ),
    lastChangedAt
  }
}

function buildNotFoundResult(candidate) {
  return {
    registrationExpiresAt: null,
    registrationCheckedAt: new Date().toISOString(),
    registrationStatus: 'unknown',
    registrationAvailability: 'available',
    registrar: null,
    registrant: null,
    rdapUrl: candidate,
    registrationDetails: 'RDAP indica que o domínio está disponível para registro.',
    registrationError: null,
    lastChangedAt: null
  }
}

async function lookupRegistration(domain: { hostname: string }) {
  const rdapCandidates = await getRdapCandidates(domain.hostname)
  const whoisLookupUrl = getWhoisLookupUrl(domain.hostname)

  let lastError = 'Não foi possível consultar o RDAP.'

  for (const candidate of rdapCandidates) {
    try {
      const response = await fetch(candidate, {
        headers: { accept: 'application/rdap+json, application/json' },
        signal: AbortSignal.timeout(8000)
      })

      if (!response.ok) {
        if (response.status === 404) {
          return buildNotFoundResult(whoisLookupUrl)
        }

        lastError = `RDAP retornou HTTP ${response.status}.`
        continue
      }

      const payload = await response.json()
      return parseRdapResponse(payload, domain, candidate, whoisLookupUrl)
    } catch (error) {
      lastError = error.message
    }
  }

  return {
    registrationExpiresAt: null,
    registrationCheckedAt: new Date().toISOString(),
    registrationStatus: 'unknown',
    registrationAvailability: 'unknown',
    registrar: null,
    registrant: null,
    rdapUrl: whoisLookupUrl,
    registrationDetails: null,
    registrationError: `${lastError} Consulte manualmente em ${whoisLookupUrl}`,
    lastChangedAt: null
  }
}

function buildFallbackCheckResult(domain, error) {
  const hostname = typeof domain?.hostname === 'string' ? domain.hostname : ''
  const protocol = domain?.protocol === 'http' ? 'http' : 'https'
  const whoisLookupUrl = hostname ? getWhoisLookupUrl(hostname) : null
  const errorMessage = error instanceof Error ? error.message : 'Falha inesperada ao verificar o domínio.'

  return {
    hostname,
    protocol,
    status: 'offline',
    httpCode: null,
    responseMs: null,
    error: errorMessage,
    resolvedAddress: null,
    registrationExpiresAt: null,
    registrationCheckedAt: new Date().toISOString(),
    registrationStatus: 'unknown',
    registrationAvailability: 'unknown',
    registrar: null,
    registrant: null,
    rdapUrl: whoisLookupUrl,
    registrationDetails: null,
    registrationError: whoisLookupUrl
      ? `${errorMessage} Consulte manualmente em ${whoisLookupUrl}`
      : errorMessage,
    lastChangedAt: null
  }
}

async function checkDomain(domain) {
  try {
    const normalizedDomain = normalizeDomainInput(domain.hostname, domain.protocol)
    const startedAt = Date.now()
    const url = `${normalizedDomain.protocol}://${normalizedDomain.hostname}`

    const [registration, availability] = await Promise.all([
      lookupRegistration(normalizedDomain),
      (async () => {
        try {
          const lookup = await dns.lookup(normalizedDomain.hostname)
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
      })()
    ])

    return {
      ...availability,
      ...registration,
      hostname: normalizedDomain.hostname,
      protocol: normalizedDomain.protocol
    }
  } catch (error) {
    return buildFallbackCheckResult(domain, error)
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

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body
  const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email?.toLowerCase())

  if (!user) {
    return res.json({ message: 'Se o e-mail existir, enviaremos instruções.' })
  }

  const token = crypto.randomBytes(33).toString('hex')
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30).toISOString()

  db.prepare('INSERT INTO reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)').run(user.id, token, expiresAt)

  try {
    await sendPasswordRecoveryEmail({ email: user.email, token, expiresAt, appBaseUrl: getRequestAppUrl(req) })
  } catch (error) {
    db.prepare('DELETE FROM reset_tokens WHERE token = ?').run(token)
    const message = error instanceof Error ? error.message : 'Não foi possível enviar o e-mail de recuperação.'
    return res.status(500).json({ error: message })
  }

  return res.json({
    message: 'Se o e-mail existir, enviaremos o token de recuperação por e-mail.'
  })
})

app.post('/api/auth/reset-password', (req, res) => {
  const { token, password } = req.body
  if (!token || !password) {
    return res.status(400).json({ error: 'Token e nova senha são obrigatórios.' })
  }

  if (String(token).length > 66) {
    return res.status(400).json({ error: 'O token de recuperação deve ter no máximo 66 caracteres.' })
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

app.post('/api/domains', auth, async (req, res) => {
  const { hostname, protocol = 'https', notes = '' } = req.body

  try {
    const normalizedDomain = normalizeDomainInput(hostname, protocol)
    const result = db
      .prepare('INSERT INTO domains (user_id, hostname, protocol, notes) VALUES (?, ?, ?, ?)')
      .run(req.user.sub, normalizedDomain.hostname, normalizedDomain.protocol, notes)
    const domain = db.prepare('SELECT * FROM domains WHERE id = ?').get(result.lastInsertRowid)

    try {
      const checkResult = await checkDomain(domain)
      persistDomainCheck(domain.id, checkResult)
    } catch {
      // The domain is created even if the initial check fails; the user can retry later.
    }

    const updatedDomain = db.prepare('SELECT * FROM domains WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json({ domain: updatedDomain })
  } catch (error) {
    if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Esse domínio já foi cadastrado.' })
    }

    return res.status(400).json({ error: error.message || 'Não foi possível cadastrar o domínio.' })
  }
})

app.delete('/api/domains/:id', auth, (req, res) => {
  db.prepare('DELETE FROM domains WHERE id = ? AND user_id = ?').run(req.params.id, req.user.sub)
  res.status(204).send()
})

function persistDomainCheck(domainId, result) {
  db.prepare(`
    UPDATE domains
    SET hostname = ?,
        protocol = ?,
        last_checked_at = CURRENT_TIMESTAMP,
        last_status = ?,
        last_http_code = ?,
        last_response_ms = ?,
        last_error = ?,
        registration_expires_at = ?,
        registration_checked_at = ?,
        registration_status = ?,
        registration_availability = ?,
        registrar = ?,
        registrant = ?,
        rdap_url = ?,
        registration_details = ?,
        registration_error = ?
    WHERE id = ?
  `).run(
    result.hostname,
    result.protocol,
    result.status,
    result.httpCode,
    result.responseMs,
    result.error,
    result.registrationExpiresAt,
    result.registrationCheckedAt,
    result.registrationStatus,
    result.registrationAvailability,
    result.registrar,
    result.registrant,
    result.rdapUrl,
    result.registrationDetails,
    result.registrationError,
    domainId
  )
}

app.post('/api/domains/:id/check', auth, async (req, res) => {
  const domain = db.prepare('SELECT * FROM domains WHERE id = ? AND user_id = ?').get(req.params.id, req.user.sub)
  if (!domain) {
    return res.status(404).json({ error: 'Domínio não encontrado.' })
  }

  const result = await checkDomain(domain)
  persistDomainCheck(domain.id, result)

  const updated = db.prepare('SELECT * FROM domains WHERE id = ?').get(domain.id)
  res.json({ domain: updated, diagnostics: result })
})

app.post('/api/domains/check-all', auth, async (req, res) => {
  const domains = db.prepare('SELECT * FROM domains WHERE user_id = ?').all(req.user.sub)
  const updated = []

  for (const domain of domains) {
    const result = await checkDomain(domain)
    persistDomainCheck(domain.id, result)
    updated.push(db.prepare('SELECT * FROM domains WHERE id = ?').get(domain.id))
  }

  res.json({ domains: updated })
})

app.listen(port, host, () => {
  const publicHost = host === '0.0.0.0' ? 'localhost' : host
  console.log(`API listening on http://${publicHost}:${port}`)
  if (host === '0.0.0.0') {
    console.log(`API disponível na rede local pela porta ${port}.`)
  }
})
