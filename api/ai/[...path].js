// Vercel serverless AI proxy — the production replacement for the Vite dev
// proxy. Same route (/api/ai/*), same contract; the API key stays server-side.
//
// Deploy: set DEEPSEEK_API_KEY in Vercel project env vars.
// TODO before public launch: add user auth + per-user quota (thin backend
// phase); this version only enforces basic request hygiene.

const UPSTREAM = 'https://api.deepseek.com'
const MAX_BODY_BYTES = 200_000

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }
  const key = process.env.DEEPSEEK_API_KEY
  if (!key) {
    res.status(500).json({ error: 'ai_not_configured' })
    return
  }
  const path = Array.isArray(req.query.path) ? req.query.path.join('/') : String(req.query.path || '')
  if (!/^[\w/-]+$/.test(path)) {
    res.status(400).json({ error: 'bad_path' })
    return
  }
  const body = JSON.stringify(req.body ?? {})
  if (body.length > MAX_BODY_BYTES) {
    res.status(413).json({ error: 'payload_too_large' })
    return
  }
  try {
    const upstream = await fetch(`${UPSTREAM}/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body,
    })
    const data = await upstream.text()
    res.status(upstream.status).setHeader('Content-Type', 'application/json').send(data)
  } catch (err) {
    console.error(err)
    res.status(502).json({ error: 'upstream_failed' })
  }
}
