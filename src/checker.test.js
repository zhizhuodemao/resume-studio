import { describe, it, expect } from 'vitest'
import { checkResume } from './checker.js'

const blank = {
  basics: { name: '', title: '', email: '', phone: '', location: '', website: '', github: '', photo: '', summary: '' },
  experience: [], projects: [], education: [], skills: [], customSections: [],
  sectionOrder: [], hiddenSections: [],
}

const strong = {
  ...blank,
  basics: { ...blank.basics, name: '张三', title: '工程师', email: 'a@b.com', phone: '138', summary: '8 年经验，主导过日活百万产品的重构，成本降低 40%。团队管理经验丰富。' },
  experience: [{ id: 'e', company: 'X', role: '工程师', start: '2020', end: '', location: '', highlights: '主导重构，性能提升 40%\n搭建监控平台，覆盖 100% 服务\n推动迁移，节约成本 200 万' }],
  education: [{ id: 'd', school: '大学', degree: '', major: '', start: '', end: '', description: '' }],
  skills: [{ id: 's', name: 'React', level: 4, detail: '' }],
}

describe('checkResume', () => {
  it('flags a blank resume with errors and a low score', () => {
    const r = checkResume(blank, 'zh')
    expect(r.score).toBeLessThan(60)
    expect(r.findings.some(f => f.level === 'error')).toBe(true)
    expect(r.findings.some(f => f.message.includes('姓名'))).toBe(true)
  })

  it('scores a strong quantified resume high with no errors', () => {
    const r = checkResume(strong, 'zh')
    expect(r.score).toBeGreaterThanOrEqual(85)
    expect(r.findings.filter(f => f.level === 'error')).toHaveLength(0)
    expect(r.stats.quantPct).toBe(100)
  })

  it('detects weak verbs and low quantification', () => {
    const weak = {
      ...strong,
      experience: [{ id: 'e', company: 'X', role: '工程师', start: '2020', end: '', location: '', highlights: '参与项目开发\n协助团队完成任务\n负责协助日常维护' }],
    }
    const r = checkResume(weak, 'zh')
    expect(r.findings.some(f => f.message.includes('量化'))).toBe(true)
    expect(r.findings.some(f => f.message.includes('动词'))).toBe(true)
  })

  it('validates email format', () => {
    const bad = { ...strong, basics: { ...strong.basics, email: 'not-an-email' } }
    expect(checkResume(bad, 'zh').findings.some(f => f.message.includes('邮箱格式'))).toBe(true)
  })
})
