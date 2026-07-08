import { describe, it, expect } from 'vitest'
import { migrate, normalizeResume, parseImport, makeDoc, serializeDoc } from './store.js'
import { emptyResume, DEFAULT_SECTION_ORDER } from './sampleData.js'

const v1State = {
  lang: 'zh',
  template: 'timeline',
  accent: '#0d9488',
  track: 'product',
  typography: { font: 'serif', size: 'l', density: 'compact' },
  resume: {
    basics: { name: '张三', title: '产品经理', email: 'a@b.c', summary: '总结' },
    experience: [{ id: 'e1', company: 'X 公司', role: 'PM', start: '2020.01', end: '', location: '', highlights: '做了事' }],
    projects: [],
    education: [],
    skills: [{ id: 's1', name: 'SQL', level: 4, detail: '' }],
    sectionOrder: ['summary', 'experience', 'projects', 'education', 'skills'],
    hiddenSections: ['projects'],
  },
}

describe('migrate', () => {
  it('wraps a v1 state into a v2 single-doc state', () => {
    const out = migrate(v1State)
    expect(out.version).toBe(2)
    expect(out.lang).toBe('zh')
    expect(out.resumes).toHaveLength(1)
    const doc = out.resumes[0]
    expect(out.activeId).toBe(doc.id)
    expect(doc.template).toBe('timeline')
    expect(doc.accent).toBe('#0d9488')
    expect(doc.track).toBe('product')
    expect(doc.typography).toEqual({ font: 'serif', size: 'l', density: 'compact' })
    expect(doc.resume.basics.name).toBe('张三')
    expect(doc.resume.experience[0].id).toBe('e1')
    expect(doc.resume.hiddenSections).toEqual(['projects'])
  })

  it('passes a valid v2 state through and fixes a dangling activeId', () => {
    const doc = makeDoc({ name: 'A', resume: emptyResume() })
    const out = migrate({ version: 2, lang: 'en', activeId: 'nonexistent', resumes: [doc] })
    expect(out.activeId).toBe(doc.id)
    expect(out.lang).toBe('en')
    expect(out.resumes).toHaveLength(1)
  })

  it('drops docs without a valid resume and returns null when nothing survives', () => {
    expect(migrate({ version: 2, resumes: [{ name: 'broken' }] })).toBeNull()
    expect(migrate({ foo: 1 })).toBeNull()
    expect(migrate(null)).toBeNull()
    expect(migrate('nope')).toBeNull()
  })
})

describe('normalizeResume', () => {
  it('fills every missing field with safe defaults', () => {
    const out = normalizeResume({ basics: { name: '只有名字' }, experience: [{ company: 'C' }] })
    expect(out.basics.name).toBe('只有名字')
    expect(out.basics.summary).toBe('')
    expect(out.experience[0].highlights).toBe('')
    expect(typeof out.experience[0].id).toBe('string')
    expect(out.projects).toEqual([])
    expect(out.sectionOrder).toEqual([...DEFAULT_SECTION_ORDER])
    expect(out.hiddenSections).toEqual([])
  })

  it('clamps skill levels into 1-5', () => {
    const out = normalizeResume({ basics: {}, skills: [{ name: 'x', level: 99 }, { name: 'y', level: -3 }, { name: 'z' }] })
    expect(out.skills.map(s => s.level)).toEqual([5, 1, 3])
  })
})

describe('parseImport', () => {
  it('round-trips our own export format', () => {
    const doc = makeDoc({ name: '出口', resume: v1State.resume, template: 'bold' })
    const imported = parseImport(serializeDoc(doc))
    expect(imported.name).toBe('出口')
    expect(imported.template).toBe('bold')
    expect(imported.resume.basics.name).toBe('张三')
    expect(imported.id).not.toBe(doc.id) // imported copies get fresh ids
  })

  it('accepts a bare resume object', () => {
    const imported = parseImport(JSON.stringify(v1State.resume))
    expect(imported.resume.basics.name).toBe('张三')
    expect(imported.template).toBe('modern')
  })

  it('accepts a v1 whole-state dump', () => {
    const imported = parseImport(JSON.stringify(v1State))
    expect(imported.resume.basics.name).toBe('张三')
    expect(imported.template).toBe('timeline')
  })

  it('rejects garbage', () => {
    expect(() => parseImport('not json')).toThrow('invalid-json')
    expect(() => parseImport('{"hello": 1}')).toThrow('unrecognized')
    expect(() => parseImport('[1,2,3]')).toThrow('unrecognized')
  })
})
