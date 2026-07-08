import Icon from '../components/Icon.jsx'

export const splitLines = text =>
  (text || '')
    .split('\n')
    .map(s => s.trim().replace(/^[-•·]\s*/, ''))
    .filter(Boolean)

export const dateRange = (start, end, presentLabel) => {
  if (!start && !end) return ''
  return `${start || ''} – ${end || presentLabel}`
}

const asUrl = text => (/^https?:\/\//.test(text) ? text : `https://${text}`)

export const buildContacts = basics =>
  [
    { icon: 'phone', text: basics.phone, href: basics.phone && `tel:${basics.phone.replace(/\s/g, '')}` },
    { icon: 'mail', text: basics.email, href: basics.email && `mailto:${basics.email}` },
    { icon: 'pin', text: basics.location },
    { icon: 'globe', text: basics.website, href: basics.website && asUrl(basics.website) },
    { icon: 'github', text: basics.github, href: basics.github && asUrl(basics.github) },
  ].filter(c => c.text && c.text.trim())

const itemHasContent = item =>
  Object.entries(item).some(([k, v]) => k !== 'id' && typeof v === 'string' && v.trim())

export const getCustomSection = (resume, key) =>
  (resume.customSections || []).find(c => `custom:${c.id}` === key) || null

export function visibleSections(resume) {
  return resume.sectionOrder.filter(key => {
    if (resume.hiddenSections.includes(key)) return false
    if (key === 'summary') return Boolean(resume.basics.summary.trim())
    if (key.startsWith('custom:')) {
      const sec = getCustomSection(resume, key)
      return Boolean(sec && sec.items.length > 0 && sec.items.some(itemHasContent))
    }
    const items = resume[key]
    return Array.isArray(items) && items.length > 0 && items.some(itemHasContent)
  })
}

export const nonEmptyItems = items => items.filter(itemHasContent)

/* ---------- Inline rich text: **bold**, *italic*, [text](url) ---------- */

export function parseInline(text) {
  const re = /(\*\*([^*\n]+)\*\*)|(\*([^*\n]+)\*)|(\[([^\]\n]+)\]\(([^)\s]+)\))/g
  const out = []
  let last = 0
  let m
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ type: 'text', text: text.slice(last, m.index) })
    if (m[2] != null) out.push({ type: 'bold', text: m[2] })
    else if (m[4] != null) out.push({ type: 'italic', text: m[4] })
    else out.push({ type: 'link', text: m[6], href: m[7] })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ type: 'text', text: text.slice(last) })
  return out
}

export function renderInline(text) {
  if (!text) return null
  return parseInline(text).map((seg, i) => {
    if (seg.type === 'bold') return <strong key={i}>{seg.text}</strong>
    if (seg.type === 'italic') return <em key={i}>{seg.text}</em>
    if (seg.type === 'link') {
      const href = /^https?:\/\//.test(seg.href) ? seg.href : `https://${seg.href}`
      return (
        <a key={i} className="r-inline-link" href={href}>
          {seg.text}
        </a>
      )
    }
    return seg.text
  })
}

export function Para({ className = '', text }) {
  if (!text || !text.trim()) return null
  return <p className={className}>{renderInline(text)}</p>
}

export function Bullets({ text, className = '' }) {
  const lines = splitLines(text)
  if (!lines.length) return null
  if (lines.length === 1) return <p className={`r-para ${className}`}>{renderInline(lines[0])}</p>
  return (
    <ul className={`r-bullets ${className}`}>
      {lines.map((line, i) => (
        <li key={i}>{renderInline(line)}</li>
      ))}
    </ul>
  )
}

export function ContactList({ basics, withIcons = true, className = '' }) {
  const contacts = buildContacts(basics)
  if (!contacts.length) return null
  return (
    <div className={`r-contacts ${className}`}>
      {contacts.map((c, i) => {
        const Tag = c.href ? 'a' : 'span'
        return (
          <Tag className="r-contact" key={i} href={c.href}>
            {withIcons && <Icon name={c.icon} size={12} />}
            {c.text}
          </Tag>
        )
      })}
    </div>
  )
}
