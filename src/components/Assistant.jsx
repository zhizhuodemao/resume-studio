import { useEffect, useMemo, useRef, useState } from 'react'
import { checkResume } from '../checker.js'
import { getGuestQuota } from '../api.js'
import { renderInline } from '../templates/shared.jsx'

// Lightweight markdown for assistant bubbles: paragraphs, "- " lists,
// and the same inline **bold**/*italic*/[link] grammar as the resume.
function BubbleText({ text }) {
  const blocks = []
  let list = null
  for (const ln of String(text).split('\n')) {
    const m = ln.match(/^\s*[-•]\s+(.*)/)
    if (m) {
      if (!list) list = []
      list.push(m[1])
      continue
    }
    if (list) {
      blocks.push({ type: 'ul', items: list })
      list = null
    }
    if (ln.trim()) blocks.push({ type: 'p', text: ln })
  }
  if (list) blocks.push({ type: 'ul', items: list })
  return blocks.map((b, i) =>
    b.type === 'ul' ? (
      <ul key={i}>
        {b.items.map((item, j) => (
          <li key={j}>{renderInline(item)}</li>
        ))}
      </ul>
    ) : (
      <p key={i}>{renderInline(b.text)}</p>
    ),
  )
}

// One executed action, streamed live while the agent works.
function ActionRow({ entry }) {
  return (
    <div className={`action-row action-${entry.status}`}>
      <span className="action-icon">
        {entry.status === 'running' ? <span className="action-spinner" /> : entry.status === 'done' ? '✓' : '✗'}
      </span>
      <span className="action-label">{entry.label}</span>
    </div>
  )
}

function DiffValue({ value, kind }) {
  const [open, setOpen] = useState(false)
  if (!value) return null
  const long = value.length > 46
  return (
    <span
      className={`diff-val diff-${kind} ${long ? 'diff-expandable' : ''} ${open ? 'open' : ''}`}
      onClick={
        long
          ? e => {
              e.stopPropagation()
              setOpen(v => !v)
            }
          : undefined
      }
    >
      {open || !long ? value : `${value.slice(0, 46)}…`}
    </span>
  )
}

