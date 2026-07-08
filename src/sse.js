// SSE streaming client for OpenAI-compatible chat completions.
// Handles incremental text deltas AND incremental tool_call fragments
// (function-call arguments arrive as index-keyed JSON slices that must
// be reassembled before execution).

import { authHeaders } from './api.js'

const AI_ENDPOINT = '/api/ai/chat/completions'

// Pure, chunk-boundary-safe assembler — unit-testable without fetch.
export function createChunkAssembler() {
  let buffer = ''
  let content = ''
  const toolCalls = []

  const push = text => {
    buffer += text
    const deltas = []
    let nl
    while ((nl = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, nl).trim()
      buffer = buffer.slice(nl + 1)
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      let json
      try {
        json = JSON.parse(payload)
      } catch {
        continue // malformed frame — skip, keep the stream alive
      }
      const delta = json.choices?.[0]?.delta
      if (!delta) continue
      if (typeof delta.content === 'string' && delta.content) {
        content += delta.content
        deltas.push(delta.content)
      }
      for (const tc of delta.tool_calls || []) {
        const i = Number.isInteger(tc.index) ? tc.index : 0
        if (!toolCalls[i]) toolCalls[i] = { id: '', name: '', arguments: '' }
        if (tc.id) toolCalls[i].id = tc.id
        if (tc.function?.name) toolCalls[i].name += tc.function.name
        if (tc.function?.arguments) toolCalls[i].arguments += tc.function.arguments
      }
    }
    return deltas
  }

  const result = () => ({ content, toolCalls: toolCalls.filter(Boolean) })
  return { push, result }
}

// Streams a chat completion. Falls back transparently to non-streamed
// JSON when the server/proxy/mock replies with application/json.
// Returns { content, toolCalls: [{ id, name, arguments }] }.
export async function chatStream(body, { onDelta, onToolCall, signal } = {}) {
  const res = await fetch(AI_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ ...body, stream: true }),
    signal,
  })
  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    const err = new Error(`AI request failed: ${res.status} ${errBody.slice(0, 200)}`)
    if (res.status === 401) err.code = 'auth_required'
    if (res.status === 429) err.code = errBody.includes('quota_exceeded') ? 'quota_exceeded' : err.code
    throw err
  }

  const ctype = res.headers.get('content-type') || ''
  if (!ctype.includes('text/event-stream')) {
    const data = await res.json()
    const msg = data.choices?.[0]?.message || {}
    const toolCalls = (msg.tool_calls || [])
      .filter(c => c.type === 'function' || c.function)
      .map(c => ({ id: c.id || '', name: c.function?.name || '', arguments: c.function?.arguments || '' }))
    if (toolCalls.length) onToolCall?.()
    if (msg.content) onDelta?.(msg.content)
    return { content: msg.content || '', toolCalls }
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  const asm = createChunkAssembler()
  let toolSignaled = false
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    const deltas = asm.push(decoder.decode(value, { stream: true }))
    for (const d of deltas) onDelta?.(d)
    if (!toolSignaled && asm.result().toolCalls.length) {
      toolSignaled = true
      onToolCall?.()
    }
  }
  asm.push('\n') // flush a trailing unterminated line, if any
  return asm.result()
}
