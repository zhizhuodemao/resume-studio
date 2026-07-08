import { useEffect, useRef, useState } from 'react'

export const PAGE_W = 794 // A4 width @ 96dpi
export const PAGE_H = 1123 // A4 height @ 96dpi

export default function Preview({ t, children }) {
  const areaRef = useRef(null)
  const pageRef = useRef(null)
  const [scale, setScale] = useState(0.8)
  const [pageHeight, setPageHeight] = useState(PAGE_H)

  useEffect(() => {
    const area = areaRef.current
    const page = pageRef.current
    const update = () => {
      const available = area.clientWidth - 64
      setScale(Math.min(1, available / PAGE_W))
      setPageHeight(page.offsetHeight)
    }
    const ro = new ResizeObserver(update)
    ro.observe(area)
    ro.observe(page)
    update()
    return () => ro.disconnect()
  }, [])

  return (
    <main className="preview" ref={areaRef}>
      <div
        className="preview-canvas"
        style={{ width: PAGE_W * scale, height: pageHeight * scale }}
      >
        <div className="page" ref={pageRef} style={{ transform: `scale(${scale})` }}>
          {children}
          <div className="page-break-overlay" aria-hidden="true" />
        </div>
      </div>
      <p className="page-hint">{t.pageBreakHint}</p>
    </main>
  )
}
