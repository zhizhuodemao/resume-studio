import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MESSAGES } from './i18n.js'
import { emptyResume } from './sampleData.js'
import { getSample, getPlaceholders, recommendedTemplate, SAMPLE_TRACKS } from './samples/index.js'
import Toolbar from './components/Toolbar.jsx'
import Editor from './components/Editor.jsx'
import Preview from './components/Preview.jsx'
import Onboarding from './components/Onboarding.jsx'
import Resume, { TEMPLATE_IDS, DEFAULT_TYPOGRAPHY } from './templates/Resume.jsx'

const STORAGE_KEY = 'resume-studio-v1'

let loadedFresh = false

function loadState() {
  let state = null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.resume && parsed.resume.basics) state = parsed
    }
  } catch {
    /* corrupted storage — fall through to defaults */
  }
  const isFresh = !state
  loadedFresh = isFresh
  if (!state) {
    const lang = navigator.language?.startsWith('zh') ? 'zh' : 'en'
    state = { lang, template: 'modern', accent: '#2563eb', track: 'tech', resume: getSample('tech', 'social', lang) }
  }
  state.typography = { ...DEFAULT_TYPOGRAPHY, ...state.typography }
  state.track = state.track || 'tech'
  // Optional URL overrides, e.g. ?template=minimal&lang=en&accent=%23e11d48&size=l&density=compact
  const params = new URLSearchParams(window.location.search)
  const template = params.get('template')
  const lang = params.get('lang')
  const accent = params.get('accent')
  const font = params.get('font')
  const size = params.get('size')
  const density = params.get('density')
  if (template && TEMPLATE_IDS.includes(template)) state.template = template
  if (lang && ['zh', 'en'].includes(lang)) {
    state.lang = lang
    if (isFresh) state.resume = getSample(state.track, 'social', lang)
  }
  if (accent && /^#[0-9a-fA-F]{6}$/.test(accent)) state.accent = accent
  if (font && ['default', 'sans', 'serif'].includes(font)) state.typography.font = font
  if (size && ['s', 'm', 'l'].includes(size)) state.typography.size = size
  if (density && ['compact', 'normal', 'relaxed'].includes(density)) state.typography.density = density
  // ?track=design&stage=campus deep-links a sample (only replaces content on first visit)
  const trackParam = params.get('track')
  if (trackParam && SAMPLE_TRACKS.includes(trackParam)) {
    state.track = trackParam
    if (isFresh) {
      const stageParam = ['social', 'campus'].includes(params.get('stage')) ? params.get('stage') : 'social'
      state.resume = getSample(trackParam, stageParam, state.lang)
      if (!template) state.template = recommendedTemplate(trackParam, stageParam)
    }
  }
  return state
}

function shouldShowOnboarding() {
  const params = new URLSearchParams(window.location.search)
  if (params.get('onboarding') === '1') return true
  if (params.get('onboarding') === '0') return false
  const hasOverride = ['template', 'lang', 'accent', 'font', 'size', 'density', 'menu', 'track'].some(k => params.get(k))
  return loadedFresh && !hasOverride
}

export default function App() {
  const [state, setState] = useState(loadState)
  const [onboarding, setOnboarding] = useState(shouldShowOnboarding)
  const { lang, template, accent, resume, typography, track } = state
  const t = MESSAGES[lang]
  const [savedAt, setSavedAt] = useState(null)
  const saveTimer = useRef(null)

  useEffect(() => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
        setSavedAt(new Date())
      } catch {
        /* storage full (e.g. oversized photo) — keep editing without autosave */
      }
    }, 400)
    return () => clearTimeout(saveTimer.current)
  }, [state])

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
    document.title = lang === 'zh' ? '简历工坊 · Resume Studio' : 'Resume Studio · 简历工坊'
  }, [lang])

  const setResume = useCallback(updater => {
    setState(s => ({ ...s, resume: typeof updater === 'function' ? updater(s.resume) : updater }))
  }, [])

  const patch = useCallback(partial => setState(s => ({ ...s, ...partial })), [])

  const applySample = useCallback(
    (nextTrack, stage, withConfirm = true) => {
      if (withConfirm && !window.confirm(t.confirmSample)) return
      setState(s => ({
        ...s,
        track: nextTrack,
        template: recommendedTemplate(nextTrack, stage),
        resume: getSample(nextTrack, stage, s.lang),
      }))
    },
    [t],
  )

  const handleClear = () => {
    if (window.confirm(t.confirmClear)) setResume(emptyResume())
  }
  const handleExport = () => window.print()

  const placeholders = useMemo(() => getPlaceholders(track, lang), [track, lang])

  const resumeNode = useMemo(
    () => <Resume template={template} resume={resume} accent={accent} typography={typography} t={t} />,
    [template, resume, accent, typography, t],
  )

  return (
    <>
      <div className="app">
        <Toolbar
          t={t}
          lang={lang}
          template={template}
          accent={accent}
          typography={typography}
          track={track}
          savedAt={savedAt}
          onPatch={patch}
          onApplySample={applySample}
          onClear={handleClear}
          onExport={handleExport}
        />
        <div className="app-body">
          <Editor t={t} resume={resume} setResume={setResume} placeholders={placeholders} />
          <Preview t={t}>{resumeNode}</Preview>
        </div>
      </div>
      {onboarding && (
        <Onboarding
          t={t}
          lang={lang}
          onPatch={patch}
          onStart={(tr, stage) => {
            applySample(tr, stage, false)
            setOnboarding(false)
          }}
          onSkip={() => setOnboarding(false)}
        />
      )}
      {/* Untransformed copy used only by @media print */}
      <div id="print-root" aria-hidden="true">
        {resumeNode}
      </div>
    </>
  )
}
