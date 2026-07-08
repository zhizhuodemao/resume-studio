import { useState } from 'react'
import { SAMPLE_TRACKS, hasStage } from '../samples/index.js'

export default function Onboarding({ t, lang, onPatch, onStart, onSkip }) {
  const [track, setTrack] = useState('tech')
  const [stage, setStage] = useState('social')
  const [jd, setJd] = useState('')

  const pickTrack = tr => {
    setTrack(tr)
    if (!hasStage(tr, stage)) setStage('social')
  }

  return (
    <div className="onboard-overlay" role="dialog" aria-modal="true">
      <div className="onboard-card">
        <button className="btn btn-ghost onboard-lang" onClick={() => onPatch({ lang: lang === 'zh' ? 'en' : 'zh' })}>
          {t.language}
        </button>
        <div className="onboard-head">
          <div className="brand-mark">R</div>
          <div>
            <h1 className="onboard-title">{t.onboarding.title}</h1>
            <p className="onboard-subtitle">{t.onboarding.subtitle}</p>
          </div>
        </div>

        <div className="onboard-label">{t.samplePanel.direction}</div>
        <div className="onboard-tracks">
          {SAMPLE_TRACKS.map(tr => (
            <button key={tr} className={`track-chip ${track === tr ? 'active' : ''}`} onClick={() => pickTrack(tr)}>
              {t.tracks[tr]}
            </button>
          ))}
        </div>

        <div className="onboard-label">{t.samplePanel.stage}</div>
        <div className="segmented onboard-stage">
          {['social', 'campus'].filter(st => hasStage(track, st)).map(st => (
            <button key={st} className={stage === st ? 'active' : ''} onClick={() => setStage(st)}>
              {t.stages[st]}
            </button>
          ))}
        </div>

        <div className="onboard-label">{t.onboarding.jdLabel}</div>
        <textarea
          className="onboard-jd"
          rows={3}
          value={jd}
          placeholder={t.onboarding.jdPlaceholder}
          onChange={e => setJd(e.target.value)}
        />

        <div className="onboard-actions">
          <button className="btn btn-primary" onClick={() => onStart(track, stage, jd.trim())}>
            {t.onboarding.start}
          </button>
          <button className="btn btn-ghost" onClick={onSkip}>
            {t.onboarding.skip}
          </button>
        </div>
      </div>
    </div>
  )
}
