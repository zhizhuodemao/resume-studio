import { describe, it, expect } from 'vitest'
import { extractTranslatable, mergeTranslated } from './ai.js'

const resume = {
  basics: {
    name: '陈嘉禾', title: '前端工程师', email: 'x@y.z', phone: '138', location: '上海',
    website: 'a.dev', github: 'gh', photo: 'data:image/jpeg;base64,HUGE', summary: '简介',
  },
  experience: [
    { id: 'e1', company: '公司A', role: '工程师', start: '2020.01', end: '', location: '上海', highlights: '第一行\n第二行' },
  ],
  projects: [{ id: 'p1', name: '项目', role: '作者', link: 'github.com/x', description: '描述' }],
  education: [{ id: 'd1', school: '大学', degree: '学士', major: '计算机', start: '2015', end: '2019', description: 'GPA' }],
  skills: [{ id: 's1', name: 'React', level: 5, detail: '细节' }],
  sectionOrder: ['summary', 'experience', 'projects', 'education', 'skills'],
  hiddenSections: [],
}

describe('extractTranslatable', () => {
  it('sends only text fields — no photo, ids, dates or links', () => {
    const out = extractTranslatable(resume)
    const json = JSON.stringify(out)
    expect(json).not.toContain('HUGE')
    expect(json).not.toContain('e1')
    expect(json).not.toContain('2020.01')
    expect(json).not.toContain('github.com/x')
    expect(out.experience[0].highlights).toBe('第一行\n第二行')
  })
})

describe('mergeTranslated', () => {
  it('merges translated strings by index and keeps protected fields', () => {
    const tr = {
      basics: { name: 'Alex Chen', title: 'Frontend Engineer', location: 'Shanghai', summary: 'Summary' },
      experience: [{ company: 'Company A', role: 'Engineer', location: 'Shanghai', highlights: 'line 1\nline 2' }],
      projects: [{ name: 'Project', role: 'Author', description: 'Desc' }],
      education: [{ school: 'University', degree: 'B.S.', major: 'CS', description: 'GPA' }],
      skills: [{ name: 'React', detail: 'detail' }],
    }
    const out = mergeTranslated(resume, tr)
    expect(out.basics.name).toBe('Alex Chen')
    expect(out.basics.photo).toBe('data:image/jpeg;base64,HUGE')
    expect(out.basics.email).toBe('x@y.z')
    expect(out.experience[0].id).toBe('e1')
    expect(out.experience[0].start).toBe('2020.01')
    expect(out.experience[0].highlights).toBe('line 1\nline 2')
    expect(out.projects[0].link).toBe('github.com/x')
    expect(out.skills[0].level).toBe(5)
  })

  it('tolerates short or missing arrays and non-string values', () => {
    const out = mergeTranslated(resume, { basics: { name: 123 }, experience: [], skills: null })
    expect(out.basics.name).toBe('陈嘉禾')
    expect(out.experience[0].company).toBe('公司A')
    expect(out.skills[0].name).toBe('React')
  })
})
