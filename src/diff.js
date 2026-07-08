// Structured doc diff: turns a before/after snapshot pair into
// human-readable change rows for the assistant's diff cards.

const clip = (v, n = 160) => {
  const s = String(v ?? '').trim()
  return s.length > n ? `${s.slice(0, n)}…` : s
}

function pushFieldDiffs(rows, section, before, after, fields) {
  for (const [key, label] of fields) {
    const from = String(before?.[key] ?? '')
    const to = String(after?.[key] ?? '')
    if (from !== to) rows.push({ kind: 'edit', section, field: label, from: clip(from), to: clip(to) })
  }
}

function diffList(rows, section, before, after, fields, nameOf) {
  const beforeById = new Map(before.map(item => [item.id, item]))
  const afterIds = new Set(after.map(item => item.id))
  for (const item of after) {
    const old = beforeById.get(item.id)
    if (!old) {
      rows.push({ kind: 'add', section, field: nameOf(item), from: '', to: '' })
      continue
    }
    pushFieldDiffs(rows, `${section} · ${nameOf(old)}`, old, item, fields)
  }
  for (const item of before) {
    if (!afterIds.has(item.id)) rows.push({ kind: 'remove', section, field: nameOf(item), from: '', to: '' })
  }
}

// t.diff provides section/field labels; returns [] when nothing changed.
export function diffDocs(before, after, t) {
  const L = t.diff
  const rows = []

  if (before.template !== after.template) {
    rows.push({
      kind: 'setting',
      section: L.appearance,
      field: L.template,
      from: t.templates[before.template] || before.template,
      to: t.templates[after.template] || after.template,
    })
  }
  if (before.accent !== after.accent) {
    rows.push({ kind: 'setting', section: L.appearance, field: L.accent, from: before.accent, to: after.accent })
  }
  for (const k of ['font', 'size', 'density']) {
    if (before.typography?.[k] !== after.typography?.[k]) {
      rows.push({
        kind: 'setting',
        section: L.appearance,
        field: t.typo[k === 'font' ? 'font' : k === 'size' ? 'size' : 'density'],
        from: before.typography?.[k],
        to: after.typography?.[k],
      })
    }
  }
  for (const k of ['size', 'margin', 'fitScale']) {
    if (before.page?.[k] !== after.page?.[k]) {
      rows.push({ kind: 'setting', section: L.appearance, field: L.page, from: String(before.page?.[k]), to: String(after.page?.[k]) })
    }
  }

  const rb = before.resume
  const ra = after.resume
  if (rb && ra) {
    pushFieldDiffs(rows, t.sections.basics, rb.basics, ra.basics, [
      ['name', t.fields.name],
      ['title', t.fields.title],
      ['email', t.fields.email],
      ['phone', t.fields.phone],
      ['location', t.fields.location],
      ['website', t.fields.website],
      ['github', t.fields.github],
    ])
    if ((rb.basics?.summary || '') !== (ra.basics?.summary || '')) {
      rows.push({
        kind: 'edit',
        section: t.sections.summary,
        field: '',
        from: clip(rb.basics?.summary),
        to: clip(ra.basics?.summary),
      })
    }
    diffList(rows, t.sections.experience, rb.experience, ra.experience, [
      ['company', t.fields.company],
      ['role', t.fields.role],
      ['start', t.fields.startDate],
      ['end', t.fields.endDate],
      ['location', t.fields.expLocation],
      ['highlights', t.fields.highlights],
    ], item => item.company || item.role || '?')
    diffList(rows, t.sections.projects, rb.projects, ra.projects, [
      ['name', t.fields.projectName],
      ['role', t.fields.projectRole],
      ['link', t.fields.projectLink],
      ['description', t.fields.projectDescription],
    ], item => item.name || '?')
    diffList(rows, t.sections.education, rb.education, ra.education, [
      ['school', t.fields.school],
      ['degree', t.fields.degree],
      ['major', t.fields.major],
      ['start', t.fields.startDate],
      ['end', t.fields.endDate],
      ['description', t.fields.eduDescription],
    ], item => item.school || '?')
    diffList(rows, t.sections.skills, rb.skills, ra.skills, [
      ['name', t.fields.skillName],
      ['detail', t.fields.skillDetail],
    ], item => item.name || '?')
    if (rb.sectionOrder.join() !== ra.sectionOrder.join()) {
      rows.push({ kind: 'setting', section: L.layout, field: L.sectionOrder, from: '', to: '' })
    }
    if (rb.hiddenSections.join() !== ra.hiddenSections.join()) {
      rows.push({ kind: 'setting', section: L.layout, field: L.visibility, from: '', to: '' })
    }
  }

  const cb = before.coverLetter || {}
  const ca = after.coverLetter || {}
  if ((cb.content || '') !== (ca.content || '') || Boolean(cb.enabled) !== Boolean(ca.enabled)) {
    rows.push({ kind: 'edit', section: t.cover.title, field: '', from: clip(cb.content), to: clip(ca.content) })
  }

  return rows
}
