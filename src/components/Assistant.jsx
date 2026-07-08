import { useEffect, useMemo, useRef, useState } from 'react'
import { checkResume } from '../checker.js'
import { vaultStats } from '../vault.js'
import { matchJD } from '../ai.js'
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

// Step checklist for big tasks (plan_steps / mark_step_done tools).
function PlanCard({ t, plan }) {
  if (!plan?.steps?.length) return null
  const done = plan.ticks.filter(Boolean).length
  return (
    <div className="plan-card" data-testid="plan-card">
      <div className="plan-head">
        {t.agent.plan} · {done}/{plan.steps.length}
      </div>
      {plan.steps.map((step, i) => (
        <div key={i} className={`plan-step ${plan.ticks[i] ? 'done' : ''}`}>
          <span className="plan-box">{plan.ticks[i] ? '✓' : ''}</span>
          {step}
        </div>
      ))}
    </div>
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
      if (rest.plan) rest.plan = { steps: rest.plan.steps, ticks: rest.plan.ticks }
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
  vault,
  authUser,
  onRunTurn,
  onUndoSnapshot,
  onApplyPending,
  onSaveJd,
  onSaveJdReport,
  reviewMode,
  onToggleReviewMode,
  panelWidth,
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
  const vstats = useMemo(() => vaultStats(vault || { stories: [] }), [vault])
  const [showVault, setShowVault] = useState(false)
  const [showJd, setShowJd] = useState(false)
  const [jdDraft, setJdDraft] = useState(doc.jd || '')
  const [jdBusy, setJdBusy] = useState(false)
  useEffect(() => setJdDraft(doc.jd || ''), [doc.id, doc.jd])
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
        const merged = last?.streaming ? { actionLog: last.actionLog, plan: last.plan, ...finalMsg } : finalMsg
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
        onPlan: steps => patchStreaming(m => ({ ...m, plan: { steps, ticks: steps.map(() => false) } })),
        onPlanTick: index =>
          patchStreaming(m =>
            m.plan ? { ...m, plan: { ...m.plan, ticks: m.plan.ticks.map((v, j) => (j === index ? true : v)) } } : m,
          ),
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

  const analyzeJd = async () => {
    const jd = jdDraft.trim()
    if (!jd || jdBusy) return
    onSaveJd(jd)
    setJdBusy(true)
    try {
      const jdReport = await matchJD(doc.resume, jd)
      onSaveJdReport(jdReport)
    } catch (err) {
      console.error(err)
      if (err.code === 'auth_required' || err.code === 'guest_trial_exhausted') {
        window.dispatchEvent(new CustomEvent('open-login'))
      }
    } finally {
      setJdBusy(false)
    }
  }

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
    <aside className="assistant" data-testid="assistant" style={panelWidth ? { width: panelWidth } : undefined}>
      <div className="status-strip">
        <button
          className={`strip-seg ${showFindings ? 'open' : ''}`}
          data-testid="health-btn"
          disabled={!report.findings.length}
          onClick={() => setShowFindings(v => !v)}
        >
          <span className="strip-label">{t.strip.health}</span>
          {report.findings.length ? (
            <>
              <span className="strip-value" style={{ color: scoreColor }}>
                {report.score}
              </span>
              <span className="strip-sub">{t.strip.issues(report.findings.length)}</span>
            </>
          ) : (
            <span className="strip-value strip-ok">✓</span>
          )}
        </button>
        <button
          className={`strip-seg ${showVault ? 'open' : ''}`}
          data-testid="vault-btn"
          onClick={() => setShowVault(v => !v)}
        >
          <span className="strip-label">{t.strip.vault}</span>
          <span className="strip-value">{vstats.total}</span>
          {vstats.metrics > 0 && <span className="strip-sub">{t.strip.metrics(vstats.metrics)}</span>}
        </button>
        <button
          className={`strip-seg ${showJd ? 'open' : ''} ${doc.jd ? 'strip-seg-set' : ''}`}
          data-testid="jd-btn"
          onClick={() => setShowJd(v => !v)}
        >
          <span className="strip-label">🎯</span>
          <span className="strip-value strip-jd">
            {doc.jd ? t.jdPanel.set : t.jdPanel.unset}
            {doc.jdReport ? ` · ${doc.jdReport.score}` : ''}
          </span>
        </button>
      </div>
      {!authUser && guestQuota && (
        <div className="guest-chip" data-testid="guest-chip">
          <span>{t.assistant.guestMode(guestQuota.remaining)}</span>
          <button onClick={() => window.dispatchEvent(new CustomEvent('open-login'))}>{t.account.login}</button>
        </div>
      )}
      {showVault && (
        <div className="assistant-findings vault-panel" data-testid="vault-panel">
          {(vault?.stories || []).length === 0 && <div className="vault-empty">{t.strip.vaultEmpty}</div>}
          {(vault?.stories || []).map(st => (
            <div key={st.id} className={`vault-row strength-${st.strength}`}>
              <span className="coverage-dot" />
              <span className="vault-title">{st.title}</span>
              <span className="vault-meta">
                {st.metrics.length > 0 ? t.strip.metrics(st.metrics.length) : t.strip[st.strength]}
              </span>
            </div>
          ))}
        </div>
      )}
      {showJd && (
        <div className="jd-panel" data-testid="jd-panel">
          <textarea
            rows={3}
            value={jdDraft}
            placeholder={t.jdPanel.placeholder}
            onChange={e => setJdDraft(e.target.value)}
          />
          <div className="jd-panel-actions">
            <button className="btn btn-small btn-primary" disabled={jdBusy || !jdDraft.trim()} onClick={analyzeJd}>
              {jdBusy ? t.insight.analyzing : t.jdPanel.analyze}
            </button>
            {doc.jdReport && <span className="jd-score">{t.insight.matchScore} {doc.jdReport.score}</span>}
          </div>
          {doc.jdReport?.missing_keywords?.length > 0 && (
            <div className="jd-keywords">
              <span className="jd-kw-label">{t.insight.missing}</span>
              {doc.jdReport.missing_keywords.slice(0, 8).map((kw, i) => (
                <button
                  key={i}
                  className="track-chip jd-kw"
                  onClick={() => {
                    setInput(t.jdPanel.weave(kw))
                    inputRef.current?.focus()
                  }}
                >
                  {kw}
                </button>
              ))}
            </div>
          )}
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
              {m.plan && <PlanCard t={t} plan={m.plan} />}
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
        {!busy && !messages[messages.length - 1]?.streaming && (
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
