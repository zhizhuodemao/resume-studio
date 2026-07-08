import { useEffect, useRef, useState } from 'react'
import { useSpeech, speechSupported, logAsrSample } from '../speech.js'
import { vaultStats } from '../vault.js'

// The Interview Stage: a full-screen focused surface for voice-first
// rapid Q&A. One big question per screen; the mic is the protagonist;
// receipts slide in; a live resume thumbnail grows at the corner.
// The session is continuous: it persists per document and resumes
// exactly where it stopped, across close and reload.

const stageKey = docId => `rs-stage-${docId}`

function loadSession(docId) {
  try {
    const raw = JSON.parse(localStorage.getItem(stageKey(docId)) || 'null')
    if (raw && Array.isArray(raw.messages) && raw.messages.length) return raw
  } catch {
    /* corrupted */
  }
  return null
}

export default function Stage({
  t,
  lang,
  doc,
  vault,
  onRunTurn,
  onClose,
  onSaveJd,
  onSetLang,
  onImportResume,
  resumeNode,
}) {
  const saved = useRef(loadSession(doc.id)).current
  const [phase, setPhase] = useState(saved || doc.jd || vault.stories.length ? 'live' : 'entry')
  const [entryMode, setEntryMode] = useState('jd') // jd | paste
  const [jdDraft, setJdDraft] = useState('')
  const [pasteDraft, setPasteDraft] = useState('')
  const [parsing, setParsing] = useState(false)
  const [messages, setMessages] = useState(saved?.messages || [])
  const [question, setQuestion] = useState(saved?.question || '')
  const [busy, setBusy] = useState(false)
  const [input, setInput] = useState('')
  const [receipts, setReceipts] = useState([])
  const [asked, setAsked] = useState(saved?.asked || 0)
  const [needLogin, setNeedLogin] = useState(false)
  const startStats = useRef(vaultStats(vault))
  const rawTranscriptRef = useRef('')
  const inputRef = useRef(null)

  const stats = vaultStats(vault)
  const mined = {
    stories: Math.max(0, stats.total - startStats.current.total),
    metrics: Math.max(0, stats.metrics - startStats.current.metrics),
  }

  // continuous session: persist during live, clear when finished
  useEffect(() => {
    if (phase === 'live' && messages.length) {
      try {
        localStorage.setItem(
          stageKey(doc.id),
          JSON.stringify({ messages: messages.slice(-20), question, asked }),
        )
      } catch {
        /* storage full */
      }
    }
    if (phase === 'summary') localStorage.removeItem(stageKey(doc.id))
  }, [phase, messages, question, asked, doc.id])

  const speech = useSpeech({
    lang: lang === 'zh' ? 'zh-CN' : 'en-US',
    onFinal: text => {
      rawTranscriptRef.current += text
      setInput(v => (v ? v + text : text))
    },
  })

  const runTurn = async userText => {
    setBusy(true)
    const history = [...messages, ...(userText ? [{ role: 'user', content: userText }] : [])]
    if (userText) setMessages(history)
    setQuestion('')
    try {
      const result = await onRunTurn(history, {
        onDelta: d => setQuestion(q => q + d),
        onAction: entry => {
          if (entry.status === 'done' && entry.receipt) {
            setReceipts(rs => [...rs.slice(-4), { id: entry.id, label: entry.label, detail: entry.receipt }])
          }
        },
      })
      const reply = result.message || ''
      setMessages(ms => [...ms, { role: 'assistant', content: reply }])
      setQuestion(reply)
      setAsked(n => n + 1)
    } catch (err) {
      console.error(err)
      if (err.code === 'auth_required' || err.code === 'guest_trial_exhausted') {
        setNeedLogin(true)
      } else {
        setQuestion(t.ai.error)
      }
    } finally {
      setBusy(false)
    }
  }

  // kick off the first question when entering live with no restored session
  const kickedRef = useRef(Boolean(saved))
  useEffect(() => {
    if (phase === 'live' && !kickedRef.current) {
      kickedRef.current = true
      runTurn(t.stage.kickoff)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const send = () => {
    const text = input.trim()
    if (!text || busy) return
    if (rawTranscriptRef.current) logAsrSample(rawTranscriptRef.current, text)
    rawTranscriptRef.current = ''
    speech.stop()
    setInput('')
    runTurn(text)
  }

  const finish = () => {
    speech.stop()
    setPhase('summary')
  }

  const startWithJd = () => {
    const jd = jdDraft.trim()
    if (jd) onSaveJd(jd)
    setPhase('live')
  }

  const startWithPaste = async () => {
    const text = pasteDraft.trim()
    if (!text || parsing) return
    setParsing(true)
    try {
      await onImportResume(text)
      setPhase('live')
    } catch (err) {
      console.error(err)
      if (err.code === 'auth_required' || err.code === 'guest_trial_exhausted') setNeedLogin(true)
    } finally {
      setParsing(false)
    }
  }

  const duration = useRef(Date.now())
  const minutes = Math.max(1, Math.round((Date.now() - duration.current) / 60000))

  return (
    <div className="stage" data-testid="stage">
      <header className="stage-top">
        <button className="icon-btn stage-exit" data-testid="stage-exit" onClick={onClose}>
          ✕
        </button>
        <span className="stage-progress">
          {phase === 'live' && asked > 0 ? t.stage.progress(asked) : ''}
        </span>
        <span className="stage-mined" data-testid="stage-mined">
          {t.stage.mined(mined.stories, mined.metrics)}
        </span>
      </header>

      {phase === 'entry' && (
        <div className="stage-entry">
          <div className="segmented stage-lang" data-testid="stage-lang">
            <button className={lang === 'zh' ? 'active' : ''} onClick={() => onSetLang('zh')}>
              中文
            </button>
            <button className={lang === 'en' ? 'active' : ''} onClick={() => onSetLang('en')}>
              English
            </button>
          </div>
          <h1 className="stage-title">{t.stage.entryTitle}</h1>
          <p className="stage-sub">{t.stage.entrySub}</p>

          {needLogin ? (
            <div className="stage-login-card">
              <p>{t.account.trialExhausted}</p>
              <button className="btn btn-primary" onClick={() => window.dispatchEvent(new CustomEvent('open-login'))}>
                {t.assistant.nudgeCta}
              </button>
            </div>
          ) : entryMode === 'jd' ? (
            <>
              <textarea
                className="stage-jd"
                data-testid="stage-jd"
                rows={6}
                placeholder={t.stage.jdPlaceholder}
                value={jdDraft}
                onChange={e => setJdDraft(e.target.value)}
              />
              <div className="stage-entry-actions">
                <button className="btn btn-primary stage-start" data-testid="stage-start" onClick={startWithJd}>
                  {jdDraft.trim() ? t.stage.startWithJd : t.stage.startPlain}
                </button>
              </div>
              <button className="stage-alt-link" data-testid="stage-paste-link" onClick={() => setEntryMode('paste')}>
                {t.stage.haveResume}
              </button>
            </>
          ) : (
            <>
              <textarea
                className="stage-jd"
                data-testid="stage-paste"
                rows={9}
                placeholder={t.stage.pastePlaceholder}
                value={pasteDraft}
                onChange={e => setPasteDraft(e.target.value)}
              />
              <div className="stage-entry-actions">
                <button
                  className="btn btn-primary stage-start"
                  data-testid="stage-parse"
                  disabled={parsing || !pasteDraft.trim()}
                  onClick={startWithPaste}
                >
                  {parsing ? t.stage.parsing : t.stage.parseStart}
                </button>
              </div>
              <button className="stage-alt-link" onClick={() => setEntryMode('jd')}>
                {t.stage.backToJd}
              </button>
            </>
          )}
        </div>
      )}

      {phase === 'live' && (
        <div className="stage-live">
          <div className="stage-question" data-testid="stage-question">
            {question || (busy ? <span className="stage-thinking">{t.coach.thinking}</span> : '')}
          </div>

          <div className="stage-receipts">
            {receipts.map(r => (
              <div className="stage-receipt" key={r.id}>
                <span className="cmd-spark">✦</span> {r.detail}
              </div>
            ))}
          </div>

          <div className="stage-answer">
            {needLogin ? (
              <div className="stage-login-card">
                <p>{t.account.trialExhausted}</p>
                <button
                  className="btn btn-primary"
                  onClick={() => window.dispatchEvent(new CustomEvent('open-login'))}
                >
                  {t.assistant.nudgeCta}
                </button>
              </div>
            ) : (
              <>
                <textarea
                  ref={inputRef}
                  data-testid="stage-input"
                  rows={2}
                  value={input + (speech.interim ? ` ${speech.interim}` : '')}
                  placeholder={speech.listening ? t.stage.listening : t.stage.answerPlaceholder}
                  disabled={busy}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      send()
                    }
                  }}
                />
                <div className="stage-controls">
                  {speechSupported() && (
                    <button
                      className={`stage-mic ${speech.listening ? 'listening' : ''}`}
                      data-testid="stage-mic"
                      disabled={busy}
                      onClick={() => (speech.listening ? speech.stop() : speech.start())}
                      title={speech.listening ? t.stage.micStop : t.stage.micStart}
                    >
                      {speech.listening ? '⏹' : '🎤'}
                    </button>
                  )}
                  <button className="btn btn-primary stage-send" disabled={busy || !input.trim()} onClick={send}>
                    {t.cmd.send}
                  </button>
                  <button className="btn btn-ghost stage-finish" data-testid="stage-finish" onClick={finish}>
                    {t.stage.finish}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {phase === 'summary' && (
        <div className="stage-summary" data-testid="stage-summary">
          <h2>{t.stage.summaryTitle}</h2>
          <div className="stage-summary-stats">
            <div>
              <b>{asked}</b>
              <span>{t.stage.statQuestions}</span>
            </div>
            <div>
              <b>{mined.stories}</b>
              <span>{t.stage.statStories}</span>
            </div>
            <div>
              <b>{mined.metrics}</b>
              <span>{t.stage.statMetrics}</span>
            </div>
            <div>
              <b>{minutes}</b>
              <span>{t.stage.statMinutes}</span>
            </div>
          </div>
          <p className="stage-summary-note">{t.stage.summaryNote}</p>
          <div className="stage-entry-actions">
            <button className="btn btn-primary" data-testid="stage-to-workbench" onClick={onClose}>
              {t.stage.toWorkbench}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                kickedRef.current = false
                setPhase('live')
                setMessages([])
                setQuestion('')
              }}
            >
              {t.stage.continueMining}
            </button>
          </div>
        </div>
      )}

      <div className="stage-thumb" aria-hidden="true">
        <div className="stage-thumb-page">{resumeNode}</div>
      </div>
    </div>
  )
}
