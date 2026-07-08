import Icon from '../components/Icon.jsx'
import { Bullets, Para, buildContacts, dateRange, getCustomSection, nonEmptyItems, visibleSections } from './shared.jsx'

const SIDE_KEYS = ['skills', 'education']

function SideSection({ title, children }) {
  return (
    <section className="d-side-section">
      <h2 className="d-side-heading">{title}</h2>
      {children}
    </section>
  )
}

function MainSection({ title, children }) {
  return (
    <section className="d-section">
      <h2 className="d-heading">{title}</h2>
      {children}
    </section>
  )
}

export default function DuotoneTemplate({ resume, t }) {
  const { basics } = resume
  const present = t.fields.present
  const sections = visibleSections(resume)
  const contacts = buildContacts(basics)

  const sideRender = {
    skills: () => (
      <SideSection key="skills" title={t.sections.skills}>
        {nonEmptyItems(resume.skills).map(item => (
          <div className="d-skill" key={item.id}>
            <div className="d-skill-name">{item.name}</div>
            <div className="d-skill-bar">
              <i style={{ width: `${(item.level / 5) * 100}%` }} />
            </div>
            {item.detail && <div className="d-skill-detail">{item.detail}</div>}
          </div>
        ))}
      </SideSection>
    ),
    education: () => (
      <SideSection key="education" title={t.sections.education}>
        {nonEmptyItems(resume.education).map(item => (
          <div className="d-edu" key={item.id}>
            <div className="d-edu-school">{item.school}</div>
            <div className="d-edu-degree">{[item.degree, item.major].filter(Boolean).join(' · ')}</div>
            <div className="d-edu-dates">{dateRange(item.start, item.end, present)}</div>
            {item.description && <div className="d-edu-desc">{item.description}</div>}
          </div>
        ))}
      </SideSection>
    ),
  }

  const mainRender = {
    summary: () => (
      <MainSection key="summary" title={t.sections.summary}>
        <Para className="r-para" text={basics.summary} />
      </MainSection>
    ),
    experience: () => (
      <MainSection key="experience" title={t.sections.experience}>
        {nonEmptyItems(resume.experience).map(item => (
          <div className="d-entry" key={item.id}>
            <div className="d-entry-head">
              <div className="d-entry-titles">
                {item.role && <span className="d-entry-role">{item.role}</span>}
                {item.company && (
                  <span className="d-entry-company">
                    {[item.company, item.location].filter(Boolean).join(' · ')}
                  </span>
                )}
              </div>
              <span className="d-entry-dates">{dateRange(item.start, item.end, present)}</span>
            </div>
            <Bullets text={item.highlights} />
          </div>
        ))}
      </MainSection>
    ),
    projects: () => (
      <MainSection key="projects" title={t.sections.projects}>
        {nonEmptyItems(resume.projects).map(item => (
          <div className="d-entry" key={item.id}>
            <div className="d-entry-head">
              <div className="d-entry-titles">
                {item.name && <span className="d-entry-role">{item.name}</span>}
                {(item.role || item.link) && (
                  <span className="d-entry-company">{[item.role, item.link].filter(Boolean).join(' · ')}</span>
                )}
              </div>
            </div>
            <Bullets text={item.description} />
          </div>
        ))}
      </MainSection>
    ),
    education: () => null,
    skills: () => null,
  }

  const renderCustom = sec => (
    <MainSection key={`custom:${sec.id}`} title={sec.title}>
      {nonEmptyItems(sec.items).map(item => (
        <div className="d-entry" key={item.id}>
          <div className="d-entry-head">
            <div className="d-entry-titles">
              {item.title && <span className="d-entry-role">{item.title}</span>}
              {item.subtitle && <span className="d-entry-company">{item.subtitle}</span>}
            </div>
            {item.meta && <span className="d-entry-dates">{item.meta}</span>}
          </div>
          <Bullets text={item.description} />
        </div>
      ))}
    </MainSection>
  )

  return (
    <div className="d-layout">
      <div className="d-side-print-bg" aria-hidden="true" />
      <aside className="d-side">
        {basics.photo && <img className="d-photo" src={basics.photo} alt="" />}
        {contacts.length > 0 && (
          <SideSection title={t.sections.contact}>
            <div className="d-contacts">
              {contacts.map((c, i) => {
                const Tag = c.href ? 'a' : 'div'
                return (
                  <Tag className="d-contact" key={i} href={c.href}>
                    <Icon name={c.icon} size={13} />
                    <span>{c.text}</span>
                  </Tag>
                )
              })}
            </div>
          </SideSection>
        )}
        {sections.filter(k => SIDE_KEYS.includes(k)).map(key => sideRender[key]())}
      </aside>
      <main className="d-main">
        <header className="d-header">
          <h1 className="d-name">{basics.name}</h1>
          {basics.title && <div className="d-title">{basics.title}</div>}
        </header>
        {sections.filter(k => !SIDE_KEYS.includes(k)).map(key =>
          key.startsWith('custom:') ? renderCustom(getCustomSection(resume, key)) : mainRender[key](),
        )}
      </main>
    </div>
  )
}
