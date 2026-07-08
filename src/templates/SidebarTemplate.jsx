import Icon from '../components/Icon.jsx'
import { Bullets, buildContacts, dateRange, nonEmptyItems, visibleSections } from './shared.jsx'

const SIDE_KEYS = ['skills', 'education']

function SideSection({ title, children }) {
  return (
    <section className="s-side-section">
      <h2 className="s-side-heading">{title}</h2>
      {children}
    </section>
  )
}

function MainSection({ title, children }) {
  return (
    <section className="s-section">
      <h2 className="s-heading">{title}</h2>
      {children}
    </section>
  )
}

export default function SidebarTemplate({ resume, t }) {
  const { basics } = resume
  const present = t.fields.present
  const sections = visibleSections(resume)
  const contacts = buildContacts(basics)

  const sideRender = {
    skills: () => (
      <SideSection key="skills" title={t.sections.skills}>
        {nonEmptyItems(resume.skills).map(item => (
          <div className="s-skill" key={item.id}>
            <div className="s-skill-name">{item.name}</div>
            <div className="s-skill-bar">
              <i style={{ width: `${(item.level / 5) * 100}%` }} />
            </div>
            {item.detail && <div className="s-skill-detail">{item.detail}</div>}
          </div>
        ))}
      </SideSection>
    ),
    education: () => (
      <SideSection key="education" title={t.sections.education}>
        {nonEmptyItems(resume.education).map(item => (
          <div className="s-edu" key={item.id}>
            <div className="s-edu-school">{item.school}</div>
            <div className="s-edu-degree">{[item.degree, item.major].filter(Boolean).join(' · ')}</div>
            <div className="s-edu-dates">{dateRange(item.start, item.end, present)}</div>
            {item.description && <div className="s-edu-desc">{item.description}</div>}
          </div>
        ))}
      </SideSection>
    ),
  }

  const mainRender = {
    summary: () => (
      <MainSection key="summary" title={t.sections.summary}>
        <p className="r-para">{basics.summary}</p>
      </MainSection>
    ),
    experience: () => (
      <MainSection key="experience" title={t.sections.experience}>
        {nonEmptyItems(resume.experience).map(item => (
          <div className="s-entry" key={item.id}>
            <div className="s-entry-head">
              <div className="s-entry-titles">
                {item.role && <span className="s-entry-role">{item.role}</span>}
                {item.company && (
                  <span className="s-entry-company">
                    {[item.company, item.location].filter(Boolean).join(' · ')}
                  </span>
                )}
              </div>
              <span className="s-entry-dates">{dateRange(item.start, item.end, present)}</span>
            </div>
            <Bullets text={item.highlights} />
          </div>
        ))}
      </MainSection>
    ),
    projects: () => (
      <MainSection key="projects" title={t.sections.projects}>
        {nonEmptyItems(resume.projects).map(item => (
          <div className="s-entry" key={item.id}>
            <div className="s-entry-head">
              <div className="s-entry-titles">
                {item.name && <span className="s-entry-role">{item.name}</span>}
                {item.role && <span className="s-entry-company">{item.role}</span>}
              </div>
              {item.link && <span className="s-entry-dates">{item.link}</span>}
            </div>
            <Bullets text={item.description} />
          </div>
        ))}
      </MainSection>
    ),
    // Education and skills live in the sidebar for this template
    education: () => null,
    skills: () => null,
  }

  return (
    <div className="s-layout">
      <div className="s-side-print-bg" aria-hidden="true" />
      <aside className="s-side">
        {basics.photo && <img className="s-photo" src={basics.photo} alt="" />}
        {contacts.length > 0 && (
          <SideSection title={t.sections.contact}>
            <div className="s-contacts">
              {contacts.map((c, i) => {
                const Tag = c.href ? 'a' : 'div'
                return (
                  <Tag className="s-contact" key={i} href={c.href}>
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
      <main className="s-main">
        <header className="s-header">
          <h1 className="s-name">{basics.name}</h1>
          {basics.title && <div className="s-title">{basics.title}</div>}
        </header>
        {sections.filter(k => !SIDE_KEYS.includes(k)).map(key => mainRender[key]())}
      </main>
    </div>
  )
}
