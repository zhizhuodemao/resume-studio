import { describe, it, expect } from 'vitest'
import { resumeToText, stripMarkdown } from './exporters.js'
import { MESSAGES } from './i18n.js'

const resume = {
  basics: { name: '张三', title: 'PM', email: 'a@b.c', phone: '138', location: '', website: '', github: '', photo: '', summary: '简介内容' },
  experience: [{ id: 'e', company: 'X 公司', role: '产品经理', start: '2020', end: '', location: '', highlights: '**主导** 项目\n提升 30%' }],
  projects: [], education: [], skills: [{ id: 's', name: 'SQL', level: 3, detail: '熟练' }],
  customSections: [{ id: 'c1', title: '证书', items: [{ id: 'i', title: 'PMP', subtitle: '', meta: '2024', description: '' }] }],
  sectionOrder: ['summary', 'experience', 'projects', 'education', 'skills', 'custom:c1'],
  hiddenSections: [],
}

describe('stripMarkdown', () => {
  it('removes inline markers and keeps link targets', () => {
    expect(stripMarkdown('**加粗** 与 *斜体* 和 [链接](a.com)')).toBe('加粗 与 斜体 和 链接 (a.com)')
  })
})

describe('resumeToText', () => {
  it('serializes visible sections with markdown stripped', () => {
    const txt = resumeToText(resume, MESSAGES.zh)
    expect(txt).toContain('张三')
    expect(txt).toContain('138 | a@b.c')
    expect(txt).toContain('- 主导 项目')
    expect(txt).not.toContain('**')
    expect(txt).toContain('- SQL: 熟练')
    expect(txt).toContain('证书')
    expect(txt).toContain('PMP  2024')
  })
})
