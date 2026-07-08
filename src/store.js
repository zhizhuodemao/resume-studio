import { uid, emptyResume, DEFAULT_SECTION_ORDER } from './sampleData.js'

export const SCHEMA_VERSION = 2
export const STORAGE_KEY = 'resume-studio-v2'
export const LEGACY_STORAGE_KEY = 'resume-studio-v1'

export const DEFAULT_TYPOGRAPHY = { font: 'default', size: 'm', density: 'normal' }
export const DEFAULT_ACCENT = '#2563eb'

/* ---------- Document factory & normalization ---------- */

export function makeDoc({ name = '', resume, template = 'modern', accent = DEFAULT_ACCENT, track = null, typography } = {}) {
  const now = new Date().toISOString()
  return {
    id: uid(),
    name,
    createdAt: now,
    updatedAt: now,
    template,
    accent,
    track,
    typography: { ...DEFAULT_TYPOGRAPHY, ...typography },
    resume: normalizeResume(resume || emptyResume()),
  }
}

const str = v => (typeof v === 'string' ? v : '')

// Fill any missing fields so imported / legacy data can't crash templates.
export function normalizeResume(r) {
  const src = r && typeof r === 'object' ? r : {}
  const basics = src.basics && typeof src.basics === 'object' ? src.basics : {}
  const list = v => (Array.isArray(v) ? v : [])
  const withId = item => ({ ...item, id: typeof item.id === 'string' ? item.id : uid() })
  return {
    basics: {
      name: str(basics.name),
      title: str(basics.title),
      email: str(basics.email),
      phone: str(basics.phone),
      location: str(basics.location),
      website: str(basics.website),
      github: str(basics.github),
      photo: str(basics.photo),
      summary: str(basics.summary),
    },
    experience: list(src.experience).map(e => withId({
      company: str(e.company), role: str(e.role), start: str(e.start), end: str(e.end),
      location: str(e.location), highlights: str(e.highlights), id: e.id,
    })),
    projects: list(src.projects).map(p => withId({
      name: str(p.name), role: str(p.role), link: str(p.link), description: str(p.description), id: p.id,
    })),
    education: list(src.education).map(e => withId({
      school: str(e.school), degree: str(e.degree), major: str(e.major),
      start: str(e.start), end: str(e.end), description: str(e.description), id: e.id,
    })),
    skills: list(src.skills).map(s => withId({
      name: str(s.name), level: Number.isFinite(s.level) ? Math.min(5, Math.max(1, s.level)) : 3,
      detail: str(s.detail), id: s.id,
    })),
    sectionOrder: Array.isArray(src.sectionOrder) && src.sectionOrder.length
      ? src.sectionOrder.filter(k => typeof k === 'string')
      : [...DEFAULT_SECTION_ORDER],
    hiddenSections: Array.isArray(src.hiddenSections) ? src.hiddenSections.filter(k => typeof k === 'string') : [],
  }
}

function normalizeDoc(d) {
  const doc = d && typeof d === 'object' ? d : {}
  return {
    id: typeof doc.id === 'string' ? doc.id : uid(),
    name: str(doc.name),
    createdAt: str(doc.createdAt) || new Date().toISOString(),
    updatedAt: str(doc.updatedAt) || new Date().toISOString(),
    template: typeof doc.template === 'string' ? doc.template : 'modern',
    accent: /^#[0-9a-fA-F]{6}$/.test(doc.accent) ? doc.accent : DEFAULT_ACCENT,
    track: typeof doc.track === 'string' ? doc.track : null,
    typography: { ...DEFAULT_TYPOGRAPHY, ...(doc.typography && typeof doc.typography === 'object' ? doc.typography : {}) },
    resume: normalizeResume(doc.resume),
  }
}

/* ---------- Migration ---------- */

const looksLikeResume = r => Boolean(r && typeof r === 'object' && r.basics && typeof r.basics === 'object')

// Accepts any historical persisted shape and returns a v2 state, or null.
export function migrate(raw) {
  if (!raw || typeof raw !== 'object') return null

  // v2: { version: 2, lang, activeId, resumes: [...] }
  if (raw.version === 2 && Array.isArray(raw.resumes)) {
    const resumes = raw.resumes.filter(d => looksLikeResume(d?.resume)).map(normalizeDoc)
    if (!resumes.length) return null
    const activeId = resumes.some(d => d.id === raw.activeId) ? raw.activeId : resumes[0].id
    return {
      version: 2,
      lang: raw.lang === 'en' ? 'en' : 'zh',
      activeId,
      resumes,
    }
  }

  // v1: { lang, template, accent, track?, typography?, resume }
  if (looksLikeResume(raw.resume)) {
    const doc = normalizeDoc({
      name: '',
      template: raw.template,
      accent: raw.accent,
      track: raw.track,
      typography: raw.typography,
      resume: raw.resume,
    })
    return { version: 2, lang: raw.lang === 'en' ? 'en' : 'zh', activeId: doc.id, resumes: [doc] }
  }

  return null
}

/* ---------- Persistence ---------- */

export function loadPersistedState() {
  try {
    const rawV2 = localStorage.getItem(STORAGE_KEY)
    if (rawV2) {
      const migrated = migrate(JSON.parse(rawV2))
      if (migrated) return migrated
    }
    const rawV1 = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (rawV1) {
      const migrated = migrate(JSON.parse(rawV1))
      if (migrated) return migrated // legacy key kept as a safety net; v2 becomes source of truth on next save
    }
  } catch {
    /* corrupted storage — start fresh */
  }
  return null
}

export function savePersistedState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

/* ---------- Import / export ---------- */

export function serializeDoc(doc) {
  return JSON.stringify({ app: 'resume-studio', schema: SCHEMA_VERSION, type: 'resume-doc', doc }, null, 2)
}

// Accepts: our export format, a bare doc, a bare resume object, or a whole v1/v2 state dump.
export function parseImport(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('invalid-json')
  }
  if (!data || typeof data !== 'object') throw new Error('unrecognized')

  let doc = null
  if (data.type === 'resume-doc' && looksLikeResume(data.doc?.resume)) doc = data.doc
  else if (looksLikeResume(data.resume)) doc = data // bare doc or v1 state
  else if (Array.isArray(data.resumes) && looksLikeResume(data.resumes[0]?.resume)) doc = data.resumes[0] // v2 state dump
  else if (looksLikeResume(data)) doc = { resume: data } // bare resume

  if (!doc) throw new Error('unrecognized')
  const normalized = normalizeDoc(doc)
  normalized.id = uid() // imported copies never collide with existing docs
  return normalized
}
