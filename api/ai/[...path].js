// Vercel Edge AI proxy — streams SSE responses through untouched.
// Same route/contract as the Vite dev proxy; the key stays server-side.
//
// Deploy: set DEEPSEEK_API_KEY in Vercel project env vars.
// TODO before public launch: user auth + per-user quota (thin backend).

export const config = { runtime: 'edge' }

const UPSTREAM = 'https://api.deepseek.com'
const MAX_BODY_BYTES = 200_000

export default async function handler(req) {
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405)
  }
  const key = process.env.DEEPSEEK_API_KEY
  if (!key) {
    return json({ error: 'ai_not_configured' }, 500)
  }
  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/api\/ai\/?/, '')
  if (!/^[\w/-]+$/.test(path)) {
    return json({ error: 'bad_path' }, 400)
  }
  const body = await req.text()
  if (body.length > MAX_BODY_BYTES) {
    return json({ error: 'payload_too_large' }, 413)
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
    // Pass the body stream straight through — SSE chunks arrive live.
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'application/json',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error(err)
    return json({ error: 'upstream_failed' }, 502)
  }
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
