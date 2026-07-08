import { Bullets, ContactList, Para, dateRange, getCustomSection, nonEmptyItems, visibleSections } from './shared.jsx'

function Section({ title, children }) {
  return (
    <section className="tl-section">
      <h2 className="tl-heading">{title}</h2>
      {children}
    </section>
  )
}

function TimelineEntry({ dates, primary, secondary, children }) {
  return (
    <div className="tl-entry">
      <div className="tl-dates">{dates}</div>
      <div className="tl-rail" aria-hidden="true" />
      <div className="tl-content">
        <div className="tl-entry-head">
          {primary && <span className="tl-entry-primary">{primary}</span>}
          {secondary && <span className="tl-entry-secondary">{secondary}</span>}
        </div>
        {children}
      </div>
    </div>
  )
}

export default function TimelineTemplate({ resume, t }) {
  const { basics } = resume
  const present = t.fields.present

  const render = {
    summary: () => (
      <Section key="summary" title={t.sections.summary}>
        <Para className="r-para" text={basics.summary} />
      </Section>
    ),
    experience: () => (
      <Section key="experience" title={t.sections.experience}>
        <div className="tl-items">
          {nonEmptyItems(resume.experience).map(item => (
            <TimelineEntry
              key={item.id}
              dates={dateRange(item.start, item.end, present)}
              primary={item.role}
              secondary={[item.company, item.location].filter(Boolean).join(' · ')}
            >
              <Bullets text={item.highlights} />
            </TimelineEntry>
          ))}
        </div>
      </Section>
    ),
    projects: () => (
      <Section key="projects" title={t.sections.projects}>
        <div className="tl-items">
          {nonEmptyItems(resume.projects).map(item => (
            <TimelineEntry
              key={item.id}
              dates=""
              primary={item.name}
              secondary={[item.role, item.link].filter(Boolean).join(' · ')}
            >
              <Bullets text={item.description} />
            </TimelineEntry>
          ))}
        </div>
      </Section>
    ),
    education: () => (
      <Section key="education" title={t.sections.education}>
        <div className="tl-items">
          {nonEmptyItems(resume.education).map(item => (
            <TimelineEntry
              key={item.id}
              dates={dateRange(item.start, item.end, present)}
              primary={item.school}
              secondary={[item.degree, item.major].filter(Boolean).join(' · ')}
            >
              {item.description && <Para className="r-para" text={item.description} />}
            </TimelineEntry>
          ))}
        </div>
      </Section>
    ),
    skills: () => (
      <Section key="skills" title={t.sections.skills}>
        <div className="tl-skills">
          {nonEmptyItems(resume.skills).map(item => (
            <div className="tl-skill" key={item.id}>
              <span className="tl-skill-name">{item.name}</span>
              {item.detail && <span className="tl-skill-detail">{item.detail}</span>}
            </div>
          ))}
        </div>
      </Section>
    ),
  }

  const renderCustom = sec => (
    <Section key={`custom:${sec.id}`} title={sec.title}>
      <div className="tl-items">
        {nonEmptyItems(sec.items).map(item => (
          <TimelineEntry key={item.id} dates={item.meta} primary={item.title} secondary={item.subtitle}>
            <Bullets text={item.description} />
          </TimelineEntry>
        ))}
      </div>
    </Section>
  )

  return (
    <div className="tl-root">
      <header className="tl-header">
        <div>
          <h1 className="tl-name">{basics.name}</h1>
          {basics.title && <div className="tl-title">{basics.title}</div>}
        </div>
        <ContactList basics={basics} className="tl-contacts" />
      </header>
      {visibleSections(resume).map(key =>
        key.startsWith('custom:') ? renderCustom(getCustomSection(resume, key)) : render[key](),
      )}
    </div>
  )
}
