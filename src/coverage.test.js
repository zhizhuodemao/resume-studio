import { describe, it, expect } from 'vitest'
import { coachCoverage, coverageDigest } from './coverage.js'

const base = {
  basics: { name: 'A', title: '', email: '', phone: '', location: '', website: '', github: '', photo: '', summary: '' },
  experience: [], projects: [], education: [], skills: [],
  sectionOrder: ['summary', 'experience', 'projects', 'education', 'skills'],
  hiddenSections: [],
}

describe('coachCoverage', () => {
  it('marks everything missing on an empty resume', () => {
    const areas = coachCoverage(base, 'zh')
    expect(areas.find(a => a.key === 'summary').status).toBe('missing')
    expect(areas.find(a => a.key === 'experience').status).toBe('missing')
    expect(areas.find(a => a.key === 'education').status).toBe('missing')
  })

  it('flags unquantified experience as weak, quantified as good', () => {
    const weak = { ...base, experience: [{ id: 'e', company: 'X', role: 'PM', highlights: '负责产品\n推动增长' }] }
    expect(coachCoverage(weak, 'zh').find(a => a.key === 'experience').status).toBe('weak')
    const good = { ...base, experience: [{ id: 'e', company: 'X', role: 'PM', highlights: '转化率提升 27%\nDAU 增长至 25 万' }] }
    expect(coachCoverage(good, 'zh').find(a => a.key === 'experience').status).toBe('good')
  })

  it('summary needs length and a number to be good', () => {
    const weak = { ...base, basics: { ...base.basics, summary: '经验丰富的产品经理' } }
    expect(coachCoverage(weak, 'zh').find(a => a.key === 'summary').status).toBe('weak')
    const good = { ...base, basics: { ...base.basics, summary: '5 年 B 端产品经验，负责服务 3000+ 企业客户的产品线，主导项目转化率提升 27%。' } }
    expect(coachCoverage(good, 'zh').find(a => a.key === 'summary').status).toBe('good')
  })

  it('digest is a compact one-liner', () => {
    const d = coverageDigest(base, 'zh')
    expect(d).toContain('个人简介=缺失')
    expect(d.split(';').length).toBe(5)
  })
})
