import { useMemo, useState } from 'react'
import { checkResume } from '../checker.js'
import { matchJD, tailorResume } from '../ai.js'

function ScoreRing({ score }) {
  const color = score >= 85 ? '#12b76a' : score >= 65 ? '#f59e0b' : '#ef4444'
  const r = 34
  const c = 2 * Math.PI * r
  return (
    <div className="score-ring">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#eceef2" strokeWidth="8" />
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * c} ${c}`}
          transform="rotate(-90 44 44)"
        />
      </svg>
      <span className="score-num" style={{ color }}>
        {score}
      </span>
    </div>
  )
}

const LEVEL_ORDER = ['error', 'warn', 'info']

export default function Insight({ t, lang, resume, sectionsLabel, onCreateTailored, onClose }) {
  const [tab, setTab] = useState('check')
  const [jd, setJd] = useState('')
  const [jdState, setJdState] = useState('idle') // idle | loading | done | error
  const [jdResult, setJdResult] = useState(null)
  const [tailorState, setTailorState] = useState('idle') // idle | loading | done | error

  const report = useMemo(() => checkResume(resume, lang), [resume, lang])

  const runJD = async () => {
    if (!jd.trim() || jdState === 'loading') return
    setJdState('loading')
    try {
      setJdResult(await matchJD(resume, jd, lang))
      setJdState('done')
    } catch (err) {
      console.error(err)
      setJdState('error')
    }
  }

  const runTailor = async () => {
    if (tailorState === 'loading') return
    setTailorState('loading')
    try {
      const tailored = await tailorResume(resume, jd, lang)
      onCreateTailored(tailored)
      setTailorState('done')
    } catch (err) {
      console.error(err)
      setTailorState('error')
    }
  }

  return (
    <div className="insight-drawer" data-testid="insight-drawer">
      <div className="insight-head">
        <div className="segmented">
          <button className={tab === 'check' ? 'active' : ''} onClick={() => setTab('check')}>
            {t.insight.tabCheck}
          </button>
          <button className={tab === 'jd' ? 'active' : ''} onClick={() => setTab('jd')}>
            {t.insight.tabJD}
          </button>
        </div>
        <button className="icon-btn" title={t.insight.close} onClick={onClose}>
          ✕
        </button>
      </div>

      {tab === 'check' && (
        <div className="insight-body">
          <div className="insight-score">
            <ScoreRing score={report.score} />
            <div className="insight-score-meta">
              <div className="insight-score-label">{t.insight.score}</div>
              <div className="insight-stats">
                {t.insight.quantStat(report.stats.quantified, report.stats.totalLines)}
              </div>
            </div>
          </div>
          {report.findings.length === 0 ? (
            <p className="insight-empty">{t.insight.empty}</p>
          ) : (
            LEVEL_ORDER.map(level => {
              const items = report.findings.filter(f => f.level === level)
              if (!items.length) return null
              return (
                <div className="insight-group" key={level}>
                  <h3 className={`insight-level insight-level-${level}`}>{t.insight.levels[level]}</h3>
                  <ul>
                    {items.map((f, i) => (
                      <li key={i}>
                        <span className="insight-sec">{sectionsLabel(f.section)}</span>
                        {f.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })
          )}
        </div>
      )}

      {tab === 'jd' && (
        <div className="insight-body">
          <textarea
            className="jd-input"
            rows={7}
            placeholder={t.insight.jdPlaceholder}
            value={jd}
            onChange={e => setJd(e.target.value)}
          />
          <button className="btn btn-primary jd-run" disabled={jdState === 'loading' || !jd.trim()} onClick={runJD}>
            {jdState === 'loading' ? t.insight.analyzing : jdResult ? t.insight.rerun : t.insight.analyze}
          </button>
          {jdState === 'error' && <p className="ai-error">{t.ai.error}</p>}
          {jdResult && jdState === 'done' && (
            <div className="jd-result">
              <div className="insight-score">
                <ScoreRing score={jdResult.score} />
                <div className="insight-score-meta">
                  <div className="insight-score-label">{t.insight.matchScore}</div>
                </div>
              </div>
              {jdResult.missing_keywords.length > 0 && (
                <div className="insight-group">
                  <h3 className="insight-level insight-level-warn">{t.insight.missing}</h3>
                  <div className="jd-chips">
                    {jdResult.missing_keywords.map((k, i) => (
                      <span className="jd-chip" key={i}>
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {jdResult.strengths.length > 0 && (
                <div className="insight-group">
                  <h3 className="insight-level insight-level-ok">{t.insight.strengths}</h3>
                  <ul>
                    {jdResult.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {jdResult.suggestions.length > 0 && (
                <div className="insight-group">
                  <h3 className="insight-level insight-level-info">{t.insight.suggestions}</h3>
                  <ul>
                    {jdResult.suggestions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              <button
                className="btn btn-primary jd-run"
                disabled={tailorState === 'loading'}
                onClick={runTailor}
                data-testid="tailor-btn"
              >
                {tailorState === 'loading' ? t.insight.tailoring : `✨ ${t.insight.tailor}`}
              </button>
              {tailorState === 'done' && <p className="insight-empty">{t.insight.tailored}</p>}
              {tailorState === 'error' && <p className="ai-error">{t.ai.error}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
