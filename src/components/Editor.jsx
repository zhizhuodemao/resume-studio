import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { uid } from '../sampleData.js'
import { polishText } from '../ai.js'

function AiAssist({ t, getPayload, onApply }) {
  const [phase, setPhase] = useState('idle') // idle | loading | preview | error
  const [result, setResult] = useState('')

  const run = async () => {
    const payload = getPayload()
    if (!payload.text || !payload.text.trim()) return
    setPhase('loading')
    try {
      setResult(await polishText(payload.text, payload))
      setPhase('preview')
    } catch (err) {
      console.error(err)
      setPhase('error')
    }
  }

  if (phase === 'preview') {
    return (
      <div className="ai-preview">
        <div className="ai-preview-text">{result}</div>
        <div className="ai-preview-actions">
          <button
            className="btn btn-small ai-apply"
            onClick={() => {
              onApply(result)
              setPhase('idle')
            }}
          >
            {t.ai.apply}
          </button>
          <button className="btn btn-small" onClick={() => setPhase('idle')}>
            {t.ai.discard}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="ai-assist">
      <button type="button" className="ai-btn" onClick={run} disabled={phase === 'loading'}>
        {phase === 'loading' ? t.ai.polishing : `✨ ${t.ai.polish}`}
      </button>
      {phase === 'error' && <span className="ai-error">{t.ai.error}</span>}
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
    </label>
  )
}

// rich: pass the i18n labels object to enable the **bold** / *italic* / [link](url) toolbar
function AreaField({ label, hint, value, onChange, placeholder, rows = 4, rich = null }) {
  const taRef = useRef(null)

  const wrapSelection = (before, after) => {
    const el = taRef.current
    if (!el) return
    const s = el.selectionStart ?? 0
    const e = el.selectionEnd ?? 0
    const sel = el.value.slice(s, e)
    const next = el.value.slice(0, s) + before + sel + after + el.value.slice(e)
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(s + before.length, s + before.length + sel.length)
    })
  }

  return (
    <label className="field field-full">
      <span className="field-label">
        {label}
        {hint && <em className="field-hint">{hint}</em>}
        {rich && (
          <span className="richbar">
            <button type="button" title={rich.bold} onClick={e => { e.preventDefault(); wrapSelection('**', '**') }}>
              B
            </button>
            <button type="button" title={rich.italic} onClick={e => { e.preventDefault(); wrapSelection('*', '*') }}>
              I
            </button>
            <button type="button" title={rich.link} onClick={e => { e.preventDefault(); wrapSelection('[', '](https://)') }}>
              🔗
            </button>
          </span>
        )}
      </span>
      <textarea ref={taRef} rows={rows} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
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

function PhotoEditModal({ t, src, onSave, onClose }) {
  const SIZE = 280
  const canvasRef = useRef(null)
  const imgRef = useRef(null)
  const dragRef = useRef(null)
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  const draw = (targetCanvas, scaleFactor = 1) => {
    const canvas = targetCanvas || canvasRef.current
    const img = imgRef.current
    if (!canvas || !img) return
    const size = SIZE * scaleFactor
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, size, size)
    const cover = Math.max(size / img.width, size / img.height)
    const s = cover * zoom
    const w = img.width * s
    const h = img.height * s
    ctx.drawImage(img, size / 2 - w / 2 + pos.x * scaleFactor, size / 2 - h / 2 + pos.y * scaleFactor, w, h)
  }

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      draw()
    }
    img.src = src
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  // redraw whenever zoom / position changes
  useEffect(() => {
    draw()
  })

  const onPointerDown = e => {
    dragRef.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    e.target.setPointerCapture(e.pointerId)
  }
  const onPointerMove = e => {
    if (!dragRef.current) return
    setPos({ x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y })
  }
  const onPointerUp = () => {
    dragRef.current = null
  }

  const save = () => {
    const out = document.createElement('canvas')
    const factor = 480 / SIZE
    out.width = 480
    out.height = 480
    draw(out, factor)
    onSave(out.toDataURL('image/jpeg', 0.88))
  }

  return (
    <div className="onboard-overlay" role="dialog" aria-modal="true">
      <div className="photo-modal">
        <h2 className="photo-modal-title">{t.photoEditor.title}</h2>
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          className="photo-canvas"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
        <p className="photo-modal-hint">{t.photoEditor.hint}</p>
        <label className="photo-zoom">
          <span>{t.photoEditor.zoom}</span>
          <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={e => setZoom(Number(e.target.value))} />
        </label>
        <div className="onboard-actions">
          <button className="btn btn-primary" onClick={save}>
            {t.photoEditor.save}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            {t.photoEditor.cancel}
          </button>
        </div>
      </div>
    </div>
  )
}

