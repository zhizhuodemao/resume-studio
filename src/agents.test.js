import { describe, it, expect } from 'vitest'
import { applyCoachPatch } from './ai.js'

const resume = {
  basics: { name: 'A', summary: '旧简介' },
  experience: [
    { id: 'e1', company: 'X', role: 'PM', highlights: '旧要点' },
    { id: 'e2', company: 'Y', role: 'Dev', highlights: '保持不变' },
  ],
  projects: [],
  education: [],
  skills: [{ id: 's1', name: 'SQL', level: 3, detail: '' }],
}

describe('applyCoachPatch', () => {
  it('applies summary, indexed highlights and skill additions immutably', () => {
    const out = applyCoachPatch(resume, {
      summary: '新简介',
      experience: [{ index: 0, highlights: '第一行\n第二行' }],
      skills_add: [{ name: 'K8s', detail: '容器编排' }],
    })
    expect(out).not.toBe(resume)
    expect(out.basics.summary).toBe('新简介')
    expect(out.experience[0].highlights).toBe('第一行\n第二行')
    expect(out.experience[1].highlights).toBe('保持不变')
    expect(out.skills).toHaveLength(2)
    expect(out.skills[1].name).toBe('K8s')
    expect(resume.basics.summary).toBe('旧简介') // original untouched
  })

  it('returns the same reference when the patch is empty or invalid', () => {
    expect(applyCoachPatch(resume, null)).toBe(resume)
    expect(applyCoachPatch(resume, {})).toBe(resume)
    expect(applyCoachPatch(resume, { experience: [{ index: 99, highlights: 'x' }] })).toBe(resume)
    expect(applyCoachPatch(resume, { summary: '   ' })).toBe(resume)
    expect(applyCoachPatch(resume, { skills_add: [{ detail: '没有名字' }] })).toBe(resume)
  })
})
