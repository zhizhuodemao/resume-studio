import Icon from '../components/Icon.jsx'
import { Bullets, Para, buildContacts, dateRange, getCustomSection, nonEmptyItems, visibleSections } from './shared.jsx'

function Section({ title, children }) {
  return (
    <section className="b-section">
      <h2 className="b-heading">{title}</h2>
      {children}
    </section>
  )
}

export default function BoldTemplate({ resume, t }) {
  const { basics } = resume
  const present = t.fields.present
  const contacts = buildContacts(basics)

  const render = {
    summary: () => (
      <Section key="summary" title={t.sections.summary}>
        <Para className="r-para" text={basics.summary} />
      </Section>
    ),
    experience: () => (
      <Section key="experience" title={t.sections.experience}>
        {nonEmptyItems(resume.experience).map(item => (
          <div className="b-entry" key={item.id}>
            <div className="b-entry-head">
              <div className="b-entry-titles">
                {item.role && <span className="b-entry-role">{item.role}</span>}
                {item.company && <span className="b-entry-company">{item.company}</span>}
              </div>
              <span className="b-entry-meta">
                {[dateRange(item.start, item.end, present), item.location].filter(Boolean).join(' · ')}
              </span>
            </div>
            <Bullets text={item.highlights} />
          </div>
        ))}
      </Section>
    ),
    projects: () => (
      <Section key="projects" title={t.sections.projects}>
        {nonEmptyItems(resume.projects).map(item => (
          <div className="b-entry" key={item.id}>
            <div className="b-entry-head">
              <div className="b-entry-titles">
                {item.name && <span className="b-entry-role">{item.name}</span>}
                {item.role && <span className="b-entry-company">{item.role}</span>}
              </div>
              {item.link && <span className="b-entry-meta">{item.link}</span>}
            </div>
            <Bullets text={item.description} />
          </div>
        ))}
      </Section>
    ),
    education: () => (
      <Section key="education" title={t.sections.education}>
        {nonEmptyItems(resume.education).map(item => (
          <div className="b-entry" key={item.id}>
            <div className="b-entry-head">
              <div className="b-entry-titles">
                {item.school && <span className="b-entry-role">{item.school}</span>}
                <span className="b-entry-company">{[item.degree, item.major].filter(Boolean).join(' · ')}</span>
              </div>
              <span className="b-entry-meta">{dateRange(item.start, item.end, present)}</span>
            </div>
            {item.description && <Para className="r-para" text={item.description} />}
          </div>
        ))}
      </Section>
    ),
    skills: () => (
      <Section key="skills" title={t.sections.skills}>
        <div className="b-skills">
          {nonEmptyItems(resume.skills).map(item => (
            <div className="b-skill" key={item.id}>
              <span className="b-skill-chip">{item.name}</span>
              {item.detail && <span className="b-skill-detail">{item.detail}</span>}
            </div>
          ))}
        </div>
      </Section>
    ),
  }

  const renderCustom = sec => (
    <Section key={`custom:${sec.id}`} title={sec.title}>
      {nonEmptyItems(sec.items).map(item => (
        <div className="b-entry" key={item.id}>
          <div className="b-entry-head">
            <div className="b-entry-titles">
              {item.title && <span className="b-entry-role">{item.title}</span>}
              {item.subtitle && <span className="b-entry-company">{item.subtitle}</span>}
            </div>
            {item.meta && <span className="b-entry-meta">{item.meta}</span>}
          </div>
          <Bullets text={item.description} />
        </div>
      ))}
    </Section>
  )

  return (
    <div className="b-root">
      <header className="b-header">
        <div className="b-header-text">
          <h1 className="b-name">{basics.name}</h1>
          {basics.title && <div className="b-title">{basics.title}</div>}
          {contacts.length > 0 && (
            <div className="b-contacts">
              {contacts.map((c, i) => {
                const Tag = c.href ? 'a' : 'span'
                return (
                  <Tag className="b-contact" key={i} href={c.href}>
                    <Icon name={c.icon} size={12} />
                    {c.text}
                  </Tag>
                )
              })}
            </div>
          )}
        </div>
        {basics.photo && <img className="b-photo" src={basics.photo} alt="" />}
      </header>
      <div className="b-body">{visibleSections(resume).map(key =>
        key.startsWith('custom:') ? renderCustom(getCustomSection(resume, key)) : render[key](),
      )}</div>
    </div>
  )
}