function PhotoField({ t, photo, onChange }) {
  const inputRef = useRef(null)
  const [editing, setEditing] = useState(false)

  const handleFile = file => {
    if (!file) return
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
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
          <>
            <button className="btn btn-small" onClick={() => setEditing(true)}>{t.photoEditor.edit}</button>
            <button className="btn btn-small btn-danger" onClick={() => onChange('')}>{t.fields.removePhoto}</button>
          </>
        )}
      </div>
      {editing && (
        <PhotoEditModal
          t={t}
          src={photo}
          onSave={v => {
            onChange(v)
            setEditing(false)
          }}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  )
}

function SectionCard({ t, title, sectionKey, resume, setResume, children, onRename, onDelete, dnd }) {
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

  const dropProps = dnd
    ? {
        onDragOver: e => {
          if (dnd.dragInfo.current?.list === 'sections') e.preventDefault()
        },
        onDrop: e => {
          const info = dnd.dragInfo.current
          if (!info || info.list !== 'sections') return
          e.preventDefault()
          dnd.dragInfo.current = null
          if (info.index !== index) dnd.reorderSections(info.index, index)
        },
      }
    : {}

  return (
    <details className={`section-card ${hidden ? 'section-hidden' : ''}`} open {...dropProps}>
      <summary>
        {dnd && (
          <span
            className="drag-handle"
            title={t.actions.drag}
            draggable
            onClick={e => e.preventDefault()}
            onDragStart={e => {
              dnd.dragInfo.current = { list: 'sections', index }
              e.dataTransfer.effectAllowed = 'move'
            }}
          >
            ⠿
          </span>
        )}
        <Icon name="chevron" size={14} className="section-chevron" />
        {onRename ? (
          <input
            className="section-title-input"
            value={title}
            placeholder={t.customSec.titlePlaceholder}
            onClick={e => e.preventDefault()}
            onChange={e => onRename(e.target.value)}
          />
        ) : (
          <span className="section-title">{title}</span>
        )}
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
          {onDelete && (
            <button className="icon-btn danger" title={t.customSec.deleteSection} onClick={onDelete}>
              <Icon name="trash" size={13} />
            </button>
          )}
        </span>
      </summary>
      <div className="section-body">{children}</div>
    </details>
  )
}

const CUSTOM_PRESETS = ['certificate', 'language', 'award', 'volunteer', 'custom']

