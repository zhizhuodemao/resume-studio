// Thin backend: auth + cloud state sync + metered AI proxy.
// Node built-in SQLite, scrypt password hashing, HS256 JWT sessions.
// Swappable later for a BaaS — the API contract is the stable part.
import express from 'express'
import { DatabaseSync } from 'node:sqlite'
import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import path from 'node:path'
import fs from 'node:fs'

const TOKEN_TTL = '30d'
const MAX_STATE_BYTES = 2_000_000

export function createApp({
  dbPath = 'server/.data/app.db',
  upstream = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-me-in-production',
  tokenLimit = process.env.AI_TOKEN_LIMIT ? Number(process.env.AI_TOKEN_LIMIT) : null,
  staticDir = 'dist',
} = {}) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  const db = new DatabaseSync(dbPath)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS states (
      user_id INTEGER PRIMARY KEY REFERENCES users(id),
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS usage_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      endpoint TEXT NOT NULL,
      model TEXT,
      tokens_prompt INTEGER NOT NULL DEFAULT 0,
      tokens_completion INTEGER NOT NULL DEFAULT 0,
      tokens_total INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_usage_user_time ON usage_log(user_id, created_at);
  `)

  const now = () => new Date().toISOString()
  const hashPassword = (password, salt) => crypto.scryptSync(password, salt, 64).toString('hex')
  const signToken = user => jwt.sign({ uid: user.id, email: user.email }, jwtSecret, { expiresIn: TOKEN_TTL })

  const app = express()
  app.use(express.json({ limit: '2mb' }))

  /* ---------- auth middleware ---------- */
  const auth = (req, res, next) => {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) return res.status(401).json({ error: 'auth_required' })
    try {
      const payload = jwt.verify(token, jwtSecret)
      req.userId = payload.uid
      req.userEmail = payload.email
      next()
    } catch {
      res.status(401).json({ error: 'auth_required' })
    }
  }

  /* ---------- naive login rate limiter ---------- */
  const attempts = new Map()
  const tooManyAttempts = key => {
    const nowMs = Date.now()
    const rec = attempts.get(key)
    if (!rec || nowMs - rec.ts > 60_000) {
      attempts.set(key, { count: 1, ts: nowMs })
      return false
    }
    rec.count += 1
    return rec.count > 5
  }

  /* ---------- auth routes ---------- */
  app.post('/api/auth/register', (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase()
    const password = String(req.body?.password || '')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'invalid_email' })
    if (password.length < 6) return res.status(400).json({ error: 'weak_password' })
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (exists) return res.status(409).json({ error: 'email_taken' })
    const salt = crypto.randomBytes(16).toString('hex')
    const info = db
      .prepare('INSERT INTO users(email, password_hash, salt, created_at) VALUES (?,?,?,?)')
      .run(email, hashPassword(password, salt), salt, now())
    const user = { id: Number(info.lastInsertRowid), email }
    res.json({ token: signToken(user), user: { email } })
  })

  app.post('/api/auth/login', (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase()
    const password = String(req.body?.password || '')
    if (tooManyAttempts(`${req.ip}:${email}`)) return res.status(429).json({ error: 'rate_limited' })
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
    if (!user) return res.status(401).json({ error: 'invalid_credentials' })
    const candidate = Buffer.from(hashPassword(password, user.salt), 'hex')
    const stored = Buffer.from(user.password_hash, 'hex')
    if (candidate.length !== stored.length || !crypto.timingSafeEqual(candidate, stored)) {
      return res.status(401).json({ error: 'invalid_credentials' })
    }
    res.json({ token: signToken(user), user: { email: user.email } })
  })

  const usageSummary = userId => {
    const total = db
      .prepare('SELECT COALESCE(SUM(tokens_total),0) AS t, COUNT(*) AS c FROM usage_log WHERE user_id = ?')
      .get(userId)
    const today = db
      .prepare(
        "SELECT COALESCE(SUM(tokens_total),0) AS t FROM usage_log WHERE user_id = ? AND created_at >= date('now')",
      )
      .get(userId)
    return { total_tokens: Number(total.t), calls: Number(total.c), today_tokens: Number(today.t), token_limit: tokenLimit }
  }

  app.get('/api/auth/me', auth, (req, res) => {
    res.json({ user: { email: req.userEmail }, usage: usageSummary(req.userId) })
  })

  app.get('/api/usage', auth, (req, res) => res.json(usageSummary(req.userId)))

  /* ---------- cloud state sync ---------- */
  app.get('/api/sync', auth, (req, res) => {
    const row = db.prepare('SELECT data, updated_at FROM states WHERE user_id = ?').get(req.userId)
    if (!row) return res.json({ state: null, updated_at: null })
    res.json({ state: JSON.parse(row.data), updated_at: row.updated_at })
  })

  app.put('/api/sync', auth, (req, res) => {
    const state = req.body?.state
    if (!state || typeof state !== 'object' || !Array.isArray(state.resumes)) {
      return res.status(400).json({ error: 'invalid_state' })
    }
    const data = JSON.stringify(state)
    if (data.length > MAX_STATE_BYTES) return res.status(413).json({ error: 'state_too_large' })
    db.prepare(
      `INSERT INTO states(user_id, data, updated_at) VALUES (?,?,?)
       ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
    ).run(req.userId, data, now())
    res.json({ ok: true, updated_at: now() })
  })

  /* ---------- metered AI proxy (login required) ---------- */
  const recordUsage = (userId, endpoint, model, usage) => {
    if (!usage) return
    db.prepare(
      'INSERT INTO usage_log(user_id, endpoint, model, tokens_prompt, tokens_completion, tokens_total, created_at) VALUES (?,?,?,?,?,?,?)',
    ).run(
      userId,
      endpoint,
      model || '',
      Number(usage.prompt_tokens) || 0,
      Number(usage.completion_tokens) || 0,
      Number(usage.total_tokens) || 0,
      now(),
    )
  }

  const extractStreamUsage = text => {
    let usage = null
    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      try {
        const json = JSON.parse(payload)
        if (json.usage) usage = json.usage
      } catch {
        /* partial frame */
      }
    }
    return usage
  }

  app.post(/^\/api\/ai\/(.+)$/, auth, async (req, res) => {
    const aiPath = req.params[0]
    if (!/^[\w/-]+$/.test(aiPath)) return res.status(400).json({ error: 'bad_path' })
    const key = process.env.DEEPSEEK_API_KEY
    if (!key) return res.status(500).json({ error: 'ai_not_configured' })

    if (tokenLimit) {
      const { total_tokens } = usageSummary(req.userId)
      if (total_tokens >= tokenLimit) return res.status(429).json({ error: 'quota_exceeded' })
    }

    const body = req.body && typeof req.body === 'object' ? { ...req.body } : {}
    const streaming = Boolean(body.stream)
    if (streaming) body.stream_options = { include_usage: true, ...body.stream_options }

    let upstreamRes
    try {
      upstreamRes = await fetch(`${upstream}/${aiPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify(body),
      })
    } catch (err) {
      console.error(err)
      return res.status(502).json({ error: 'upstream_failed' })
    }

    const ctype = upstreamRes.headers.get('content-type') || 'application/json'
    if (streaming && ctype.includes('text/event-stream')) {
      res.status(upstreamRes.status)
      res.setHeader('Content-Type', ctype)
      res.setHeader('Cache-Control', 'no-store')
      let collected = ''
      const decoder = new TextDecoder()
      try {
        for await (const chunk of upstreamRes.body) {
          res.write(chunk)
          collected += decoder.decode(chunk, { stream: true })
        }
      } finally {
        res.end()
        recordUsage(req.userId, aiPath, body.model, extractStreamUsage(collected))
      }
      return
    }

    const text = await upstreamRes.text()
    res.status(upstreamRes.status).setHeader('Content-Type', 'application/json').send(text)
    try {
      const json = JSON.parse(text)
      recordUsage(req.userId, aiPath, body.model, json.usage)
    } catch {
      /* non-JSON upstream error body */
    }
  })

  /* ---------- static SPA (production single-process deploy) ---------- */
  const indexHtml = path.join(staticDir, 'index.html')
  if (fs.existsSync(indexHtml)) {
    app.use(express.static(staticDir))
    app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.resolve(indexHtml)))
  }

  return { app, db }
}
