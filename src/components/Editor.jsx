import { useRef } from 'react'
import Icon from './Icon.jsx'
import { uid } from '../sampleData.js'

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
    </label>
  )
}

function AreaField({ label, hint, value, onChange, placeholder, rows = 4 }) {
  return (
    <label className="field field-full">
      <span className="field-label">
        {label}
        {hint && <em className="field-hint">{hint}</em>}
      </span>
      <textarea rows={rows} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
    </label>
  )
}

function ItemToolbar({ t, index, total, onMove, onRemove }) {
  return (
    <span className="item-toolbar">
      <button className="icon-btn" disabled={index === 0} title={t.actions.moveUp} onClick={e => { e.preventDefault(); onMove(-1) }}>
        <Icon name="up" size={13} />
      </button>
      <button className="icon-btn" disabled={index === total - 1} title={t.actions.moveDown} onClick={e => { e.preventDefault(); onMove(1) }}>
        <Icon name="down" size={13} />
      </button>
      <button className="icon-btn danger" title={t.actions.remove} onClick={e => { e.preventDefault(); onRemove() }}>
        <Icon name="trash" size={13} />
      </button>
    </span>
  )
}

function PhotoField({ t, photo, onChange }) {
  const inputRef = useRef(null)

  const handleFile = file => {
    if (!file) return
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      // Downscale to keep localStorage light
      const max = 480
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      onChange(canvas.toDataURL('image/jpeg', 0.85))
      URL.revokeObjectURL(url)
    }
    img.src = url
  }

  return (
    <div className="field photo-field">
      <span className="field-label">{t.fields.photo}</span>
      <div className="photo-row">
        {photo ? <img className="photo-preview" src={photo} alt="" /> : <div className="photo-placeholder"><Icon name="plus" size={16} /></div>}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={e => { handleFile(e.target.files[0]); e.target.value = '' }}
        />
        <button className="btn btn-small" onClick={() => inputRef.current.click()}>{t.fields.uploadPhoto}</button>
        {photo && (
          <button className="btn btn-small btn-danger" onClick={() => onChange('')}>{t.fields.removePhoto}</button>
        )}
      </div>
    </div>
  )
}

function SectionCard({ t, title, sectionKey, resume, setResume, children }) {
  const order = resume.sectionOrder
  const index = order.indexOf(sectionKey)
  const hidden = resume.hiddenSections.includes(sectionKey)

  const move = dir => {
    const next = [...order]
    const j = index + dir
    if (j < 0 || j >= next.length) return
    ;[next[index], next[j]] = [next[j], next[index]]
    setResume(r => ({ ...r, sectionOrder: next }))
  }
  const toggleHidden = () => {
    setResume(r => ({
      ...r,
      hiddenSections: hidden ? r.hiddenSections.filter(k => k !== sectionKey) : [...r.hiddenSections, sectionKey],
    }))
  }

  return (
    <details className={`section-card ${hidden ? 'section-hidden' : ''}`} open>
      <summary>
        <Icon name="chevron" size={14} className="section-chevron" />
        <span className="section-title">{title}</span>
        <span className="section-tools" onClick={e => e.preventDefault()}>
          {index > 0 && (
            <button className="icon-btn" title={t.actions.moveUp} onClick={() => move(-1)}>
              <Icon name="up" size={13} />
            </button>
          )}
          {index >= 0 && index < order.length - 1 && (
            <button className="icon-btn" title={t.actions.moveDown} onClick={() => move(1)}>
              <Icon name="down" size={13} />
            </button>
          )}
          <button
            className="icon-btn"
            title={hidden ? t.actions.showSection : t.actions.hideSection}
            onClick={toggleHidden}
          >
            <Icon name={hidden ? 'eyeOff' : 'eye'} size={14} />
          </button>
        </span>
      </summary>
      <div className="section-body">{children}</div>
    </details>
  )
}

