import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { TEMPLATE_IDS } from '../templates/Resume.jsx'
import { SAMPLE_TRACKS, hasStage } from '../samples/index.js'

const ACCENT_PRESETS = ['#2563eb', '#4f46e5', '#0d9488', '#b45309', '#e11d48', '#334155']

function TemplateThumb({ id }) {
  // Miniature CSS sketches of each template's layout
  switch (id) {
    case 'classic':
      return (
        <div className="thumb">
          <i className="th-line th-center th-w50" />
          <i className="th-line th-center th-w35 th-faint" />
          <i className="th-rule" />
          <i className="th-line th-w80 th-faint" />
          <i className="th-line th-w70 th-faint" />
          <i className="th-rule" />
          <i className="th-line th-w75 th-faint" />
          <i className="th-line th-w60 th-faint" />
        </div>
      )
    case 'modern':
      return (
        <div className="thumb">
          <i className="th-line th-w50 th-bold" />
          <i className="th-line th-w30 th-accent" />
          <i className="th-block th-accent-bar" />
          <i className="th-line th-w85 th-faint" />
          <i className="th-line th-w70 th-faint" />
          <i className="th-block th-accent-bar" />
          <i className="th-line th-w80 th-faint" />
          <i className="th-line th-w60 th-faint" />
        </div>
      )
    case 'sidebar':
      return (
        <div className="thumb thumb-cols">
          <div className="th-side th-side-dark" />
          <div className="th-main">
            <i className="th-line th-w70 th-bold" />
            <i className="th-line th-w85 th-faint" />
            <i className="th-line th-w60 th-faint" />
            <i className="th-line th-w80 th-faint" />
            <i className="th-line th-w55 th-faint" />
          </div>
        </div>
      )
    case 'duotone':
      return (
        <div className="thumb thumb-cols">
          <div className="th-side th-side-light" />
          <div className="th-main">
            <i className="th-line th-w70 th-bold" />
            <i className="th-line th-w85 th-faint" />
            <i className="th-line th-w60 th-faint" />
            <i className="th-line th-w80 th-faint" />
            <i className="th-line th-w55 th-faint" />
          </div>
        </div>
      )
    case 'timeline':
      return (
        <div className="thumb">
          <i className="th-line th-w50 th-bold" />
          <div className="th-tl">
            <div className="th-tl-rail" />
            <div className="th-tl-lines">
              <i className="th-line th-w85 th-faint" />
              <i className="th-line th-w65 th-faint" />
              <i className="th-line th-w80 th-faint" />
              <i className="th-line th-w55 th-faint" />
            </div>
          </div>
        </div>
      )
    case 'campus':
      return (
        <div className="thumb">
          <i className="th-line th-w50 th-bold" />
          <i className="th-pill" />
          <i className="th-line th-w85 th-faint" />
          <i className="th-line th-w70 th-faint" />
          <i className="th-pill" />
          <div className="th-chips">
            <i /><i /><i />
          </div>
        </div>
      )
    case 'minimal':
      return (
        <div className="thumb">
          <i className="th-line th-w45 th-bold" />
          <div className="th-cols">
            <i className="th-line th-w90 th-faint" />
          </div>
          <div className="th-cols">
            <i className="th-line th-w90 th-faint" />
          </div>
          <div className="th-cols">
            <i className="th-line th-w80 th-faint" />
          </div>
        </div>
      )
    case 'bold':
      return (
        <div className="thumb thumb-banner">
          <div className="th-banner">
            <i className="th-line th-w50 th-white" />
            <i className="th-line th-w35 th-white-faint" />
          </div>
          <div className="th-banner-body">
            <i className="th-line th-w80 th-faint" />
            <i className="th-line th-w65 th-faint" />
            <i className="th-line th-w75 th-faint" />
          </div>
        </div>
      )
    default:
      return <div className="thumb" />
  }
}

