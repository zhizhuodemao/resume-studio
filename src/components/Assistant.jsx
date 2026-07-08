import { useEffect, useMemo, useRef, useState } from 'react'
import { checkResume } from '../checker.js'

// The left-hand conversation panel: one assistant that coaches, edits,
// analyzes and tailors. Changes appear as chips with per-turn undo.
export default function Assistant({ t, lang, doc, onRunTurn, onUndoSnapshot, initialMessage, onInitialSent }) {
  const [messages, setMessages] = useState(() => [{ role: 'assistant', content: t.assistant.welcome }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [showFindings, setShowFindings] = useState(false)
  const listRef = useRef(null)
  const inputRef = useRef(null)

  const report = useMemo(() => checkResume(doc.resume, lang), [doc.resume, lang])

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, busy])

  const initialSentRef = useRef(false)
  useEffect(() => {
    if (initialMessage && !initialSentRef.current) {
      initialSentRef.current = true
      onInitialSent?.()
      send(initialMessage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage])

  useEffect(() => {
    const onKey = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const send = async textArg => {
    const text = (textArg ?? input).trim()
    if (!text || busy) return
    setInput('')
    const history = [
      ...messages.filter(m => !m.system).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: text },
    ]
    // streaming placeholder appended right away — deltas type into it
    setMessages(ms => [...ms, { role: 'user', content: text }, { role: 'assistant', content: '', streaming: true }])
    setBusy(true)
    const patchStreaming = updater =>
      setMessages(ms => {
        const copy = [...ms]
        const last = copy[copy.length - 1]
        if (last?.streaming) copy[copy.length - 1] = updater(last)
        return copy
      })
    const finalize = finalMsg =>
      setMessages(ms => {
        const copy = [...ms]
        if (copy[copy.length - 1]?.streaming) copy[copy.length - 1] = finalMsg
        else copy.push(finalMsg)
        return copy
      })
    try {
      const result = await onRunTurn(history, {
        onDelta: d => patchStreaming(m => ({ ...m, content: m.content + d })),
        onToolCall: () => patchStreaming(m => ({ ...m, working: true })),
      })
      finalize({
        role: 'assistant',
        content: result.message || (result.labels.length ? t.cmd.done : t.cmd.noop),
        labels: result.labels,
        snapshot: result.snapshot,
      })
    } catch (err) {
      console.error(err)
      finalize({ role: 'assistant', content: t.ai.error, error: true })
    } finally {
      setBusy(false)
    }
  }

  const undoTurn = idx => {
    setMessages(ms =>
      ms.map((m, i) => {
        if (i !== idx || !m.snapshot) return m
        onUndoSnapshot(m.snapshot)
        return { ...m, snapshot: null, undone: true }
      }),
    )
  }

  const scoreColor = report.score >= 85 ? '#12b76a' : report.score >= 65 ? '#f59e0b' : '#ef4444'

  return (
    <aside className="assistant" data-testid="assistant">
      <div className="assistant-health" onClick={() => setShowFindings(v => !v)}>
        <span className="assistant-score" style={{ color: scoreColor }}>
          {report.score}
        </span>
        <span className="assistant-health-text">
          {report.findings.length === 0 ? t.insight.empty : t.assistant.findings(report.findings.length)}
        </span>
        <span className="assistant-health-toggle">{showFindings ? '▾' : '▸'}</span>
      </div>
      {showFindings && report.findings.length > 0 && (
        <div className="assistant-findings">
          {report.findings.slice(0, 8).map((f, i) => (
            <div key={i} className={`assistant-finding level-${f.level}`}>
              {f.message}
            </div>
          ))}
        </div>
      )}

      <div className="coach-list assistant-list" ref={listRef}>
        {messages.map((m, i) => (
          <div key={i} className={`coach-msg coach-msg-${m.role} ${m.error ? 'coach-msg-error' : ''}`}>
            <div className={`coach-bubble ${m.streaming ? 'streaming' : ''}`}>
              {m.content || (m.streaming ? t.coach.thinking : '')}
            </div>
            {m.streaming && m.working && (
              <div className="assistant-working">
                <span className="cmd-spark">✦</span> {t.cmd.working}
              </div>
            )}
            {m.labels?.length > 0 && (
              <div className="cmd-card-labels assistant-labels">
                {m.labels.map((l, j) => (
                  <span className="cmd-chip" key={j}>
                    {l}
                  </span>
                ))}
              </div>
            )}
            {m.snapshot && (
              <button className="assistant-undo" onClick={() => undoTurn(i)}>
                {t.cmd.undo}
              </button>
            )}
            {m.undone && <div className="assistant-undone">{t.assistant.undone}</div>}
          </div>
        ))}
        {messages.length === 1 && !busy && (
          <div className="assistant-suggestions">
            {t.assistant.suggestions.map((sug, i) => (
              <button key={i} className="track-chip" onClick={() => send(sug)}>
                {sug}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={`cmd-bar assistant-input ${busy ? 'busy' : ''}`}>
        <span className="cmd-spark" aria-hidden="true">
          ✦
        </span>
        <textarea
          ref={inputRef}
          data-testid="cmd-input"
          rows={1}
          value={input}
          placeholder={busy ? t.cmd.working : t.assistant.placeholder}
          disabled={busy}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
        />
        <button className="btn btn-primary cmd-send" disabled={busy || !input.trim()} onClick={() => send()}>
          {t.cmd.send}
        </button>
      </div>
    </aside>
  )
}
