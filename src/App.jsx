import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MESSAGES } from './i18n.js'
import { emptyResume } from './sampleData.js'
import { getSample, getPlaceholders, recommendedTemplate, SAMPLE_TRACKS } from './samples/index.js'
import {
  loadPersistedState,
  savePersistedState,
  makeDoc,
  serializeDoc,
  parseImport,
} from './store.js'
import Toolbar from './components/Toolbar.jsx'
import Editor from './components/Editor.jsx'
import Preview from './components/Preview.jsx'
import Onboarding from './components/Onboarding.jsx'
import Resume, { TEMPLATE_IDS } from './templates/Resume.jsx'
import { translateResume } from './ai.js'

let loadedFresh = false

function initialState() {
  let state = loadPersistedState()
  loadedFresh = !state
  if (!state) {
    const lang = navigator.language?.startsWith('zh') ? 'zh' : 'en'
    const doc = makeDoc({
      name: lang === 'zh' ? '我的简历' : 'My Resume',
      resume: getSample('tech', 'social', lang),
      template: 'modern',
      track: 'tech',
    })
    state = { version: 2, lang, activeId: doc.id, resumes: [doc] }
  }

  // Optional URL overrides apply to the active document,
  // e.g. ?template=minimal&lang=en&accent=%23e11d48&size=l&density=compact&track=design&stage=campus
  const params = new URLSearchParams(window.location.search)
  const patchActive = partial => {
    state = {
      ...state,
      resumes: state.resumes.map(d => (d.id === state.activeId ? { ...d, ...partial } : d)),
    }
  }
  const active = () => state.resumes.find(d => d.id === state.activeId)

  const template = params.get('template')
  const lang = params.get('lang')
  const accent = params.get('accent')
  const font = params.get('font')
  const size = params.get('size')
  const density = params.get('density')
  const trackParam = params.get('track')

  if (template && TEMPLATE_IDS.includes(template)) patchActive({ template })
  if (lang && ['zh', 'en'].includes(lang)) {
    state = { ...state, lang }
    if (loadedFresh) patchActive({ resume: getSample(active().track || 'tech', 'social', lang) })
  }
  if (accent && /^#[0-9a-fA-F]{6}$/.test(accent)) patchActive({ accent })
  const paper = params.get('paper')
  if (paper && ['a4', 'letter'].includes(paper)) patchActive({ page: { ...active().page, size: paper } })
  const marginParam = params.get('margin')
  if (marginParam && ['compact', 'normal', 'relaxed'].includes(marginParam))
    patchActive({ page: { ...active().page, margin: marginParam } })
  if (font && ['default', 'sans', 'serif', 'kai', 'fang'].includes(font))
    patchActive({ typography: { ...active().typography, font } })
  if (size && ['s', 'm', 'l'].includes(size)) patchActive({ typography: { ...active().typography, size } })
  if (density && ['compact', 'normal', 'relaxed'].includes(density))
    patchActive({ typography: { ...active().typography, density } })
  if (trackParam && SAMPLE_TRACKS.includes(trackParam)) {
    const stage = ['social', 'campus'].includes(params.get('stage')) ? params.get('stage') : 'social'
    patchActive({ track: trackParam })
    if (loadedFresh) {
      patchActive({ resume: getSample(trackParam, stage, state.lang) })
      if (!template) patchActive({ template: recommendedTemplate(trackParam, stage) })
    }
  }
  return state
}

function shouldShowOnboarding() {
  const params = new URLSearchParams(window.location.search)
  if (params.get('onboarding') === '1') return true
  if (params.get('onboarding') === '0') return false
  const hasOverride = ['template', 'lang', 'accent', 'font', 'size', 'density', 'menu', 'track'].some(k =>
    params.get(k),
  )
  return loadedFresh && !hasOverride
}

const HISTORY_LIMIT = 60
const HISTORY_COALESCE_MS = 700

export default function App() {
  const [state, setState] = useState(initialState)
  const [onboarding, setOnboarding] = useState(shouldShowOnboarding)
  const { lang, resumes, activeId } = state
  const active = resumes.find(d => d.id === activeId) || resumes[0]
  const t = MESSAGES[lang]
  const [savedAt, setSavedAt] = useState(null)
  const saveTimer = useRef(null)

  /* ---------- Persistence ---------- */
  useEffect(() => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      try {
        savePersistedState(state)
        setSavedAt(new Date())
      } catch {
        /* storage full — keep editing without autosave */
      }
    }, 400)
    return () => clearTimeout(saveTimer.current)
  }, [state])

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
    document.title = lang === 'zh' ? '简历工坊 · Resume Studio' : 'Resume Studio · 简历工坊'
  }, [lang])

  // Print with the document's name so the suggested PDF filename is right.
  useEffect(() => {
    const before = () => {
      if (active?.name) document.title = active.name
    }
    const after = () => {
      document.title = lang === 'zh' ? '简历工坊 · Resume Studio' : 'Resume Studio · 简历工坊'
    }
    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)
    return () => {
      window.removeEventListener('beforeprint', before)
      window.removeEventListener('afterprint', after)
    }
  }, [active?.name, lang])

  /* ---------- Doc mutation helpers ---------- */
  // Latest state snapshot for handlers that must read state outside setState
  // updaters (updaters must stay pure — StrictMode double-invokes them).
  const stateRef = useRef(state)
  stateRef.current = state

  const patch = useCallback(partial => setState(s => ({ ...s, ...partial })), [])

  const patchDoc = useCallback(partial => {
    setState(s => ({
      ...s,
      resumes: s.resumes.map(d =>
        d.id === s.activeId ? { ...d, ...partial, updatedAt: new Date().toISOString() } : d,
      ),
    }))
  }, [])

  /* ---------- Undo / redo ---------- */
  const historyRef = useRef({ docId: null, undo: [], redo: [], last: 0 })
  const [, bumpHistory] = useState(0)

  const ensureHistoryDoc = useCallback(id => {
    const h = historyRef.current
    if (h.docId !== id) {
      h.docId = id
      h.undo = []
      h.redo = []
      h.last = 0
    }
  }, [])

  const pushHistory = useCallback(
    (docId, resumeSnapshot) => {
      ensureHistoryDoc(docId)
      const h = historyRef.current
      const now = Date.now()
      if (now - h.last > HISTORY_COALESCE_MS) {
        h.undo.push(resumeSnapshot)
        if (h.undo.length > HISTORY_LIMIT) h.undo.shift()
      }
      h.last = now
      h.redo = []
      bumpHistory(v => v + 1)
    },
    [ensureHistoryDoc],
  )

  const setResume = useCallback(
    updater => {
      const s = stateRef.current
      const doc = s.resumes.find(d => d.id === s.activeId)
      if (!doc) return
      pushHistory(s.activeId, doc.resume)
      setState(cur => ({
        ...cur,
        resumes: cur.resumes.map(d =>
          d.id === cur.activeId
            ? {
                ...d,
                resume: typeof updater === 'function' ? updater(d.resume) : updater,
                updatedAt: new Date().toISOString(),
              }
            : d,
        ),
      }))
    },
    [pushHistory],
  )

  const undo = useCallback(() => {
    const s = stateRef.current
    const h = historyRef.current
    if (h.docId !== s.activeId || !h.undo.length) return
    const doc = s.resumes.find(d => d.id === s.activeId)
    if (!doc) return
    const prev = h.undo.pop()
    h.redo.push(doc.resume)
    h.last = 0
    setState(cur => ({
      ...cur,
      resumes: cur.resumes.map(d => (d.id === cur.activeId ? { ...d, resume: prev } : d)),
    }))
    bumpHistory(v => v + 1)
  }, [])

  const redo = useCallback(() => {
    const s = stateRef.current
    const h = historyRef.current
    if (h.docId !== s.activeId || !h.redo.length) return
    const doc = s.resumes.find(d => d.id === s.activeId)
    if (!doc) return
    const next = h.redo.pop()
    h.undo.push(doc.resume)
    h.last = 0
    setState(cur => ({
      ...cur,
      resumes: cur.resumes.map(d => (d.id === cur.activeId ? { ...d, resume: next } : d)),
    }))
    bumpHistory(v => v + 1)
  }, [])

  useEffect(() => {
    const onKey = e => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return
      const el = e.target
      // Let native text-undo win inside inputs; global undo covers structural edits.
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  const historyState = historyRef.current
  const canUndo = historyState.docId === activeId && historyState.undo.length > 0
  const canRedo = historyState.docId === activeId && historyState.redo.length > 0

  /* ---------- AI translate state (declared early: doc ops reset it) ---------- */
  const [translating, setTranslating] = useState(false)
  const [translateBackup, setTranslateBackup] = useState(null)

  /* ---------- Multi-resume operations ---------- */
  const switchDoc = useCallback(id => {
    setTranslateBackup(null)
    setState(s => (s.resumes.some(d => d.id === id) ? { ...s, activeId: id } : s))
  }, [])

  const createDoc = useCallback(() => {
    const doc = makeDoc({ name: t.docs.untitled, resume: emptyResume() })
    setState(s => ({ ...s, resumes: [...s.resumes, doc], activeId: doc.id }))
  }, [t])

  const duplicateDoc = useCallback(() => {
    setState(s => {
      const doc = s.resumes.find(d => d.id === s.activeId)
      if (!doc) return s
      const copy = makeDoc({ ...doc, name: `${doc.name || t.docs.untitled} ${t.docs.copySuffix}` })
      return { ...s, resumes: [...s.resumes, copy], activeId: copy.id }
    })
  }, [t])

  const renameDoc = useCallback(() => {
    const name = window.prompt(t.docs.renamePrompt, active?.name || '')
    if (name === null) return
    patchDoc({ name: name.trim() })
  }, [t, active, patchDoc])

  const deleteDoc = useCallback(() => {
    if (!window.confirm(t.docs.confirmDelete)) return
    setState(s => {
      const rest = s.resumes.filter(d => d.id !== s.activeId)
      if (rest.length === 0) {
        const doc = makeDoc({ name: t.docs.untitled, resume: emptyResume() })
        return { ...s, resumes: [doc], activeId: doc.id }
      }
      return { ...s, resumes: rest, activeId: rest[0].id }
    })
  }, [t])

  const exportDocFile = useCallback(() => {
    if (!active) return
    const blob = new Blob([serializeDoc(active)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${active.name || 'resume'}.resume.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [active])

  const importDocFile = useCallback(
    async file => {
      if (!file) return
      try {
        const text = await file.text()
        const doc = parseImport(text)
        if (!doc.name) doc.name = file.name.replace(/\.(resume\.)?json$/i, '') || t.docs.untitled
        setState(s => ({ ...s, resumes: [...s.resumes, doc], activeId: doc.id }))
      } catch {
        window.alert(t.docs.importError)
      }
    },
    [t],
  )

  /* ---------- Samples / clear / export ---------- */
  const applySample = useCallback(
    (nextTrack, stage, withConfirm = true) => {
      if (withConfirm && !window.confirm(t.confirmSample)) return
      const s = stateRef.current
      const doc = s.resumes.find(d => d.id === s.activeId)
      if (!doc) return
      pushHistory(s.activeId, doc.resume)
      const sample = getSample(nextTrack, stage, s.lang)
      const template = recommendedTemplate(nextTrack, stage)
      setState(cur => ({
        ...cur,
        resumes: cur.resumes.map(d =>
          d.id === cur.activeId
            ? { ...d, track: nextTrack, template, resume: sample, updatedAt: new Date().toISOString() }
            : d,
        ),
      }))
    },
    [t, pushHistory],
  )

  const handleClear = () => {
    if (window.confirm(t.confirmClear)) setResume(emptyResume())
  }
  const handleExport = () => window.print()

  /* ---------- AI translate ---------- */
  const handleTranslate = async target => {
    if (translating || !active) return
    if (!window.confirm(t.ai.confirmTranslate)) return
    setTranslating(true)
    try {
      const translated = await translateResume(active.resume, target)
      setTranslateBackup(active.resume)
      setResume(translated)
    } catch (err) {
      console.error(err)
      window.alert(t.ai.error)
    } finally {
      setTranslating(false)
    }
  }
  const handleUndoTranslate = () => {
    if (!translateBackup) return
    setResume(translateBackup)
    setTranslateBackup(null)
  }

  /* ---------- Page fit (one-page compression) ---------- */
  const handleFitToggle = useCallback(
    (contentHeight, pageHeight) => {
      const s = stateRef.current
      const doc = s.resumes.find(d => d.id === s.activeId)
      if (!doc) return
      const fitActive = doc.page.fitScale < 1
      if (fitActive) {
        patchDoc({ page: { ...doc.page, fitScale: 1 } })
        return
      }
      // contentHeight was measured at fitScale=1; shrink typography until it fits
      const scale = Math.max(0.75, Math.min(1, (pageHeight - 4) / contentHeight))
      if (scale >= 0.995) return
      patchDoc({ page: { ...doc.page, fitScale: Math.round(scale * 100) / 100 } })
    },
    [patchDoc],
  )

  const placeholders = useMemo(() => getPlaceholders(active?.track, lang), [active?.track, lang])

  const resumeNode = useMemo(
    () =>
      active ? (
        <Resume
          template={active.template}
          resume={active.resume}
          accent={active.accent}
          typography={active.typography}
          page={active.page}
          t={t}
        />
      ) : null,
    [active, t],
  )

  if (!active) return null

  return (
    <>
      <div className="app">
        <Toolbar
          t={t}
          lang={lang}
          template={active.template}
          accent={active.accent}
          typography={active.typography}
          page={active.page}
          track={active.track}
          savedAt={savedAt}
          onPatch={patch}
          onPatchDoc={patchDoc}
          docs={resumes}
          activeDoc={active}
          onSwitchDoc={switchDoc}
          onCreateDoc={createDoc}
          onDuplicateDoc={duplicateDoc}
          onRenameDoc={renameDoc}
          onDeleteDoc={deleteDoc}
          onExportDoc={exportDocFile}
          onImportDoc={importDocFile}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          onApplySample={applySample}
          onClear={handleClear}
          onExport={handleExport}
          onTranslate={handleTranslate}
          translating={translating}
          canUndoTranslate={Boolean(translateBackup)}
          onUndoTranslate={handleUndoTranslate}
        />
        <div className="app-body">
          <Editor t={t} resume={active.resume} setResume={setResume} placeholders={placeholders} />
          <Preview t={t} page={active.page} onFitToggle={handleFitToggle}>
            {resumeNode}
          </Preview>
        </div>
      </div>
      {active.page.size === 'letter' && <style>{'@media print { @page { size: letter; margin: 0 } }'}</style>}
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
