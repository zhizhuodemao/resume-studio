import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { SAMPLE_TRACKS, hasStage } from '../samples/index.js'
import { Segmented } from './AppearancePanel.jsx'
import { getUsage } from '../api.js'

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
  track,
  savedAt,
  onPatch,
  docs,
  activeDoc,
  onSwitchDoc,
  onCreateDoc,
  onDuplicateDoc,
  onRenameDoc,
  onDeleteDoc,
  onExportDoc,
  onImportDoc,
  onExportDocx,
  onExportText,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onApplySample,
  onClear,
  onExport,
  refineOpen,
  onToggleRefine,
  onOpenStage,
  authUser,
  onOpenLogin,
  onLogout,
}) {
  const initialMenu = new URLSearchParams(window.location.search).get('menu')
  const samplePop = usePopover(initialMenu === 'sample')
  const docsPop = usePopover(initialMenu === 'docs')
  const exportPop = usePopover(false)
  const importInputRef = useRef(null)
  const [selTrack, setSelTrack] = useState(track || 'tech')
  const [selStage, setSelStage] = useState('social')
  const [renaming, setRenaming] = useState(false)

  const commitRename = value => {
    setRenaming(false)
    if (value.trim() && value.trim() !== (activeDoc.name || '')) onRenameDoc(value)
  }

  const pickTrack = tr => {
    setSelTrack(tr)
    if (!hasStage(tr, selStage)) setSelStage('social')
  }

  const accountPop = usePopover(false)
  const [usage, setUsage] = useState(null)
  const openAccount = () => {
    accountPop.setOpen(!accountPop.open)
    if (!accountPop.open) getUsage().then(setUsage).catch(() => setUsage(null))
  }

  const docAction = fn => () => {
    fn()
    docsPop.setOpen(false)
  }

  return (
    <header className="toolbar">
      {/* left: identity + document */}
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
          onClick={() => {
            setRenaming(false)
            docsPop.setOpen(!docsPop.open)
          }}
          data-testid="doc-switcher"
        >
          <Icon name="file" size={14} />
          <b className="doc-switcher-name">{activeDoc.name || t.docs.untitled}</b>
          <Icon name="chevron" size={13} className="select-chevron" />
        </button>
        {docsPop.open && (
          <div className="popover popover-docs">
            <div className="docs-list">
              {docs.map(d =>
                renaming && d.id === activeDoc.id ? (
                  <div key={d.id} className="docs-item active docs-item-renaming">
                    <span className="docs-check">✓</span>
                    <input
                      className="docs-rename-input"
                      data-testid="rename-input"
                      autoFocus
                      defaultValue={activeDoc.name || ''}
                      onFocus={e => e.target.select()}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitRename(e.target.value)
                        if (e.key === 'Escape') setRenaming(false)
                      }}
                      onBlur={e => commitRename(e.target.value)}
                    />
                  </div>
                ) : (
                  <button
                    key={d.id}
                    className={`docs-item ${d.id === activeDoc.id ? 'active' : ''}`}
                    onClick={docAction(() => onSwitchDoc(d.id))}
                  >
                    <span className="docs-check">{d.id === activeDoc.id ? '✓' : ''}</span>
                    <span className="docs-item-name">{d.name || t.docs.untitled}</span>
                    <span className="docs-item-date">{new Date(d.updatedAt).toLocaleDateString()}</span>
                  </button>
                ),
              )}
            </div>
            <div className="menu-divider" />
            <button className="menu-item" onClick={docAction(onCreateDoc)}>
              <span className="menu-item-icon">＋</span>
              {t.docs.new}
            </button>
            <button className="menu-item" onClick={docAction(onDuplicateDoc)}>
              <span className="menu-item-icon">⧉</span>
              {t.docs.duplicate}
            </button>
            <button className="menu-item" onClick={() => setRenaming(true)}>
              <span className="menu-item-icon">✎</span>
              {t.docs.rename}
            </button>
            <button className="menu-item" onClick={() => importInputRef.current?.click()}>
              <span className="menu-item-icon">⤓</span>
              {t.docs.import}
            </button>
            <div className="menu-divider" />
            <button className="menu-item menu-item-danger" onClick={docAction(onDeleteDoc)}>
              <span className="menu-item-icon">🗑</span>
              {t.docs.delete}
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
        )}
      </div>

      {/* center: editing tool group */}
      <div className="toolbar-group">
        <button className="icon-btn toolbar-icon-btn" disabled={!canUndo} title={t.docs.undo} onClick={onUndo}>
          <Icon name="undo" size={15} />
        </button>
        <button className="icon-btn toolbar-icon-btn" disabled={!canRedo} title={t.docs.redo} onClick={onRedo}>
          <Icon name="redo" size={15} />
        </button>
        <span className="toolbar-group-divider" />
        <button className="btn btn-toolgroup stage-btn" onClick={onOpenStage} data-testid="stage-btn">
          <span className="cmd-spark">✦</span> {t.stage.open}
        </button>
        <button
          className={`btn btn-toolgroup ${refineOpen ? 'open' : ''}`}
          onClick={onToggleRefine}
          data-testid="refine-btn"
        >
          ✎ {t.refine.open}
        </button>
      </div>

      <div className="toolbar-spacer" />

      {/* right: status + utilities + account + export */}
      <div className="toolbar-actions">
        <span
          className={`sync-chip ${authUser ? 'sync-cloud' : ''}`}
          data-testid="sync-chip"
          title={savedAt ? `${t.autoSaved} ${savedAt.toLocaleTimeString()}` : ''}
        >
          <span className="sync-dot" />
          {authUser ? t.sync.cloud : t.sync.local}
        </span>

        <div className="popover-wrap" ref={samplePop.ref}>
          <button
            className={`btn btn-ghost ${samplePop.open ? 'open' : ''}`}
            onClick={() => samplePop.setOpen(!samplePop.open)}
            data-testid="more-btn"
          >
            {t.sampleLib}
            <Icon name="chevron" size={13} className="select-chevron" />
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
              <div className="menu-divider" />
              <button
                className="menu-item menu-item-danger"
                onClick={() => {
                  samplePop.setOpen(false)
                  onClear()
                }}
              >
                <span className="menu-item-icon">🗑</span>
                {t.clearAll}
              </button>
            </div>
          )}
        </div>

        <button
          className="btn btn-ghost lang-btn"
          onClick={() => onPatch({ lang: lang === 'zh' ? 'en' : 'zh' })}
          title={t.language}
        >
          {t.language}
        </button>

        {authUser ? (
          <div className="popover-wrap" ref={accountPop.ref}>
            <button
              className={`btn btn-ghost account-chip ${accountPop.open ? 'open' : ''}`}
              onClick={openAccount}
              data-testid="account-menu-btn"
            >
              <span className="account-avatar">{authUser.email[0].toUpperCase()}</span>
              {authUser.email.split('@')[0].slice(0, 12)}
            </button>
            {accountPop.open && (
              <div className="popover popover-right popover-menu account-menu">
                <div className="account-email">{authUser.email}</div>
                <div className="account-usage">
                  <div>
                    <b>{usage ? usage.today_tokens.toLocaleString() : '…'}</b>
                    <span>{t.account.usageToday}</span>
                  </div>
                  <div>
                    <b>{usage ? usage.total_tokens.toLocaleString() : '…'}</b>
                    <span>{t.account.usageTotal}</span>
                  </div>
                  <div>
                    <b>{usage ? usage.calls : '…'}</b>
                    <span>{t.account.calls}</span>
                  </div>
                </div>
                <div className="account-sync">{t.account.synced}</div>
                <div className="menu-divider" />
                <button
                  className="menu-item"
                  data-testid="logout-btn"
                  onClick={() => {
                    accountPop.setOpen(false)
                    onLogout()
                  }}
                >
                  {t.account.logout}
                </button>
              </div>
            )}
          </div>
        ) : (
          <button className="btn btn-ghost" onClick={onOpenLogin} data-testid="account-btn">
            {t.account.login}
          </button>
        )}

        <div className="export-split popover-wrap" ref={exportPop.ref}>
          <button className="btn btn-primary export-main" onClick={onExport} title={t.exportHint}>
            <Icon name="download" size={15} />
            {t.exportPdf}
          </button>
          <button
            className={`btn btn-primary export-caret ${exportPop.open ? 'open' : ''}`}
            onClick={() => exportPop.setOpen(!exportPop.open)}
            data-testid="export-menu-btn"
            aria-label={t.more}
          >
            <Icon name="chevron" size={13} />
          </button>
          {exportPop.open && (
            <div className="popover popover-right popover-menu">
              <button className="menu-item" onClick={() => { exportPop.setOpen(false); onExportDocx() }}>
                {t.docs.exportWord}
              </button>
              <button className="menu-item" onClick={() => { exportPop.setOpen(false); onExportText() }}>
                {t.docs.exportText}
              </button>
              <button className="menu-item" onClick={() => { exportPop.setOpen(false); onExportDoc() }}>
                {t.docs.export}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
