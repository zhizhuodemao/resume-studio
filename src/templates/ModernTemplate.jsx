import { Bullets, ContactList, dateRange, nonEmptyItems, visibleSections } from './shared.jsx'

function Section({ title, children }) {
  return (
    <section className="m-section">
      <h2 className="m-heading">{title}</h2>
      {children}
    </section>
  )
}

function Dots({ level }) {
  return (
    <span className="m-dots" aria-hidden="true">
      {[1, 2, 3, 4, 5].map(i => (
        <i key={i} className={i <= level ? 'on' : ''} />
      ))}
    </span>
  )
}

export default function ModernTemplate({ resume, t }) {
  const { basics } = resume
  const present = t.fields.present

  const render = {
    summary: () => (
      <Section key="summary" title={t.sections.summary}>
        <p className="r-para">{basics.summary}</p>
      </Section>
    ),
    experience: () => (
      <Section key="experience" title={t.sections.experience}>
        {nonEmptyItems(resume.experience).map(item => (
          <div className="m-entry" key={item.id}>
            <div className="m-entry-head">
              <div className="m-entry-titles">
                {item.role && <span className="m-entry-role">{item.role}</span>}
                {item.company && <span className="m-entry-company">{item.company}</span>}
              </div>
              <span className="m-entry-meta">
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
          <div className="m-entry" key={item.id}>
            <div className="m-entry-head">
              <div className="m-entry-titles">
                {item.name && <span className="m-entry-role">{item.name}</span>}
                {item.role && <span className="m-entry-company">{item.role}</span>}
              </div>
              {item.link && <span className="m-entry-meta">{item.link}</span>}
            </div>
            <Bullets text={item.description} />
          </div>
        ))}
      </Section>
    ),
    education: () => (
      <Section key="education" title={t.sections.education}>
        {nonEmptyItems(resume.education).map(item => (
          <div className="m-entry" key={item.id}>
            <div className="m-entry-head">
              <div className="m-entry-titles">
                {item.school && <span className="m-entry-role">{item.school}</span>}
                <span className="m-entry-company">{[item.degree, item.major].filter(Boolean).join(' · ')}</span>
              </div>
              <span className="m-entry-meta">{dateRange(item.start, item.end, present)}</span>
            </div>
            {item.description && <p className="r-para">{item.description}</p>}
          </div>
        ))}
      </Section>
    ),
    skills: () => (
      <Section key="skills" title={t.sections.skills}>
        <div className="m-skills">
          {nonEmptyItems(resume.skills).map(item => (
            <div className="m-skill" key={item.id}>
              <div className="m-skill-head">
                <span className="m-skill-name">{item.name}</span>
                <Dots level={item.level} />
              </div>
              {item.detail && <div className="m-skill-detail">{item.detail}</div>}
            </div>
          ))}
        </div>
      </Section>
    ),
  }

  return (
    <div className="m-root">
      <header className="m-header">
        <div className="m-header-text">
          <h1 className="m-name">{basics.name}</h1>
          {basics.title && <div className="m-title">{basics.title}</div>}
          <ContactList basics={basics} className="m-contacts" />
        </div>
        {basics.photo && <img className="m-photo" src={basics.photo} alt="" />}
      </header>
      {visibleSections(resume).map(key => render[key]())}
    </div>
  )
}