export default function Editor({ t, resume, setResume, placeholders }) {
  const f = t.fields
  const ph = placeholders || {}
  const setBasics = patch => setResume(r => ({ ...r, basics: { ...r.basics, ...patch } }))

  /* ---------- Drag & drop ---------- */
  const dragInfo = useRef(null)
  const [addOpen, setAddOpen] = useState(false)

  const reorderSections = (from, to) =>
    setResume(r => {
      const next = [...r.sectionOrder]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return { ...r, sectionOrder: next }
    })

  const dnd = { dragInfo, reorderSections }

  const entryDnd = (list, index, reorder) => ({
    handle: {
      draggable: true,
      title: t.actions.drag,
      onClick: e => e.preventDefault(),
      onDragStart: e => {
        e.stopPropagation()
        dragInfo.current = { list, index }
        e.dataTransfer.effectAllowed = 'move'
      },
    },
    drop: {
      onDragOver: e => {
        if (dragInfo.current?.list === list) {
          e.preventDefault()
          e.stopPropagation()
        }
      },
      onDrop: e => {
        const info = dragInfo.current
        if (!info || info.list !== list) return
        e.preventDefault()
        e.stopPropagation()
        dragInfo.current = null
        if (info.index !== index) reorder(info.index, index)
      },
    },
  })

  /* ---------- List operations ---------- */
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
    reorder: (from, to) =>
      setResume(r => {
        const next = [...r[key]]
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved)
        return { ...r, [key]: next }
      }),
    add: item => setResume(r => ({ ...r, [key]: [...r[key], { id: uid(), ...item }] })),
  })

  const exp = listOps('experience')
  const proj = listOps('projects')
  const edu = listOps('education')
  const skill = listOps('skills')

  /* ---------- Custom sections ---------- */
  const customOps = {
    add: title =>
      setResume(r => {
        const id = uid()
        return {
          ...r,
          customSections: [...(r.customSections || []), { id, title, items: [] }],
          sectionOrder: [...r.sectionOrder, `custom:${id}`],
        }
      }),
    rename: (id, title) =>
      setResume(r => ({
        ...r,
        customSections: r.customSections.map(c => (c.id === id ? { ...c, title } : c)),
      })),
    remove: id =>
      setResume(r => ({
        ...r,
        customSections: r.customSections.filter(c => c.id !== id),
        sectionOrder: r.sectionOrder.filter(k => k !== `custom:${id}`),
        hiddenSections: r.hiddenSections.filter(k => k !== `custom:${id}`),
      })),
    patchItems: (id, fn) =>
      setResume(r => ({
        ...r,
        customSections: r.customSections.map(c => (c.id === id ? { ...c, items: fn(c.items) } : c)),
      })),
  }
  const customItemOps = secId => ({
    add: () => customOps.patchItems(secId, items => [...items, { id: uid(), title: '', subtitle: '', meta: '', description: '' }]),
    update: (itemId, patch) =>
      customOps.patchItems(secId, items => items.map(it => (it.id === itemId ? { ...it, ...patch } : it))),
    remove: itemId => customOps.patchItems(secId, items => items.filter(it => it.id !== itemId)),
    move: (i, dir) =>
      customOps.patchItems(secId, items => {
        const next = [...items]
        const j = i + dir
        if (j < 0 || j >= next.length) return items
        ;[next[i], next[j]] = [next[j], next[i]]
        return next
      }),
    reorder: (from, to) =>
      customOps.patchItems(secId, items => {
        const next = [...items]
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved)
        return next
      }),
  })

  const renderCustomEditor = sec => {
    const key = `custom:${sec.id}`
    const ops = customItemOps(sec.id)
    return (
      <SectionCard
        key={key}
        t={t}
        title={sec.title}
        sectionKey={key}
        resume={resume}
        setResume={setResume}
        dnd={dnd}
        onRename={v => customOps.rename(sec.id, v)}
        onDelete={() => {
          if (window.confirm(t.customSec.confirmDelete)) customOps.remove(sec.id)
        }}
      >
        {sec.items.map((item, i) => {
          const dd = entryDnd(`custom-items:${sec.id}`, i, ops.reorder)
          return (
            <details className="entry-card" key={item.id} open {...dd.drop}>
              <summary>
                <span className="drag-handle" {...dd.handle}>⠿</span>
                <Icon name="chevron" size={13} className="section-chevron" />
                <span className="entry-title">{item.title || t.untitled}</span>
                <ItemToolbar t={t} index={i} total={sec.items.length} onMove={d => ops.move(i, d)} onRemove={() => ops.remove(item.id)} />
              </summary>
              <div className="entry-body">
                <div className="field-grid">
                  <Field label={t.customSec.fields.title} value={item.title} onChange={v => ops.update(item.id, { title: v })} />
                  <Field label={t.customSec.fields.subtitle} value={item.subtitle} onChange={v => ops.update(item.id, { subtitle: v })} />
                  <Field label={t.customSec.fields.meta} value={item.meta} onChange={v => ops.update(item.id, { meta: v })} />
                </div>
                <AreaField
                  label={t.customSec.fields.description}
                  hint={f.highlightsHint}
                  value={item.description}
                  rows={3}
                  rich={t.rich}
                  onChange={v => ops.update(item.id, { description: v })}
                />
              </div>
            </details>
          )
        })}
        <button className="btn btn-add" onClick={ops.add}>
          <Icon name="plus" size={14} /> {t.actions.add}
        </button>
      </SectionCard>
    )
  }

  /* ---------- Fixed sections ---------- */
  const sectionEditors = {
    summary: (
      <SectionCard key="summary" t={t} title={t.sections.summary} sectionKey="summary" resume={resume} setResume={setResume} dnd={dnd}>
        <AreaField
          label={t.sections.summary}
          value={resume.basics.summary}
          placeholder={ph.summary || f.summaryPlaceholder}
          rows={5}
          rich={t.rich}
          onChange={v => setBasics({ summary: v })}
        />
        <AiAssist
          t={t}
          getPayload={() => ({ text: resume.basics.summary, kind: 'summary', role: resume.basics.title })}
          onApply={v => setBasics({ summary: v })}
        />
      </SectionCard>
    ),

    experience: (
      <SectionCard key="experience" t={t} title={t.sections.experience} sectionKey="experience" resume={resume} setResume={setResume} dnd={dnd}>
        {resume.experience.map((item, i) => {
          const dd = entryDnd('experience', i, exp.reorder)
          return (
            <details className="entry-card" key={item.id} open {...dd.drop}>
              <summary>
                <span className="drag-handle" {...dd.handle}>⠿</span>
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
                  rich={t.rich}
                  onChange={v => exp.update(item.id, { highlights: v })}
                />
                <AiAssist
                  t={t}
                  getPayload={() => ({ text: item.highlights, kind: 'highlights', role: item.role, company: item.company })}
                  onApply={v => exp.update(item.id, { highlights: v })}
                />
              </div>
            </details>
          )
        })}
        <button className="btn btn-add" onClick={() => exp.add({ company: '', role: '', start: '', end: '', location: '', highlights: '' })}>
          <Icon name="plus" size={14} /> {t.actions.add}
        </button>
      </SectionCard>
    ),

    projects: (
      <SectionCard key="projects" t={t} title={t.sections.projects} sectionKey="projects" resume={resume} setResume={setResume} dnd={dnd}>
        {resume.projects.map((item, i) => {
          const dd = entryDnd('projects', i, proj.reorder)
          return (
            <details className="entry-card" key={item.id} open {...dd.drop}>
              <summary>
                <span className="drag-handle" {...dd.handle}>⠿</span>
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
                  rich={t.rich}
                  onChange={v => proj.update(item.id, { description: v })}
                />
                <AiAssist
                  t={t}
                  getPayload={() => ({ text: item.description, kind: 'project', role: item.role, name: item.name })}
                  onApply={v => proj.update(item.id, { description: v })}
                />
              </div>
            </details>
          )
        })}
        <button className="btn btn-add" onClick={() => proj.add({ name: '', role: '', link: '', description: '' })}>
          <Icon name="plus" size={14} /> {t.actions.add}
        </button>
      </SectionCard>
    ),

    education: (
      <SectionCard key="education" t={t} title={t.sections.education} sectionKey="education" resume={resume} setResume={setResume} dnd={dnd}>
        {resume.education.map((item, i) => {
          const dd = entryDnd('education', i, edu.reorder)
          return (
            <details className="entry-card" key={item.id} open {...dd.drop}>
              <summary>
                <span className="drag-handle" {...dd.handle}>⠿</span>
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
          )
        })}
        <button className="btn btn-add" onClick={() => edu.add({ school: '', degree: '', major: '', start: '', end: '', description: '' })}>
          <Icon name="plus" size={14} /> {t.actions.add}
        </button>
      </SectionCard>
    ),

    skills: (
      <SectionCard key="skills" t={t} title={t.sections.skills} sectionKey="skills" resume={resume} setResume={setResume} dnd={dnd}>
        {resume.skills.map((item, i) => {
          const dd = entryDnd('skills', i, skill.reorder)
          return (
            <div className="entry-card skill-card" key={item.id} {...dd.drop}>
              <div className="skill-row">
                <span className="drag-handle" {...dd.handle}>⠿</span>
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
          )
        })}
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

      {resume.sectionOrder.map(key => {
        if (key.startsWith('custom:')) {
          const sec = (resume.customSections || []).find(c => `custom:${c.id}` === key)
          return sec ? renderCustomEditor(sec) : null
        }
        return sectionEditors[key]
      })}

      <div className="add-section">
        <button className="btn btn-add" onClick={() => setAddOpen(o => !o)}>
          <Icon name="plus" size={14} /> {t.customSec.addSection}
        </button>
        {addOpen && (
          <div className="add-section-menu">
            {CUSTOM_PRESETS.map(p => (
              <button
                key={p}
                className="btn btn-small"
                onClick={() => {
                  customOps.add(p === 'custom' ? '' : t.customSec.presets[p])
                  setAddOpen(false)
                }}
              >
                {t.customSec.presets[p]}
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
