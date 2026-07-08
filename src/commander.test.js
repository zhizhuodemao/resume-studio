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
  it('patches basics, projects and experience by index, reporting touched sections', () => {
    const { resume: out, touched } = applyContentPatch(doc.resume, {
      basics: { title: '高级产品经理' },
      experience: [{ index: 0, highlights: '新要点' }],
      projects: [{ index: 0, description: '新描述' }],
    })
    expect(out.basics.title).toBe('高级产品经理')
    expect(out.experience[0].highlights).toBe('新要点')
    expect(out.projects[0].description).toBe('新描述')
    expect(doc.resume.experience[0].highlights).toBe('旧要点')
    expect(touched.sort()).toEqual(['basics', 'experience', 'projects'])
  })

  it('edits and adds education entries', () => {
    const base = { ...doc.resume, education: [{ id: 'ed1', school: '上海交通大学', degree: '学士', major: '', start: '', end: '', description: '' }] }
    const { resume: out, touched } = applyContentPatch(base, {
      education: [{ index: 0, school: '清华大学' }],
      education_add: [{ school: '斯坦福大学', degree: '硕士' }],
    })
    expect(out.education[0].school).toBe('清华大学')
    expect(out.education[0].degree).toBe('学士')
    expect(out.education[1].school).toBe('斯坦福大学')
    expect(out.education[1].id).toBeTruthy()
    expect(touched).toEqual(['education'])
  })

  it('is a no-op for invalid indexes, blanks and identical values', () => {
    const r1 = applyContentPatch(doc.resume, { experience: [{ index: 9, highlights: 'x' }], summary: ' ' })
    expect(r1.resume).toBe(doc.resume)
    expect(r1.touched).toEqual([])
    const r2 = applyContentPatch(doc.resume, { summary: doc.resume.basics.summary })
    expect(r2.touched).toEqual([])
  })

  it('emits per-section labels through applyCommandAction', () => {
    const res = applyCommandAction(
      doc,
      { name: 'update_resume_content', args: { summary: '新简介', experience: [{ index: 0, role: '总监' }] } },
      t,
    )
    expect(res.label).toContain('简介已更新')
    expect(res.label).toContain('工作经历已更新')
  })
})
