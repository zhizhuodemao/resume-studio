import { describe, it, expect } from 'vitest'
import { applyCommandAction, applyContentPatch } from './commander.js'
import { MESSAGES } from './i18n.js'

const t = MESSAGES.zh
const doc = {
  template: 'modern',
  accent: '#2563eb',
  typography: { font: 'default', size: 'm', density: 'normal' },
  page: { size: 'a4', margin: 'normal', fitScale: 1 },
  resume: {
    basics: { name: 'A', title: '', location: '', email: '', phone: '', website: '', github: '', photo: '', summary: '旧' },
    experience: [{ id: 'e1', company: 'X', role: 'PM', start: '', end: '', location: '', highlights: '旧要点' }],
    projects: [{ id: 'p1', name: 'P', role: '', link: '', description: '旧描述' }],
    education: [], skills: [], customSections: [],
    sectionOrder: ['summary', 'experience', 'projects', 'education', 'skills'],
    hiddenSections: [],
  },
}

describe('applyCommandAction', () => {
  it('switches template with a readable label', () => {
    const res = applyCommandAction(doc, { name: 'set_template', args: { template: 'timeline' } }, t)
    expect(res.doc.template).toBe('timeline')
    expect(res.label).toContain('时间线')
  })

  it('rejects invalid accent colors and templates', () => {
    expect(applyCommandAction(doc, { name: 'set_accent', args: { color: 'red' } }, t)).toBeNull()
    expect(applyCommandAction(doc, { name: 'set_template', args: {} }, t)).toBeNull()
  })

  it('reorders sections keeping unknown keys out and missing keys appended', () => {
    const res = applyCommandAction(doc, { name: 'reorder_sections', args: { order: ['education', 'bogus', 'summary'] } }, t)
    expect(res.doc.resume.sectionOrder).toEqual(['education', 'summary', 'experience', 'projects', 'skills'])
  })

  it('toggles section visibility and validates keys', () => {
    const res = applyCommandAction(doc, { name: 'toggle_section', args: { key: 'projects', hidden: true } }, t)
    expect(res.doc.resume.hiddenSections).toContain('projects')
    expect(applyCommandAction(doc, { name: 'toggle_section', args: { key: 'nope', hidden: true } }, t)).toBeNull()
  })

  it('applies page settings including un-fit', () => {
    const fitted = { ...doc, page: { ...doc.page, fitScale: 0.8 } }
    const res = applyCommandAction(fitted, { name: 'set_page', args: { paper: 'letter', fit_one_page: false } }, t)
    expect(res.doc.page.size).toBe('letter')
    expect(res.doc.page.fitScale).toBe(1)
  })

  it('returns null for no-op typography changes', () => {
    expect(applyCommandAction(doc, { name: 'set_typography', args: { size: 'm' } }, t)).toBeNull()
  })
})

describe('applyContentPatch (command superset)', () => {
  it('patches basics, projects and experience by index', () => {
    const out = applyContentPatch(doc.resume, {
      basics: { title: '高级产品经理' },
      experience: [{ index: 0, highlights: '新要点' }],
      projects: [{ index: 0, description: '新描述' }],
    })
    expect(out.basics.title).toBe('高级产品经理')
    expect(out.experience[0].highlights).toBe('新要点')
    expect(out.projects[0].description).toBe('新描述')
    expect(doc.resume.experience[0].highlights).toBe('旧要点')
  })

  it('ignores invalid indexes and blank values', () => {
    expect(applyContentPatch(doc.resume, { experience: [{ index: 9, highlights: 'x' }], summary: ' ' })).toBe(doc.resume)
  })
})