// The change receipt: what changed, where, before → after.
function DiffCard({ t, msg, onUndo, onAccept, onReject, onFocusSection }) {
  const { diff } = msg
  if (!diff?.length) return null
  return (
    <div className="diff-card" data-testid="diff-card">
      <div className="diff-head">
        <span>{t.agent.changes(diff.length)}</span>
        {msg.pending && !msg.resolved && <span className="diff-pending-badge">{t.agent.pendingBadge}</span>}
      </div>
      <div className="diff-rows">
        {diff.map((row, i) => (
          <div className="diff-row" key={i} onClick={() => onFocusSection(row.section.split(' · ')[0])}>
            <div className="diff-where">
              {row.kind === 'add' && <span className="diff-tag diff-tag-add">{t.agent.added}</span>}
              {row.kind === 'remove' && <span className="diff-tag diff-tag-remove">{t.agent.removed}</span>}
              {row.section}
              {row.field ? ` · ${row.field}` : ''}
            </div>
            {(row.from || row.to) && (
              <div className="diff-change">
                <DiffValue value={row.from} kind="from" />
                {row.from && row.to && <span className="diff-arrow">→</span>}
                <DiffValue value={row.to} kind="to" />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="diff-actions">
        {msg.pending && !msg.resolved && (
          <>
            <button className="btn btn-small btn-primary" data-testid="diff-accept" onClick={onAccept}>
              {t.agent.accept}
            </button>
            <button className="btn btn-small" data-testid="diff-reject" onClick={onReject}>
              {t.agent.reject}
            </button>
          </>
        )}
        {msg.resolved === 'accepted' && <span className="diff-resolved">{t.agent.accepted}</span>}
        {msg.resolved === 'rejected' && <span className="diff-resolved">{t.agent.rejected}</span>}
        {msg.snapshot && (
          <button className="assistant-undo" onClick={onUndo}>
            {t.cmd.undo}
          </button>
        )}
        {msg.undone && <span className="assistant-undone">{t.assistant.undone}</span>}
      </div>
    </div>
  )
}

const CHAT_LIMIT = 40
const chatKey = docId => `rs-chat-${docId}`

function loadChat(docId, welcome) {
  try {
    const raw = JSON.parse(localStorage.getItem(chatKey(docId)) || 'null')
    if (Array.isArray(raw) && raw.length) return raw
  } catch {
    /* corrupted */
  }
  return [{ role: 'assistant', content: welcome }]
}

function persistChat(docId, messages) {
  try {
    const slim = messages.slice(-CHAT_LIMIT).map(m => {
      const { snapshot, pending, actionLog, streaming, ...rest } = m
      return rest
    })
    localStorage.setItem(chatKey(docId), JSON.stringify(slim))
  } catch {
    /* storage full */
  }
}

export default function Assistant({
  t,
  lang,
  doc,
  authUser,
  onRunTurn,
  onUndoSnapshot,
  onApplyPending,
  reviewMode,
  onToggleReviewMode,
  initialMessage,
  onInitialSent,
}) {
  const [messages, setMessages] = useState(() => loadChat(doc.id, t.assistant.welcome))
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [showFindings, setShowFindings] = useState(false)
  const listRef = useRef(null)
  const inputRef = useRef(null)
  const lastUserRef = useRef('')

  const report = useMemo(() => checkResume(doc.resume, lang), [doc.resume, lang])
  const [guestQuota, setGuestQuota] = useState(null)
  const nudgedRef = useRef(false)

  // the conversation follows the document
  const docIdRef = useRef(doc.id)
  useEffect(() => {
    if (docIdRef.current !== doc.id) {
      docIdRef.current = doc.id
      setMessages(loadChat(doc.id, t.assistant.welcome))
    }
  }, [doc.id, t])

  useEffect(() => {
    persistChat(docIdRef.current, messages)
  }, [messages])

  useEffect(() => {
    if (authUser) {
      setGuestQuota(null)
      return
    }
    getGuestQuota().then(setGuestQuota).catch(() => setGuestQuota(null))
  }, [authUser])

  // "hand off to AI" buttons elsewhere prefill the input here
  useEffect(() => {
    const onPrefill = e => {
      setInput(e.detail || '')
      inputRef.current?.focus()
    }
    window.addEventListener('assistant-prefill', onPrefill)
    return () => window.removeEventListener('assistant-prefill', onPrefill)
  }, [])

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

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, busy])

  const send = async textArg => {
    const text = (textArg ?? input).trim()
    if (!text || busy) return
    setInput('')
    lastUserRef.current = text
    const history = [
      ...messages.filter(m => !m.system && m.content).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: text },
    ]
    setMessages(ms => [
      ...ms,
      { role: 'user', content: text },
      { role: 'assistant', content: '', streaming: true, actionLog: [] },
    ])
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
        const last = copy[copy.length - 1]
        // keep the executed-action log visible in the final message
        const merged = last?.streaming ? { actionLog: last.actionLog, ...finalMsg } : finalMsg
        if (last?.streaming) copy[copy.length - 1] = merged
        else copy.push(merged)
        return copy
      })
    try {
      const result = await onRunTurn(history, {
        onDelta: d => patchStreaming(m => ({ ...m, content: m.content + d })),
        onAction: entry =>
          patchStreaming(m => {
            const log = [...(m.actionLog || [])]
            const idx = log.findIndex(e => e.id === entry.id)
            if (idx >= 0) log[idx] = entry
            else log.push(entry)
            return { ...m, actionLog: log }
          }),
      })
      finalize({
        role: 'assistant',
        content: result.message || (result.diff.length ? t.cmd.done : t.cmd.noop),
        diff: result.diff,
        snapshot: result.snapshot,
        pending: result.pending,
      })
      if (!authUser) {
        getGuestQuota().then(setGuestQuota).catch(() => {})
        if (result.diff.length && !nudgedRef.current) {
          nudgedRef.current = true
          setMessages(ms => [...ms, { role: 'assistant', system: true, nudge: true, content: t.assistant.nudge }])
        }
      }
    } catch (err) {
      console.error(err)
      if (err.code === 'auth_required') {
        finalize({ role: 'assistant', content: t.account.needLogin })
        window.dispatchEvent(new CustomEvent('open-login'))
      } else if (err.code === 'guest_trial_exhausted') {
        finalize({ role: 'assistant', content: t.account.trialExhausted })
        window.dispatchEvent(new CustomEvent('open-login'))
      } else if (err.code === 'quota_exceeded') {
        finalize({ role: 'assistant', content: t.account.quotaExceeded, error: true })
      } else {
        finalize({ role: 'assistant', content: t.ai.error, error: true, retriable: true })
      }
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

  const resolvePending = (idx, accept) => {
    setMessages(ms =>
      ms.map((m, i) => {
        if (i !== idx || !m.pending) return m
        if (accept) {
          const before = onApplyPending(m.pending)
          return { ...m, pending: null, resolved: 'accepted', snapshot: before }
        }
        return { ...m, pending: null, resolved: 'rejected' }
      }),
    )
  }

  const focusSection = label => window.dispatchEvent(new CustomEvent('canvas-focus', { detail: label }))

  // context-aware suggestions: empty resume / has findings / default
  const suggestions = useMemo(() => {
    const r = doc.resume
    const empty = !r.basics.name && !r.experience.length && !r.basics.summary
    if (empty) return t.assistant.suggestionsEmpty
    const list = [...t.assistant.suggestions]
    if (report.findings.length) list.unshift(`${t.assistant.fixPrefix}${report.findings[0].message}`)
    return list.slice(0, 4)
  }, [doc.resume, report, t])

  const scoreColor = report.score >= 85 ? '#12b76a' : report.score >= 65 ? '#f59e0b' : '#ef4444'

  return (
    <aside className="assistant" data-testid="assistant">
      {report.findings.length > 0 && (
        <div className="assistant-health" onClick={() => setShowFindings(v => !v)}>
          <span className="assistant-score" style={{ color: scoreColor }}>
            {report.score}
          </span>
          <span className="assistant-health-text">{t.assistant.findings(report.findings.length)}</span>
          <span className="assistant-health-toggle">{showFindings ? '▾' : '▸'}</span>
        </div>
      )}
      {!authUser && guestQuota && (
        <div className="guest-chip" data-testid="guest-chip">
          <span>{t.assistant.guestMode(guestQuota.remaining)}</span>
          <button onClick={() => window.dispatchEvent(new CustomEvent('open-login'))}>{t.account.login}</button>
        </div>
      )}
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
          <div
            key={i}
            className={`coach-msg coach-msg-${m.role} ${m.error ? 'coach-msg-error' : ''} ${m.nudge ? 'coach-msg-nudge' : ''}`}
          >
            {m.role === 'assistant' && !m.nudge && <span className="assistant-avatar">✦</span>}
            <div className="coach-msg-body">
              {(m.content || m.streaming) && (
                <div className={`coach-bubble ${m.streaming ? 'streaming' : ''}`}>
                  {m.role === 'assistant' && m.content ? (
                    <BubbleText text={m.content} />
                  ) : (
                    m.content || (m.streaming ? t.coach.thinking : '')
                  )}
                </div>
              )}
              {m.actionLog?.length > 0 && (
                <div className="action-log">
                  {m.actionLog.map(entry => (
                    <ActionRow key={entry.id} entry={entry} />
                  ))}
                </div>
              )}
              {!m.streaming && (
                <DiffCard
                  t={t}
                  msg={m}
                  onUndo={() => undoTurn(i)}
                  onAccept={() => resolvePending(i, true)}
                  onReject={() => resolvePending(i, false)}
                  onFocusSection={focusSection}
                />
              )}
              {m.error && m.retriable && lastUserRef.current && (
                <button className="btn btn-small" onClick={() => send(lastUserRef.current)}>
                  {t.agent.retry}
                </button>
              )}
              {m.nudge && (
                <button
                  className="btn btn-small nudge-cta"
                  onClick={() => window.dispatchEvent(new CustomEvent('open-login'))}
                >
                  {t.assistant.nudgeCta}
                </button>
              )}
            </div>
          </div>
        ))}
        {messages.filter(m => m.role === 'user').length === 0 && !busy && (
          <div className="assistant-suggestions">
            {suggestions.map((sug, i) => (
              <button key={i} className="track-chip" onClick={() => send(sug)}>
                {sug}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="assistant-footer">
        <div className="review-toggle" title={t.agent.reviewHint}>
          <button className={reviewMode === 'auto' ? 'active' : ''} onClick={() => onToggleReviewMode('auto')}>
            {t.agent.reviewAuto}
          </button>
          <button
            className={reviewMode === 'confirm' ? 'active' : ''}
            data-testid="review-confirm"
            onClick={() => onToggleReviewMode('confirm')}
          >
            {t.agent.reviewConfirm}
          </button>
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
      </div>
    </aside>
  )
}
