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

export function visibleSections(resume) {
  return resume.sectionOrder.filter(key => {
    if (resume.hiddenSections.includes(key)) return false
    if (key === 'summary') return Boolean(resume.basics.summary.trim())
    const items = resume[key]
    return items.length > 0 && items.some(itemHasContent)
  })
}

export const nonEmptyItems = items => items.filter(itemHasContent)

export function Bullets({ text, className = '' }) {
  const lines = splitLines(text)
  if (!lines.length) return null
  if (lines.length === 1) return <p className={`r-para ${className}`}>{lines[0]}</p>
  return (
    <ul className={`r-bullets ${className}`}>
      {lines.map((line, i) => (
        <li key={i}>{line}</li>
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
