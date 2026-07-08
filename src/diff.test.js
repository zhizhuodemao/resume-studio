import { describe, it, expect } from 'vitest'
import { diffDocs } from './diff.js'
import { MESSAGES } from './i18n.js'

const t = MESSAGES.zh
const baseDoc = {
  template: 'modern', accent: '#2563eb',
  typography: { font: 'default', size: 'm', density: 'normal' },
  page: { size: 'a4', margin: 'normal', fitScale: 1 },
  coverLetter: { enabled: false, content: '' },
  resume: {
    basics: { name: '张三', title: 'PM', email: '', phone: '', location: '', website: '', github: '', photo: '', summary: '旧简介' },
    experience: [{ id: 'e1', company: 'A 公司', role: '经理', start: '', end: '', location: '', highlights: '旧要点' }],
    projects: [], education: [{ id: 'ed1', school: '上海交通大学', degree: '学士', major: '', start: '', end: '', description: '' }],
    skills: [], customSections: [],
    sectionOrder: ['summary', 'experience', 'projects', 'education', 'skills'],
    hiddenSections: [],
  },
}
const clone = () => JSON.parse(JSON.stringify(baseDoc))

describe('diffDocs', () => {
  it('returns empty for identical docs', () => {
    expect(diffDocs(baseDoc, clone(), t)).toEqual([])
  })

  it('reports summary and education edits with before/after', () => {
    const after = clone()
    after.resume.basics.summary = '新简介'
    after.resume.education[0].school = '清华大学'
    const rows = diffDocs(baseDoc, after, t)
    const summary = rows.find(r => r.section === '个人简介')
    expect(summary.from).toBe('旧简介')
    expect(summary.to).toBe('新简介')
    const edu = rows.find(r => r.section.startsWith('教育经历'))
    expect(edu.from).toBe('上海交通大学')
    expect(edu.to).toBe('清华大学')
  })

  it('reports added/removed entries and settings changes', () => {
    const after = clone()
    after.template = 'timeline'
    after.resume.experience.push({ id: 'e2', company: '新公司', role: '', start: '', end: '', location: '', highlights: '' })
    after.resume.education = []
    const rows = diffDocs(baseDoc, after, t)
    expect(rows.find(r => r.kind === 'setting' && r.field === '模板').to).toBe('时间线')
    expect(rows.find(r => r.kind === 'add' && r.section === '工作经历').field).toBe('新公司')
    expect(rows.find(r => r.kind === 'remove' && r.section === '教育经历').field).toBe('上海交通大学')
  })

  it('clips long values', () => {
    const after = clone()
    after.resume.basics.summary = 'x'.repeat(500)
    const rows = diffDocs(baseDoc, after, t)
    expect(rows[0].to.length).toBeLessThan(200)
  })
})
