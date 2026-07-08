import { useEffect, useRef, useState } from 'react'

// Floating AI command dock: the primary way to talk to the workbench.
export default function CommandBar({ t, busy, cards, onSubmit, onUndoCard, onDismissCard }) {
  const [value, setValue] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    const onKey = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const submit = () => {
    const text = value.trim()
    if (!text || busy) return
    onSubmit(text)
    setValue('')
  }

  return (
    <div className="cmd-dock" data-testid="cmd-dock">
      {cards.map(card => (
        <div key={card.id} className={`cmd-card ${card.error ? 'cmd-card-error' : ''}`}>
          <div className="cmd-card-msg">
            <span className="cmd-spark">✦</span>
            {card.message}
          </div>
          {card.labels.length > 0 && (
            <div className="cmd-card-labels">
              {card.labels.map((l, i) => (
                <span className="cmd-chip" key={i}>
                  {l}
                </span>
              ))}
            </div>
          )}
          <div className="cmd-card-actions">
            {card.snapshot && (
              <button className="btn btn-small" onClick={() => onUndoCard(card.id)}>
                {t.cmd.undo}
              </button>
            )}
            <button className="btn btn-small" onClick={() => onDismissCard(card.id)}>
              {t.cmd.dismiss}
            </button>
          </div>
        </div>
      ))}
      <div className={`cmd-bar ${busy ? 'busy' : ''}`}>
        <span className="cmd-spark" aria-hidden="true">
          ✦
        </span>
        <input
          ref={inputRef}
          data-testid="cmd-input"
          value={value}
          placeholder={busy ? t.cmd.working : t.cmd.placeholder}
          disabled={busy}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') submit()
          }}
        />
        <kbd className="cmd-kbd">⌘K</kbd>
        <button className="btn btn-primary cmd-send" disabled={busy || !value.trim()} onClick={submit}>
          {t.cmd.send}
        </button>
      </div>
    </div>
  )
}
