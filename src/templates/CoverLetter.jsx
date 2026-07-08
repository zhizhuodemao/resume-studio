import { ContactList, renderInline } from './shared.jsx'

// Rendered as an extra page after the resume when enabled.
export default function CoverLetter({ basics, content, t }) {
  const paragraphs = (content || '').split('\n').map(s => s.trim())
  return (
    <div className="cover-root">
      <header className="cover-header">
        <h1 className="cover-name">{basics.name}</h1>
        {basics.title && <div className="cover-title">{basics.title}</div>}
        <ContactList basics={basics} className="cover-contacts" />
      </header>
      <h2 className="cover-heading">{t.cover.title}</h2>
      <div className="cover-body">
        {paragraphs.map((p, i) => (p ? <p key={i}>{renderInline(p)}</p> : <br key={i} />))}
      </div>
    </div>
  )
}
