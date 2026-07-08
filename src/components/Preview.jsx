import { useEffect, useRef, useState } from 'react'
import { PAGE_DIMENSIONS } from '../store.js'

export default function Preview({ t, page, onFitToggle, extraPage, children }) {
  const dims = PAGE_DIMENSIONS[page?.size] || PAGE_DIMENSIONS.a4
  const fitActive = Boolean(page?.fitScale && page.fitScale < 1)

  const areaRef = useRef(null)
  const pageRef = useRef(null)
  const [scale, setScale] = useState(0.8)
  const [contentHeight, setContentHeight] = useState(dims.height)

  useEffect(() => {
    const area = areaRef.current
    const pageEl = pageRef.current
    const update = () => {
      const available = area.clientWidth - 64
      setScale(Math.min(1, available / dims.width))
      setContentHeight(pageEl.offsetHeight)
    }
    const ro = new ResizeObserver(update)
    ro.observe(area)
    ro.observe(pageEl)
    update()
    return () => ro.disconnect()
  }, [dims.width])

  const pageCount = Math.max(1, Math.ceil((contentHeight - 8) / dims.height))

  // Click a section in the preview -> scroll the matching editor card into view
  const jumpToEditor = e => {
    const heading = e.target.closest('section')?.querySelector('h2')
    const title = heading?.textContent?.trim()
    if (!title) return
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
  }

  return (
    <main className="preview" ref={areaRef}>
      <div
        className="preview-canvas"
        style={{ width: dims.width * scale, height: contentHeight * scale }}
      >
        <div
          className="page"
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
