import { Bullets, ContactList, dateRange, nonEmptyItems, visibleSections } from './shared.jsx'

function Section({ title, children }) {
  return (
    <section className="c-section">
      <h2 className="c-heading">{title}</h2>
      {children}
    </section>
  )
}

function EntryHead({ primary, secondary, dates }) {
  return (
    <div className="c-entry-head">
      <div className="c-entry-main">
        {primary && <span className="c-entry-primary">{primary}</span>}
        {secondary && <span className="c-entry-secondary">{secondary}</span>}
      </div>
      {dates && <span className="c-entry-dates">{dates}</span>}
    </div>
  )
}

export default function ClassicTemplate({ resume, t }) {
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
          <div className="c-entry" key={item.id}>
            <EntryHead
              primary={item.role}
              secondary={[item.company, item.location].filter(Boolean).join(' · ')}
              dates={dateRange(item.start, item.end, present)}
            />
            <Bullets text={item.highlights} />
          </div>
        ))}
      </Section>
    ),
    projects: () => (
      <Section key="projects" title={t.sections.projects}>
        {nonEmptyItems(resume.projects).map(item => (
          <div className="c-entry" key={item.id}>
            <EntryHead primary={item.name} secondary={[item.role, item.link].filter(Boolean).join(' · ')} />
            <Bullets text={item.description} />
          </div>
        ))}
      </Section>
    ),
    education: () => (
      <Section key="education" title={t.sections.education}>
        {nonEmptyItems(resume.education).map(item => (
          <div className="c-entry" key={item.id}>
            <EntryHead
              primary={item.school}
              secondary={[item.degree, item.major].filter(Boolean).join(' · ')}
              dates={dateRange(item.start, item.end, present)}
            />
            {item.description && <p className="r-para c-edu-desc">{item.description}</p>}
          </div>
        ))}
      </Section>
    ),
    skills: () => (
      <Section key="skills" title={t.sections.skills}>
        <div className="c-skills">
          {nonEmptyItems(resume.skills).map(item => (
            <div className="c-skill" key={item.id}>
              <span className="c-skill-name">{item.name}</span>
              {item.detail && <span className="c-skill-detail">{item.detail}</span>}
            </div>
          ))}
        </div>
      </Section>
    ),
  }

  return (
    <div className="c-root">
      <header className="c-header">
        {basics.photo && <img className="c-photo" src={basics.photo} alt="" />}
        <h1 className="c-name">{basics.name}</h1>
        {basics.title && <div className="c-title">{basics.title}</div>}
        <ContactList basics={basics} withIcons={false} className="c-contacts" />
      </header>
      {visibleSections(resume).map(key => render[key]())}
    </div>
  )
}
