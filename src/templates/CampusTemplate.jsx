import { Bullets, ContactList, dateRange, nonEmptyItems, visibleSections } from './shared.jsx'

function Section({ title, children }) {
  return (
    <section className="cp-section">
      <h2 className="cp-heading">{title}</h2>
      {children}
    </section>
  )
}

function EntryHead({ primary, secondary, meta }) {
  return (
    <div className="cp-entry-head">
      <div className="cp-entry-titles">
        {primary && <span className="cp-entry-primary">{primary}</span>}
        {secondary && <span className="cp-entry-secondary">{secondary}</span>}
      </div>
      {meta && <span className="cp-entry-meta">{meta}</span>}
    </div>
  )
}

export default function CampusTemplate({ resume, t }) {
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
          <div className="cp-entry" key={item.id}>
            <EntryHead
              primary={item.role}
              secondary={item.company}
              meta={[dateRange(item.start, item.end, present), item.location].filter(Boolean).join(' · ')}
            />
            <Bullets text={item.highlights} />
          </div>
        ))}
      </Section>
    ),
    projects: () => (
      <Section key="projects" title={t.sections.projects}>
        {nonEmptyItems(resume.projects).map(item => (
          <div className="cp-entry" key={item.id}>
            <EntryHead primary={item.name} secondary={item.role} meta={item.link} />
            <Bullets text={item.description} />
          </div>
        ))}
      </Section>
    ),
    education: () => (
      <Section key="education" title={t.sections.education}>
        {nonEmptyItems(resume.education).map(item => (
          <div className="cp-entry" key={item.id}>
            <EntryHead
              primary={item.school}
              secondary={[item.degree, item.major].filter(Boolean).join(' · ')}
              meta={dateRange(item.start, item.end, present)}
            />
            {item.description && <p className="r-para">{item.description}</p>}
          </div>
        ))}
      </Section>
    ),
    skills: () => (
      <Section key="skills" title={t.sections.skills}>
        <div className="cp-skills">
          {nonEmptyItems(resume.skills).map(item => (
            <div className="cp-skill" key={item.id}>
              <span className="cp-skill-chip">{item.name}</span>
              {item.detail && <span className="cp-skill-detail">{item.detail}</span>}
            </div>
          ))}
        </div>
      </Section>
    ),
  }

  return (
    <div className="cp-root">
      <header className="cp-header">
        <div className="cp-header-text">
          <h1 className="cp-name">{basics.name}</h1>
          {basics.title && <div className="cp-title">{basics.title}</div>}
          <ContactList basics={basics} className="cp-contacts" />
        </div>
        {basics.photo && <img className="cp-photo" src={basics.photo} alt="" />}
      </header>
      {visibleSections(resume).map(key => render[key]())}
    </div>
  )
}
