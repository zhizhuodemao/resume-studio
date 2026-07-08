import { useEffect, useRef, useState } from 'react'
import { coachTurn } from '../ai.js'

export default function Coach({ t, lang, resume, onApplyPatch, onClose }) {
  const [messages, setMessages] = useState(() => [{ role: 'assistant', content: t.coach.welcome, applied: false }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const listRef = useRef(null)

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, busy])

  const send = async () => {
    const text = input.trim()
    if (!text || busy) return
    setInput('')
    const history = [...messages.map(m => ({ role: m.role, content: m.content })), { role: 'user', content: text }]
    setMessages(ms => [...ms, { role: 'user', content: text }])
    setBusy(true)
    try {
      const { reply, patch } = await coachTurn(
        history.filter(m => m.role === 'user' || m.role === 'assistant'),
        resume,
        lang,
      )
      let applied = false
      if (patch) applied = onApplyPatch(patch)
      setMessages(ms => [...ms, { role: 'assistant', content: reply, applied }])
    } catch (err) {
      console.error(err)
      setMessages(ms => [...ms, { role: 'assistant', content: t.ai.error, applied: false, error: true }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="insight-drawer coach-drawer" data-testid="coach-drawer">
      <div className="insight-head">
        <span className="coach-title">✨ {t.coach.title}</span>
        <button className="icon-btn" title={t.insight.close} onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="coach-list" ref={listRef}>
        {messages.map((m, i) => (
          <div key={i} className={`coach-msg coach-msg-${m.role} ${m.error ? 'coach-msg-error' : ''}`}>
            <div className="coach-bubble">{m.content}</div>
            {m.applied && <div className="coach-applied">✓ {t.coach.applied}</div>}
          </div>
        ))}
        {busy && (
          <div className="coach-msg coach-msg-assistant">
            <div className="coach-bubble coach-thinking">{t.coach.thinking}</div>
          </div>
        )}
      </div>
      <div className="coach-input-row">
        <textarea
          className="coach-input"
          rows={2}
          value={input}
          placeholder={t.coach.placeholder}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
        />
        <button className="btn btn-primary coach-send" disabled={busy || !input.trim()} onClick={send}>
          {t.coach.send}
        </button>
      </div>
    </div>
  )
}
