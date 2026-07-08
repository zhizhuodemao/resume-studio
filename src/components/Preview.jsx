import { useEffect, useRef, useState } from 'react'
import { PAGE_DIMENSIONS } from '../store.js'

export default function Preview({ t, page, onFitToggle, extraPage, onMeasure, onSectionClick, children }) {
  const dims = PAGE_DIMENSIONS[page?.size] || PAGE_DIMENSIONS.a4
  const fitActive = Boolean(page?.fitScale && page.fitScale < 1)

  const areaRef = useRef(null)
  const pageRef = useRef(null)
  const [scale, setScale] = useState(0.8)
  const [contentHeight, setContentHeight] = useState(dims.height)
  const [aiFlash, setAiFlash] = useState(false)

  useEffect(() => {
    let timer
    const findSection = label => {
      for (const sec of document.querySelectorAll('.preview .page section')) {
        if (sec.querySelector('h2')?.textContent?.trim() === label) return sec
      }
      return null
    }
    const onAi = e => {
      setAiFlash(true)
      clearTimeout(timer)
      timer = setTimeout(() => setAiFlash(false), 1400)
      // mark each changed section on the canvas
      for (const label of e.detail?.labels || []) {
        const sec = findSection(label)
        if (!sec) continue
        sec.classList.add('ai-changed')
        setTimeout(() => sec.classList.remove('ai-changed'), 3000)
      }
    }
    const onFocus = e => {
      const sec = findSection(e.detail)
      if (!sec) return
      sec.scrollIntoView({ behavior: 'smooth', block: 'center' })
      sec.classList.add('ai-changed')
      setTimeout(() => sec.classList.remove('ai-changed'), 2000)
    }
    window.addEventListener('ai-updated', onAi)
    window.addEventListener('canvas-focus', onFocus)
    return () => {
      window.removeEventListener('ai-updated', onAi)
      window.removeEventListener('canvas-focus', onFocus)
      clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    const area = areaRef.current
    const pageEl = pageRef.current
    const update = () => {
      const available = area.clientWidth - 64
      setScale(Math.min(1, available / dims.width))
      setContentHeight(pageEl.offsetHeight)
      onMeasure?.({ content: pageEl.offsetHeight, page: dims.height })
    }
    const ro = new ResizeObserver(update)
    ro.observe(area)
    ro.observe(pageEl)
    update()
    return () => ro.disconnect()
  }, [dims.width])

  const pageCount = Math.max(1, Math.ceil((contentHeight - 8) / dims.height))

  // Click a section in the preview -> open refine mode at the matching card
  const jumpToEditor = e => {
    const heading = e.target.closest('section')?.querySelector('h2')
    const title = heading?.textContent?.trim()
    if (title) onSectionClick?.(title)
  }

  return (
    <main className="preview" ref={areaRef}>
      <div
        className="preview-canvas"
        style={{ width: dims.width * scale, height: contentHeight * scale }}
      >
        <div
          className={`page ${aiFlash ? 'ai-flash' : ''}`}
          ref={pageRef}
          onClick={jumpToEditor}
          style={{ transform: `scale(${scale})`, width: dims.width, minHeight: dims.height }}
        >
          {children}
          <div
            className="page-break-overlay"
            aria-hidden="true"
            style={{
              background: `repeating-linear-gradient(to bottom, transparent 0, transparent ${dims.height - 1}px, rgba(225, 29, 72, 0.35) ${dims.height - 1}px, rgba(225, 29, 72, 0.35) ${dims.height}px)`,
            }}
          />
        </div>
      </div>
      {extraPage && (
        <div className="preview-canvas" style={{ width: dims.width * scale, height: dims.height * scale, marginTop: 24 }}>
          <div className="page" style={{ transform: `scale(${scale})`, width: dims.width, minHeight: dims.height }}>
            {extraPage}
          </div>
        </div>
      )}
      <p className="page-hint">
        <span>
          {t.preview.pages(pageCount)} · {t.pageBreakHint}
        </span>
        {(pageCount > 1 || fitActive) && (
          <button
            className={`btn btn-small fit-btn ${fitActive ? 'active' : ''}`}
            onClick={() => onFitToggle(contentHeight, dims.height)}
          >
            {fitActive ? t.preview.unfit : t.preview.fit}
          </button>
        )}
      </p>
    </main>
  )
}