export default function Editor({ t, resume, setResume, placeholders }) {
  const f = t.fields
  const ph = placeholders || {}
  const setBasics = patch => setResume(r => ({ ...r, basics: { ...r.basics, ...patch } }))

  const listOps = key => ({
    update: (id, patch) =>
      setResume(r => ({ ...r, [key]: r[key].map(item => (item.id === id ? { ...item, ...patch } : item)) })),
    remove: id => setResume(r => ({ ...r, [key]: r[key].filter(item => item.id !== id) })),
    move: (i, dir) =>
      setResume(r => {
        const next = [...r[key]]
        const j = i + dir
        if (j < 0 || j >= next.length) return r
        ;[next[i], next[j]] = [next[j], next[i]]
        return { ...r, [key]: next }
      }),
    add: item => setResume(r => ({ ...r, [key]: [...r[key], { id: uid(), ...item }] })),
  })

  const exp = listOps('experience')
  const proj = listOps('projects')
  const edu = listOps('education')
  const skill = listOps('skills')

  const sectionEditors = {
    summary: (
      <SectionCard key="summary" t={t} title={t.sections.summary} sectionKey="summary" resume={resume} setResume={setResume}>
        <AreaField
          label={t.sections.summary}
          value={resume.basics.summary}
          placeholder={ph.summary || f.summaryPlaceholder}
          rows={5}
          onChange={v => setBasics({ summary: v })}
        />
      </SectionCard>
    ),

    experience: (
      <SectionCard key="experience" t={t} title={t.sections.experience} sectionKey="experience" resume={resume} setResume={setResume}>
        {resume.experience.map((item, i) => (
          <details className="entry-card" key={item.id} open>
            <summary>
              <Icon name="chevron" size={13} className="section-chevron" />
              <span className="entry-title">
                {item.role || item.company ? [item.role, item.company].filter(Boolean).join(' · ') : t.untitled}
              </span>
              <ItemToolbar t={t} index={i} total={resume.experience.length} onMove={d => exp.move(i, d)} onRemove={() => exp.remove(item.id)} />
            </summary>
            <div className="entry-body">
              <div className="field-grid">
                <Field label={f.company} value={item.company} onChange={v => exp.update(item.id, { company: v })} />
                <Field label={f.role} value={item.role} onChange={v => exp.update(item.id, { role: v })} />
                <Field label={f.startDate} value={item.start} placeholder="2022.03" onChange={v => exp.update(item.id, { start: v })} />
                <Field label={f.endDate} value={item.end} placeholder={f.present} onChange={v => exp.update(item.id, { end: v })} />
                <Field label={f.expLocation} value={item.location} onChange={v => exp.update(item.id, { location: v })} />
              </div>
              <AreaField
                label={f.highlights}
                hint={f.highlightsHint}
                value={item.highlights}
                placeholder={ph.highlights}
                rows={5}
                onChange={v => exp.update(item.id, { highlights: v })}
              />
            </div>
          </details>
        ))}
        <button className="btn btn-add" onClick={() => exp.add({ company: '', role: '', start: '', end: '', location: '', highlights: '' })}>
          <Icon name="plus" size={14} /> {t.actions.add}
        </button>
      </SectionCard>
    ),

    projects: (
      <SectionCard key="projects" t={t} title={t.sections.projects} sectionKey="projects" resume={resume} setResume={setResume}>
        {resume.projects.map((item, i) => (
          <details className="entry-card" key={item.id} open>
            <summary>
              <Icon name="chevron" size={13} className="section-chevron" />
              <span className="entry-title">{item.name || t.untitled}</span>
              <ItemToolbar t={t} index={i} total={resume.projects.length} onMove={d => proj.move(i, d)} onRemove={() => proj.remove(item.id)} />
            </summary>
            <div className="entry-body">
              <div className="field-grid">
                <Field label={f.projectName} value={item.name} onChange={v => proj.update(item.id, { name: v })} />
                <Field label={f.projectRole} value={item.role} onChange={v => proj.update(item.id, { role: v })} />
                <Field label={f.projectLink} value={item.link} onChange={v => proj.update(item.id, { link: v })} />
              </div>
              <AreaField
                label={f.projectDescription}
                hint={f.projectDescriptionHint}
                value={item.description}
                placeholder={ph.projectDescription}
                rows={4}
                onChange={v => proj.update(item.id, { description: v })}
              />
            </div>
          </details>
        ))}
        <button className="btn btn-add" onClick={() => proj.add({ name: '', role: '', link: '', description: '' })}>
          <Icon name="plus" size={14} /> {t.actions.add}
        </button>
      </SectionCard>
    ),

    education: (
      <SectionCard key="education" t={t} title={t.sections.education} sectionKey="education" resume={resume} setResume={setResume}>
        {resume.education.map((item, i) => (
          <details className="entry-card" key={item.id} open>
            <summary>
              <Icon name="chevron" size={13} className="section-chevron" />
              <span className="entry-title">{item.school || t.untitled}</span>
              <ItemToolbar t={t} index={i} total={resume.education.length} onMove={d => edu.move(i, d)} onRemove={() => edu.remove(item.id)} />
            </summary>
            <div className="entry-body">
              <div className="field-grid">
                <Field label={f.school} value={item.school} onChange={v => edu.update(item.id, { school: v })} />
                <Field label={f.degree} value={item.degree} onChange={v => edu.update(item.id, { degree: v })} />
                <Field label={f.major} value={item.major} onChange={v => edu.update(item.id, { major: v })} />
                <Field label={f.startDate} value={item.start} placeholder="2015.09" onChange={v => edu.update(item.id, { start: v })} />
                <Field label={f.endDate} value={item.end} placeholder="2019.06" onChange={v => edu.update(item.id, { end: v })} />
              </div>
              <AreaField label={f.eduDescription} value={item.description} rows={2} onChange={v => edu.update(item.id, { description: v })} />
            </div>
          </details>
        ))}
        <button className="btn btn-add" onClick={() => edu.add({ school: '', degree: '', major: '', start: '', end: '', description: '' })}>
          <Icon name="plus" size={14} /> {t.actions.add}
        </button>
      </SectionCard>
    ),

    skills: (
      <SectionCard key="skills" t={t} title={t.sections.skills} sectionKey="skills" resume={resume} setResume={setResume}>
        {resume.skills.map((item, i) => (
          <div className="entry-card skill-card" key={item.id}>
            <div className="skill-row">
              <input
                className="skill-name"
                value={item.name}
                placeholder={f.skillName}
                onChange={e => skill.update(item.id, { name: e.target.value })}
              />
              <label className="skill-level" title={`${f.skillLevel}: ${t.skillLevels[item.level - 1] || ''}`}>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={item.level}
                  onChange={e => skill.update(item.id, { level: Number(e.target.value) })}
                />
                <span className="skill-level-text">{t.skillLevels[item.level - 1]}</span>
              </label>
              <ItemToolbar t={t} index={i} total={resume.skills.length} onMove={d => skill.move(i, d)} onRemove={() => skill.remove(item.id)} />
            </div>
            <input
              className="skill-detail"
              value={item.detail || ''}
              placeholder={ph.skillDetail || f.skillDetail}
              onChange={e => skill.update(item.id, { detail: e.target.value })}
            />
          </div>
        ))}
        <button className="btn btn-add" onClick={() => skill.add({ name: '', level: 3, detail: '' })}>
          <Icon name="plus" size={14} /> {t.actions.add}
        </button>
      </SectionCard>
    ),
  }

  return (
    <aside className="editor">
      <details className="section-card" open>
        <summary>
          <Icon name="chevron" size={14} className="section-chevron" />
          <span className="section-title">{t.sections.basics}</span>
        </summary>
        <div className="section-body">
          <div className="field-grid">
            <Field label={f.name} value={resume.basics.name} onChange={v => setBasics({ name: v })} />
            <Field label={f.title} value={resume.basics.title} onChange={v => setBasics({ title: v })} />
            <Field label={f.email} value={resume.basics.email} onChange={v => setBasics({ email: v })} />
            <Field label={f.phone} value={resume.basics.phone} onChange={v => setBasics({ phone: v })} />
            <Field label={f.location} value={resume.basics.location} onChange={v => setBasics({ location: v })} />
            <Field label={f.website} value={resume.basics.website} onChange={v => setBasics({ website: v })} />
            <Field label={f.github} value={resume.basics.github} onChange={v => setBasics({ github: v })} />
          </div>
          <PhotoField t={t} photo={resume.basics.photo} onChange={v => setBasics({ photo: v })} />
        </div>
      </details>
      {resume.sectionOrder.map(key => sectionEditors[key])}
    </aside>
  )
}
