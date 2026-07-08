import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createApp } from './app.js'
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

let base = ''
let server
let mockUpstream
let tmpDir

const post = (p, body, token) =>
  fetch(`${base}${p}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
const get = (p, token) =>
  fetch(`${base}${p}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rs-test-'))

  // Mock DeepSeek upstream: JSON for non-stream, SSE (with usage frame) for stream
  mockUpstream = http.createServer((req, res) => {
    let raw = ''
    req.on('data', c => (raw += c))
    req.on('end', () => {
      const body = JSON.parse(raw || '{}')
      if (body.stream) {
        res.writeHead(200, { 'Content-Type': 'text/event-stream' })
        res.write('data: {"choices":[{"delta":{"content":"流式"}}]}\n\n')
        res.write('data: {"choices":[{"delta":{"content":"回复"}}]}\n\n')
        res.write('data: {"choices":[],"usage":{"prompt_tokens":100,"completion_tokens":20,"total_tokens":120}}\n\n')
        res.end('data: [DONE]\n\n')
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            choices: [{ message: { content: 'ok' } }],
            usage: { prompt_tokens: 50, completion_tokens: 10, total_tokens: 60 },
          }),
        )
      }
    })
  })
  await new Promise(r => mockUpstream.listen(0, r))

  process.env.DEEPSEEK_API_KEY = 'test-key'
  const { app } = createApp({
    dbPath: path.join(tmpDir, 'test.db'),
    upstream: `http://localhost:${mockUpstream.address().port}`,
    jwtSecret: 'test-secret',
    tokenLimit: 150,
    staticDir: path.join(tmpDir, 'no-dist'),
  })
  server = app.listen(0)
  await new Promise(r => server.on('listening', r))
  base = `http://localhost:${server.address().port}`
})

afterAll(() => {
  server?.close()
  mockUpstream?.close()
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('auth', () => {
  it('registers, rejects duplicates and weak passwords, logs in', async () => {
    const r1 = await post('/api/auth/register', { email: 'a@test.dev', password: 'secret1' })
    expect(r1.status).toBe(200)
    const { token } = await r1.json()
    expect(token).toBeTruthy()

    expect((await post('/api/auth/register', { email: 'a@test.dev', password: 'secret1' })).status).toBe(409)
    expect((await post('/api/auth/register', { email: 'b@test.dev', password: '123' })).status).toBe(400)
    expect((await post('/api/auth/login', { email: 'a@test.dev', password: 'wrong-1' })).status).toBe(401)

    const r2 = await post('/api/auth/login', { email: 'a@test.dev', password: 'secret1' })
    expect(r2.status).toBe(200)

    const meRes = await get('/api/auth/me', (await r2.json()).token)
    expect((await meRes.json()).user.email).toBe('a@test.dev')
  })

  it('rejects unauthenticated access to protected routes', async () => {
    expect((await get('/api/sync')).status).toBe(401)
    expect((await get('/api/usage')).status).toBe(401)
    expect((await post('/api/ai/chat/completions', { model: 'x' })).status).toBe(401)
  })
})

describe('cloud sync', () => {
  it('roundtrips state per user and validates shape', async () => {
    const { token } = await (await post('/api/auth/register', { email: 'sync@test.dev', password: 'secret1' })).json()
    expect((await (await get('/api/sync', token)).json()).state).toBeNull()

    const state = { version: 2, lang: 'zh', activeId: 'd1', resumes: [{ id: 'd1', name: '云端简历' }] }
    const put = await fetch(`${base}/api/sync`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ state }),
    })
    expect(put.status).toBe(200)
    const pulled = await (await get('/api/sync', token)).json()
    expect(pulled.state.resumes[0].name).toBe('云端简历')

    const bad = await fetch(`${base}/api/sync`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ state: { nope: true } }),
    })
    expect(bad.status).toBe(400)
  })
})

describe('metered AI proxy', () => {
  it('records non-stream and stream usage, then enforces the quota', async () => {
    const { token } = await (await post('/api/auth/register', { email: 'ai@test.dev', password: 'secret1' })).json()

    // non-stream call → 60 tokens recorded
    const r1 = await post('/api/ai/chat/completions', { model: 'deepseek-chat', messages: [] }, token)
    expect(r1.status).toBe(200)
    let usage = await (await get('/api/usage', token)).json()
    expect(usage.total_tokens).toBe(60)
    expect(usage.calls).toBe(1)

    // stream call → SSE passthrough + 120 tokens recorded
    const r2 = await post('/api/ai/chat/completions', { model: 'deepseek-chat', stream: true, messages: [] }, token)
    expect(r2.headers.get('content-type')).toContain('text/event-stream')
    const text = await r2.text()
    expect(text).toContain('流式')
    usage = await (await get('/api/usage', token)).json()
    expect(usage.total_tokens).toBe(180)
    expect(usage.calls).toBe(2)

    // limit is 150 → next call blocked
    const r3 = await post('/api/ai/chat/completions', { model: 'deepseek-chat', messages: [] }, token)
    expect(r3.status).toBe(429)
    expect((await r3.json()).error).toBe('quota_exceeded')
  })
})
