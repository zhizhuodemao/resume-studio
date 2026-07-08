import { Bullets, buildContacts, dateRange, nonEmptyItems, visibleSections } from './shared.jsx'

function Section({ label, children }) {
  return (
    <section className="mn-section">
      <h2 className="mn-label">{label}</h2>
      <div className="mn-content">{children}</div>
    </section>
  )
}

function Entry({ primary, secondary, dates, children }) {
  return (
    <div className="mn-entry">
      <div className="mn-entry-head">
        {primary && <span className="mn-entry-primary">{primary}</span>}
        {secondary && <span className="mn-entry-secondary">{secondary}</span>}
        {dates && <span className="mn-entry-dates">{dates}</span>}
      </div>
      {children}
    </div>
  )
}

export default function MinimalTemplate({ resume, t }) {
  const { basics } = resume
  const present = t.fields.present
  const contacts = buildContacts(basics)

  const render = {
    summary: () => (
      <Section key="summary" label={t.sections.summary}>
        <p className="r-para mn-summary">{basics.summary}</p>
      </Section>
    ),
    experience: () => (
      <Section key="experience" label={t.sections.experience}>
        {nonEmptyItems(resume.experience).map(item => (
          <Entry
            key={item.id}
            primary={item.role}
            secondary={[item.company, item.location].filter(Boolean).join(' · ')}
            dates={dateRange(item.start, item.end, present)}
          >
            <Bullets text={item.highlights} />
          </Entry>
        ))}
      </Section>
    ),
    projects: () => (
      <Section key="projects" label={t.sections.projects}>
        {nonEmptyItems(resume.projects).map(item => (
          <Entry
            key={item.id}
            primary={item.name}
            secondary={[item.role, item.link].filter(Boolean).join(' · ')}
          >
            <Bullets text={item.description} />
          </Entry>
        ))}
      </Section>
    ),
    education: () => (
      <Section key="education" label={t.sections.education}>
        {nonEmptyItems(resume.education).map(item => (
          <Entry
            key={item.id}
            primary={item.school}
            secondary={[item.degree, item.major].filter(Boolean).join(' · ')}
            dates={dateRange(item.start, item.end, present)}
          >
            {item.description && <p className="r-para mn-desc">{item.description}</p>}
          </Entry>
        ))}
      </Section>
    ),
    skills: () => (
      <Section key="skills" label={t.sections.skills}>
        <div className="mn-skills">
          {nonEmptyItems(resume.skills).map(item => (
            <div className="mn-skill" key={item.id}>
              <span className="mn-skill-name">{item.name}</span>
              {item.detail && <span className="mn-skill-detail">{item.detail}</span>}
            </div>
          ))}
        </div>
      </Section>
    ),
  }

  return (
    <div className="mn-root">
      <header className="mn-header">
        <div className="mn-header-text">
          <h1 className="mn-name">{basics.name}</h1>
          {basics.title && <div className="mn-title">{basics.title}</div>}
          {contacts.length > 0 && (
            <div className="mn-contacts">
              {contacts.map((c, i) => (
                <span key={i}>{c.text}</span>
              ))}
            </div>
          )}
        </div>
        {basics.photo && <img className="mn-photo" src={basics.photo} alt="" />}
      </header>
      {visibleSections(resume).map(key => render[key]())}
    </div>
  )
}
