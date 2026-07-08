import { describe, it, expect } from 'vitest'
import { visibleSections, dateRange, splitLines, nonEmptyItems } from './templates/shared.jsx'

const base = {
  basics: { summary: '有内容' },
  experience: [{ id: 'e', company: 'X', role: '', start: '', end: '', location: '', highlights: '' }],
  projects: [{ id: 'p', name: '', role: '', link: '', description: '' }],
  education: [],
  skills: [{ id: 's', name: 'SQL', level: 3, detail: '' }],
  sectionOrder: ['summary', 'experience', 'projects', 'education', 'skills'],
  hiddenSections: [],
}

describe('visibleSections', () => {
  it('skips empty and hidden sections', () => {
    expect(visibleSections(base)).toEqual(['summary', 'experience', 'skills'])
    expect(visibleSections({ ...base, hiddenSections: ['skills'] })).toEqual(['summary', 'experience'])
    expect(visibleSections({ ...base, basics: { summary: '  ' } })).toEqual(['experience', 'skills'])
  })
})

describe('dateRange', () => {
  it('formats ranges and falls back to the present label', () => {
    expect(dateRange('2020.01', '2021.02', '至今')).toBe('2020.01 – 2021.02')
    expect(dateRange('2020.01', '', '至今')).toBe('2020.01 – 至今')
    expect(dateRange('', '', '至今')).toBe('')
  })
})

describe('splitLines', () => {
  it('trims, drops empties and strips leading bullet markers', () => {
    expect(splitLines(' - 第一条\n\n• 第二条\n· 第三条 ')).toEqual(['第一条', '第二条', '第三条'])
    expect(splitLines('')).toEqual([])
  })
})

describe('nonEmptyItems', () => {
  it('filters items whose string fields are all empty', () => {
    expect(nonEmptyItems([{ id: 'a', x: ' ' }, { id: 'b', x: '有' }])).toHaveLength(1)
  })
})