function Segmented({ value, options, onChange }) {
  return (
    <div className="segmented">
      {options.map(opt => (
        <button
          key={opt.value}
          className={value === opt.value ? 'active' : ''}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function usePopover(defaultOpen = false) {
  const [open, setOpen] = useState(defaultOpen)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onDown = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = e => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return { open, setOpen, ref }
}

export default function Toolbar({
  t,
  lang,
  template,
  accent,
  typography,
  track,
  savedAt,
  onPatch,
  onPatchDoc,
  docs,
  activeDoc,
  onSwitchDoc,
  onCreateDoc,
  onDuplicateDoc,
  onRenameDoc,
  onDeleteDoc,
  onExportDoc,
  onImportDoc,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onApplySample,
  onClear,
  onExport,
  onTranslate,
  translating,
  canUndoTranslate,
  onUndoTranslate,
}) {
  // ?menu=template|typo|sample|ai deep-links a panel open
  const initialMenu = new URLSearchParams(window.location.search).get('menu')
  const tplPop = usePopover(initialMenu === 'template')
  const typoPop = usePopover(initialMenu === 'typo')
  const samplePop = usePopover(initialMenu === 'sample')
  const aiPop = usePopover(initialMenu === 'ai')
  const docsPop = usePopover(initialMenu === 'docs')
  const importInputRef = useRef(null)
  const [selTrack, setSelTrack] = useState(track || 'tech')
  const [selStage, setSelStage] = useState('social')

  const pickTrack = tr => {
    setSelTrack(tr)
    if (!hasStage(tr, selStage)) setSelStage('social')
  }

  const setTypo = patch => onPatchDoc({ typography: { ...typography, ...patch } })

  return (
    <header className="toolbar">
      <div className="toolbar-brand">
        <div className="brand-mark">R</div>
        <div>
          <div className="brand-name">{t.appName}</div>
          <div className="brand-tag">{t.tagline}</div>
        </div>
      </div>

      <div className="popover-wrap" ref={docsPop.ref}>
        <button
          className={`btn btn-select doc-switcher ${docsPop.open ? 'open' : ''}`}
          onClick={() => docsPop.setOpen(!docsPop.open)}
          data-testid="doc-switcher"
        >
          <Icon name="file" size={14} />
          <b className="doc-switcher-name">{activeDoc.name || t.docs.untitled}</b>
          <Icon name="chevron" size={13} className="select-chevron" />
        </button>
        {docsPop.open && (
          <div className="popover popover-docs">
            <div className="docs-list">
              {docs.map(d => (
                <button
                  key={d.id}
                  className={`docs-item ${d.id === activeDoc.id ? 'active' : ''}`}
                  onClick={() => {
                    onSwitchDoc(d.id)
                    docsPop.setOpen(false)
                  }}
                >
                  <span className="docs-item-name">{d.name || t.docs.untitled}</span>
                  <span className="docs-item-date">{new Date(d.updatedAt).toLocaleDateString()}</span>
                </button>
              ))}
            </div>
            <div className="docs-actions">
              <button className="btn btn-small" onClick={() => { onCreateDoc(); docsPop.setOpen(false) }}>
                {t.docs.new}
              </button>
              <button className="btn btn-small" onClick={() => { onDuplicateDoc(); docsPop.setOpen(false) }}>
                {t.docs.duplicate}
              </button>
              <button className="btn btn-small" onClick={() => { onRenameDoc(); docsPop.setOpen(false) }}>
                {t.docs.rename}
              </button>
              <button className="btn btn-small btn-danger" onClick={() => { onDeleteDoc(); docsPop.setOpen(false) }}>
                {t.docs.delete}
              </button>
            </div>
            <div className="docs-actions">
              <button className="btn btn-small" onClick={onExportDoc}>
                {t.docs.export}
              </button>
              <button className="btn btn-small" onClick={() => importInputRef.current?.click()}>
                {t.docs.import}
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept=".json,application/json"
                hidden
                onChange={e => {
                  onImportDoc(e.target.files[0])
                  e.target.value = ''
                  docsPop.setOpen(false)
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="undo-group">
        <button className="icon-btn toolbar-icon-btn" disabled={!canUndo} title={t.docs.undo} onClick={onUndo}>
          <Icon name="undo" size={15} />
        </button>
        <button className="icon-btn toolbar-icon-btn" disabled={!canRedo} title={t.docs.redo} onClick={onRedo}>
          <Icon name="redo" size={15} />
        </button>
      </div>

      <div className="toolbar-center">
        <div className="popover-wrap" ref={tplPop.ref}>
          <button className={`btn btn-select ${tplPop.open ? 'open' : ''}`} onClick={() => tplPop.setOpen(!tplPop.open)}>
            {t.template}
            <b>{t.templates[template]}</b>
            <Icon name="chevron" size={13} className="select-chevron" />
          </button>
          {tplPop.open && (
            <div className="popover popover-templates" role="radiogroup" aria-label={t.template}>
              {TEMPLATE_IDS.map(id => (
                <button
                  key={id}
                  role="radio"
                  aria-checked={template === id}
                  className={`template-card ${template === id ? 'active' : ''}`}
                  onClick={() => {
                    onPatchDoc({ template: id })
                    tplPop.setOpen(false)
                  }}
                >
                  <TemplateThumb id={id} />
                  <span>{t.templates[id]}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="popover-wrap" ref={typoPop.ref}>
          <button className={`btn btn-select ${typoPop.open ? 'open' : ''}`} onClick={() => typoPop.setOpen(!typoPop.open)}>
            {t.typography}
            <Icon name="chevron" size={13} className="select-chevron" />
          </button>
          {typoPop.open && (
            <div className="popover popover-typo">
              <div className="typo-row">
                <span className="typo-label">{t.typo.font}</span>
                <Segmented
                  value={typography.font}
                  onChange={v => setTypo({ font: v })}
                  options={['default', 'sans', 'serif'].map(v => ({ value: v, label: t.typo.fonts[v] }))}
                />
              </div>
              <div className="typo-row">
                <span className="typo-label">{t.typo.size}</span>
                <Segmented
                  value={typography.size}
                  onChange={v => setTypo({ size: v })}
                  options={['s', 'm', 'l'].map(v => ({ value: v, label: t.typo.sizes[v] }))}
                />
              </div>
              <div className="typo-row">
                <span className="typo-label">{t.typo.density}</span>
                <Segmented
                  value={typography.density}
                  onChange={v => setTypo({ density: v })}
                  options={['compact', 'normal', 'relaxed'].map(v => ({ value: v, label: t.typo.densities[v] }))}
                />
              </div>
            </div>
          )}
        </div>

        <div className="accent-picker" aria-label={t.accentColor}>
          {ACCENT_PRESETS.map(c => (
            <button
              key={c}
              className={`accent-swatch ${accent === c ? 'active' : ''}`}
              style={{ background: c }}
              title={c}
              onClick={() => onPatchDoc({ accent: c })}
            />
          ))}
          <label className="accent-custom" title={t.accentColor}>
            <input type="color" value={accent} onChange={e => onPatchDoc({ accent: e.target.value })} />
            <span
              className={`accent-swatch rainbow ${ACCENT_PRESETS.includes(accent) ? '' : 'active'}`}
              style={ACCENT_PRESETS.includes(accent) ? undefined : { background: accent }}
            />
          </label>
        </div>
      </div>

      <div className="toolbar-actions">
        {savedAt && (
          <span className="saved-indicator" title={savedAt.toLocaleTimeString()}>
            {t.autoSaved}
          </span>
        )}
        <div className="popover-wrap" ref={samplePop.ref}>
          <button
            className={`btn btn-ghost ${samplePop.open ? 'open' : ''}`}
            onClick={() => samplePop.setOpen(!samplePop.open)}
          >
            {t.loadSample}
          </button>
          {samplePop.open && (
            <div className="popover popover-right popover-sample">
              <div className="sample-row">
                <span className="typo-label">{t.samplePanel.direction}</span>
                <div className="track-chips">
                  {SAMPLE_TRACKS.map(tr => (
                    <button
                      key={tr}
                      className={`track-chip ${selTrack === tr ? 'active' : ''}`}
                      onClick={() => pickTrack(tr)}
                    >
                      {t.tracks[tr]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sample-row">
                <span className="typo-label">{t.samplePanel.stage}</span>
                <Segmented
                  value={selStage}
                  onChange={setSelStage}
                  options={['social', 'campus']
                    .filter(st => hasStage(selTrack, st))
                    .map(st => ({ value: st, label: t.stages[st] }))}
                />
              </div>
              <div className="sample-footer">
                <span className="sample-note">{t.samplePanel.note}</span>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    onApplySample(selTrack, selStage)
                    samplePop.setOpen(false)
                  }}
                >
                  {t.samplePanel.apply}
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="popover-wrap" ref={aiPop.ref}>
          <button
            className={`btn btn-ghost ${aiPop.open ? 'open' : ''}`}
            disabled={translating}
            onClick={() => aiPop.setOpen(!aiPop.open)}
          >
            {translating ? t.ai.translating : `✨ ${t.ai.translate}`}
          </button>
          {aiPop.open && (
            <div className="popover popover-right popover-ai">
              <p className="sample-note">{t.ai.translateNote}</p>
              <div className="ai-translate-actions">
                <button
                  className="btn btn-small"
                  onClick={() => {
                    aiPop.setOpen(false)
                    onTranslate('en')
                  }}
                >
                  {t.ai.toEn}
                </button>
                <button
                  className="btn btn-small"
                  onClick={() => {
                    aiPop.setOpen(false)
                    onTranslate('zh')
                  }}
                >
                  {t.ai.toZh}
                </button>
              </div>
            </div>
          )}
        </div>
        {canUndoTranslate && (
          <button className="btn btn-ghost" onClick={onUndoTranslate}>
            {t.ai.undoTranslate}
          </button>
        )}
        <button className="btn btn-ghost btn-danger" onClick={onClear}>
          {t.clearAll}
        </button>
        <button className="btn btn-ghost" onClick={() => onPatch({ lang: lang === 'zh' ? 'en' : 'zh' })}>
          {t.language}
        </button>
        <button className="btn btn-primary" onClick={onExport} title={t.exportHint}>
          <Icon name="download" size={15} />
          {t.exportPdf}
        </button>
      </div>
    </header>
  )
}
