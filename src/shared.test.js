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

import { parseInline } from './templates/shared.jsx'

describe('parseInline (rich text)', () => {
  it('parses bold, italic and links mixed with plain text', () => {
    expect(parseInline('提升 **27%**，*显著* 见[官网](example.com)')).toEqual([
      { type: 'text', text: '提升 ' },
      { type: 'bold', text: '27%' },
      { type: 'text', text: '，' },
      { type: 'italic', text: '显著' },
      { type: 'text', text: ' 见' },
      { type: 'link', text: '官网', href: 'example.com' },
    ])
  })
  it('returns plain text untouched and tolerates unclosed markers', () => {
    expect(parseInline('普通文本')).toEqual([{ type: 'text', text: '普通文本' }])
    expect(parseInline('**未闭合')).toEqual([{ type: 'text', text: '**未闭合' }])
  })
})

describe('visibleSections with custom sections', () => {
  const withCustom = {
    ...base,
    customSections: [
      { id: 'c1', title: '证书', items: [{ id: 'i1', title: 'PMP', subtitle: '', meta: '', description: '' }] },
      { id: 'c2', title: '空板块', items: [] },
    ],
    sectionOrder: [...base.sectionOrder, 'custom:c1', 'custom:c2'],
  }
  it('shows custom sections with content, hides empty ones', () => {
    expect(visibleSections(withCustom)).toContain('custom:c1')
    expect(visibleSections(withCustom)).not.toContain('custom:c2')
  })
  it('respects hiddenSections for custom keys', () => {
    expect(visibleSections({ ...withCustom, hiddenSections: ['custom:c1'] })).not.toContain('custom:c1')
  })
})
