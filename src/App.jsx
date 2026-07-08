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
import ErrorBoundary from './components/ErrorBoundary.jsx'
import AppearancePanel from './components/AppearancePanel.jsx'
import Resume, { TEMPLATE_IDS } from './templates/Resume.jsx'
import { translateResume, tailorResume } from './ai.js'
import { downloadDocx, downloadText } from './exporters.js'
import * as api from './api.js'
import AccountModal from './components/AccountModal.jsx'
import { applyCommandAction } from './commander.js'
import { runAgentLoop } from './assistant.js'
import { diffDocs } from './diff.js'
import Assistant from './components/Assistant.jsx'

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
  const [refineTab, setRefineTab] = useState('content')
  const [mobileView, setMobileView] = useState('edit')
  const [refineOpen, setRefineOpen] = useState(false)
  const [pendingJd, setPendingJd] = useState(null)
  const [authUser, setAuthUser] = useState(null)
  const [loginOpen, setLoginOpen] = useState(false)
  const measureRef = useRef({ content: 0, page: 1123 })
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

  // Flush pending autosave on reload/close so debounce can't lose state
  useEffect(() => {
    const flush = () => {
      try {
        savePersistedState(stateRef.current)
      } catch {
        /* storage full */
      }
    }
    window.addEventListener('beforeunload', flush)
    return () => window.removeEventListener('beforeunload', flush)
  }, [])

  /* ---------- Account session ---------- */
  useEffect(() => {
    if (!api.getToken()) return
    api
      .me()
      .then(r => setAuthUser(r.user))
      .catch(err => {
        if (err.code === 'auth_required') api.clearToken()
      })
  }, [])

  useEffect(() => {
    const open = () => setLoginOpen(true)
    window.addEventListener('open-login', open)
    return () => window.removeEventListener('open-login', open)
  }, [])

  const handleAuthed = useCallback(
    async user => {
      setAuthUser(user)
      setLoginOpen(false)
      try {
        const cloud = await api.pullState()
        if (cloud?.state) {
          if (window.confirm(t.account.confirmLoadCloud)) {
            savePersistedState(cloud.state)
            // keep the unload flush from overwriting the restored state
            stateRef.current = cloud.state
            window.location.reload()
            return
          }
        }
        await api.pushState(stateRef.current)
      } catch (err) {
        console.error(err)
      }
    },
    [t],
  )

  const handleLogout = useCallback(() => {
    api.logout()
    setAuthUser(null)
  }, [])

  // Cloud push piggybacks on autosave (debounced a bit longer)
  const pushTimer = useRef(null)
  useEffect(() => {
    if (!authUser) return
    clearTimeout(pushTimer.current)
    pushTimer.current = setTimeout(() => {
      api.pushState(state).catch(err => console.error('cloud push failed', err))
    }, 1500)
    return () => clearTimeout(pushTimer.current)
  }, [state, authUser])

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

  /* ---------- Multi-resume operations ---------- */
  const switchDoc = useCallback(id => {
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

  /* ---------- Unified AI assistant (real agent loop) ---------- */
  const [reviewMode, setReviewMode] = useState(() => localStorage.getItem('rs-review-mode') || 'auto')
  const toggleReviewMode = useCallback(mode => {
    setReviewMode(mode)
    localStorage.setItem('rs-review-mode', mode)
  }, [])

  const snapshotOf = doc => ({
    template: doc.template,
    accent: doc.accent,
    typography: doc.typography,
    page: doc.page,
    resume: doc.resume,
    coverLetter: doc.coverLetter,
  })

  const runAssistantTurn = useCallback(
    async (history, callbacks) => {
      const s0 = stateRef.current
      const doc = s0.resumes.find(d => d.id === s0.activeId)
      if (!doc) return { message: '', diff: [], snapshot: null, pending: null }
      const before = snapshotOf(doc)
      const live = reviewMode === 'auto'
      let cur = { ...doc }
      let historyPushed = false
      let seq = 0

      const applyLive = () => {
        if (!historyPushed) {
          pushHistory(s0.activeId, before.resume)
          historyPushed = true
        }
        patchDoc(snapshotOf(cur))
      }

      const execute = async ({ name, args }) => {
        const actionId = `a${seq++}`
        if (name === 'translate_resume') {
          const target = args?.target === 'en' ? 'en' : 'zh'
          callbacks?.onAction?.({ id: actionId, label: t.cmd.labels.translate, status: 'running' })
          try {
            cur = { ...cur, resume: await translateResume(cur.resume, target) }
            if (live) applyLive()
            callbacks?.onAction?.({ id: actionId, label: t.cmd.labels.translate, status: 'done' })
            return { ok: true, changed: ['resume'] }
          } catch (err) {
            console.error(err)
            callbacks?.onAction?.({ id: actionId, label: t.cmd.labels.translate, status: 'failed' })
            return { ok: false, hint: '翻译服务出错' }
          }
        }
        if (name === 'create_tailored_version') {
          if (typeof args?.jd !== 'string' || !args.jd.trim()) return { ok: false, hint: '缺少 jd 参数' }
          callbacks?.onAction?.({ id: actionId, label: t.cmd.labels.tailored, status: 'running' })
          try {
            const tailored = await tailorResume(cur.resume, args.jd, s0.lang)
            const copy = makeDoc({
              ...cur,
              name: `${doc.name || t.docs.untitled} · ${t.docs.tailoredSuffix}`,
              resume: tailored,
            })
            setState(prev => ({ ...prev, resumes: [...prev.resumes, copy], activeId: copy.id }))
            callbacks?.onAction?.({ id: actionId, label: t.cmd.labels.tailored, status: 'done' })
            return { ok: true, changed: ['tailored_doc'] }
          } catch (err) {
            console.error(err)
            callbacks?.onAction?.({ id: actionId, label: t.cmd.labels.tailored, status: 'failed' })
            return { ok: false, hint: '定制生成失败' }
          }
        }
        const res = applyCommandAction(cur, { name, args }, t)
        if (!res) {
          callbacks?.onAction?.({ id: actionId, label: `${name}`, status: 'failed' })
          return {
            ok: false,
            hint: '未产生任何修改：字段不支持、序号不存在或内容与原文相同。对照摘要中的 工作[i]/项目[i]/教育[i] 序号。',
          }
        }
        cur = res.doc
        if (live) applyLive()
        callbacks?.onAction?.({ id: actionId, label: res.label, status: 'done' })
        if (res.wantsFit) {
          setTimeout(() => {
            const m = measureRef.current
            if (m.content > m.page) {
              const scale = Math.max(0.75, Math.min(1, (m.page - 4) / m.content))
              if (scale < 0.995) patchDoc({ page: { ...cur.page, fitScale: Math.round(scale * 100) / 100 } })
            }
          }, 450)
        }
        return { ok: true, changed: res.label.split('、') }
      }

      let { message } = await runAgentLoop({
        history,
        getDoc: () => doc,
        t,
        uiLang: s0.lang,
        execute,
        callbacks,
      })

      // Insurance: model narrated "updated" without any effective action
      const CLAIM = /已(更新|修改|切换|调整|写入|替换|完成)|updated|changed|switched/i
      if (!diffDocs(before, cur, t).length && CLAIM.test(message)) {
        callbacks?.onDelta?.('\n\n')
        const retry = await runAgentLoop({
          history: [...history, { role: 'assistant', content: message }, { role: 'user', content: t.assistant.actNudge }],
          getDoc: () => doc,
          t,
          uiLang: s0.lang,
          execute,
          callbacks,
        })
        if (retry.message) message = retry.message
      }

      const diff = diffDocs(before, cur, t)
      const changedSections = [...new Set(diff.map(r => r.section.split(' · ')[0]))]
      if (diff.length && live) {
        window.dispatchEvent(new CustomEvent('ai-updated', { detail: { labels: changedSections } }))
      }
      return {
        message,
        diff,
        snapshot: diff.length && live ? before : null,
        pending: diff.length && !live ? snapshotOf(cur) : null,
      }
    },
    [t, reviewMode, pushHistory, patchDoc],
  )

  const handleApplyPending = useCallback(
    pending => {
      const s0 = stateRef.current
      const doc = s0.resumes.find(d => d.id === s0.activeId)
      if (!doc) return null
      const before = snapshotOf(doc)
      pushHistory(s0.activeId, before.resume)
      patchDoc(pending)
      const changed = [...new Set(diffDocs(before, pending, t).map(r => r.section.split(' · ')[0]))]
      window.dispatchEvent(new CustomEvent('ai-updated', { detail: { labels: changed } }))
      return before
    },
    [t, pushHistory, patchDoc],
  )

  const handleUndoSnapshot = useCallback(snapshot => patchDoc(snapshot), [patchDoc])

  // Clicking a section on the canvas opens refine mode at that card.
  const handleSectionClick = useCallback(title => {
    setRefineOpen(true)
    setTimeout(() => {
      for (const card of document.querySelectorAll('.editor .section-card')) {
        const el = card.querySelector('.section-title, .section-title-input')
        const name = (el?.value ?? el?.textContent ?? '').trim()
        if (name && name === title) {
          card.scrollIntoView({ behavior: 'smooth', block: 'start' })
          card.classList.add('flash')
          setTimeout(() => card.classList.remove('flash'), 1200)
          break
        }
      }
    }, 80)
  }, [])

  /* ---------- Exports ---------- */
  const handleExportDocx = () => active && downloadDocx(active.resume, t, active.name || 'resume')
  const handleExportText = () => active && downloadText(active.resume, t, active.name || 'resume')
  const handleChangeCover = useCallback(cover => patchDoc({ coverLetter: cover }), [patchDoc])

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

  const coverNode =
    active && active.coverLetter?.enabled && active.coverLetter.content.trim() ? (
      <Resume
        template={active.template}
        resume={active.resume}
        accent={active.accent}
        typography={active.typography}
        page={active.page}
        t={t}
        cover
        coverContent={active.coverLetter.content}
      />
    ) : null

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
          onExportDocx={handleExportDocx}
          onExportText={handleExportText}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          onApplySample={applySample}
          onClear={handleClear}
          onExport={handleExport}
          refineOpen={refineOpen}
          onToggleRefine={() => setRefineOpen(o => !o)}
          authUser={authUser}
          onOpenLogin={() => setLoginOpen(true)}
          onLogout={handleLogout}
        />
        <div className={`app-body mobile-${mobileView}`}>
          <Assistant
            t={t}
            lang={lang}
            doc={active}
            authUser={authUser}
            onRunTurn={runAssistantTurn}
            onUndoSnapshot={handleUndoSnapshot}
            onApplyPending={handleApplyPending}
            reviewMode={reviewMode}
            onToggleReviewMode={toggleReviewMode}
            initialMessage={pendingJd ? t.assistant.jdIntro(pendingJd) : null}
            onInitialSent={() => setPendingJd(null)}
          />
          <Preview
            t={t}
            page={active.page}
            onFitToggle={handleFitToggle}
            extraPage={coverNode}
            onSectionClick={handleSectionClick}
            onMeasure={m => {
              measureRef.current = m
            }}
          >
            <ErrorBoundary
              resetKey={`${active.id}:${active.template}`}
              message={t.renderError}
              retryLabel={t.renderRetry}
            >
              {resumeNode}
            </ErrorBoundary>
          </Preview>
          {refineOpen && (
            <aside className="refine-panel" data-testid="refine-panel">
              <div className="refine-head">
                <div className="refine-tabs">
                  <button
                    className={refineTab === 'content' ? 'active' : ''}
                    onClick={() => setRefineTab('content')}
                  >
                    {t.refine.tabContent}
                  </button>
                  <button
                    className={refineTab === 'looks' ? 'active' : ''}
                    onClick={() => setRefineTab('looks')}
                    data-testid="looks-tab"
                  >
                    {t.refine.tabLooks}
                  </button>
                </div>
                <button className="icon-btn" title={t.refine.close} onClick={() => setRefineOpen(false)}>
                  ✕
                </button>
              </div>
              {refineTab === 'content' ? (
                <Editor
                  t={t}
                  resume={active.resume}
                  setResume={setResume}
                  placeholders={placeholders}
                  coverLetter={active.coverLetter}
                  onChangeCover={handleChangeCover}
                />
              ) : (
                <AppearancePanel
                  t={t}
                  template={active.template}
                  accent={active.accent}
                  typography={active.typography}
                  page={active.page}
                  onPatchDoc={patchDoc}
                />
              )}
            </aside>
          )}
        </div>
        <nav className="mobile-tabs">
          <button className={mobileView === 'edit' ? 'active' : ''} onClick={() => setMobileView('edit')}>
            {t.mobile.edit}
          </button>
          <button className={mobileView === 'preview' ? 'active' : ''} onClick={() => setMobileView('preview')}>
            {t.mobile.preview}
          </button>
        </nav>
      </div>
      {active.page.size === 'letter' && <style>{'@media print { @page { size: letter; margin: 0 } }'}</style>}
      {loginOpen && <AccountModal t={t} onClose={() => setLoginOpen(false)} onAuthed={handleAuthed} />}
      {onboarding && (
        <Onboarding
          t={t}
          lang={lang}
          onPatch={patch}
          onStart={(tr, stage, jd) => {
            applySample(tr, stage, false)
            if (jd) setPendingJd(jd)
            setOnboarding(false)
          }}
          onSkip={() => setOnboarding(false)}
        />
      )}
      {/* Untransformed copy used only by @media print */}
      <div id="print-root" aria-hidden="true">
        <ErrorBoundary resetKey={`${active.id}:${active.template}`} message="" retryLabel="">
          <div className="print-page">{resumeNode}</div>
          {coverNode && <div className="print-page">{coverNode}</div>}
        </ErrorBoundary>
      </div>
    </>
  )
}
