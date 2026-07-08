import { describe, it, expect } from 'vitest'
import { vaultStats, vaultDigest, pickInterviewTarget, applyStoryUpsert } from './vault.js'
import { migrate, vaultFromResumes, normalizeStory } from './store.js'

const doc = resume => ({ id: 'd1', name: 'X', resume })
const baseResume = {
  basics: { name: 'A', title: '', email: '', phone: '', location: '', website: '', github: '', photo: '', summary: '' },
  experience: [{ id: 'e1', company: '云徙科技', role: '高级产品经理', start: '', end: '', location: '', highlights: '负责 CRM 产品线\n重构线索流程' }],
  projects: [{ id: 'p1', name: '企业微信生态集成', role: '', link: '', description: '主导打通' }],
  education: [], skills: [], customSections: [],
  sectionOrder: ['summary', 'experience', 'projects', 'education', 'skills'],
  hiddenSections: [],
}

describe('vaultFromResumes (旧简历反解)', () => {
  it('turns experience and projects into stub/weak stories, deduped', () => {
    const vault = vaultFromResumes([doc(baseResume), doc(baseResume)])
    expect(vault.stories.length).toBe(2)
    expect(vault.stories[0].title).toBe('高级产品经理 @ 云徙科技')
    expect(vault.stories[0].source).toBe('imported')
    expect(['stub', 'weak']).toContain(vault.stories[0].strength)
  })
})

describe('migrate v2 → v3', () => {
  it('adds a vault reverse-parsed from resumes', () => {
    const out = migrate({ version: 2, lang: 'zh', activeId: 'd1', resumes: [doc(baseResume)] })
    expect(out.version).toBe(3)
    expect(out.vault.stories.length).toBe(2)
  })

  it('v3 passes through with normalized vault', () => {
    const out = migrate({
      version: 3, lang: 'zh', activeId: 'd1', resumes: [doc(baseResume)],
      vault: { stories: [{ id: 's1', title: 'T', star: {}, metrics: ['x 27%'] }] },
    })
    expect(out.vault.stories[0].metrics).toEqual(['x 27%'])
  })
})

describe('story strength', () => {
  it('grades stub / weak / strong by content', () => {
    expect(normalizeStory({ title: '只有标题' }).strength).toBe('stub')
    expect(normalizeStory({ title: 'T', star: { a: '做了很多事情'.repeat(5), r: '效果不错但没有数字' } }).strength).toBe('weak')
    expect(normalizeStory({ title: 'T', star: { a: '做了很多事情'.repeat(5), r: '转化率提升' }, metrics: ['+27%'] }).strength).toBe('strong')
  })
})

describe('pickInterviewTarget', () => {
  it('prefers weak (quantify) over stub (grow) over discover', () => {
    const weak = normalizeStory({ id: 'w', title: 'W', star: { a: '内容足够长的动作描述内容足够长', r: '有结果没数字' } })
    const stub = normalizeStory({ id: 's', title: 'S' })
    expect(pickInterviewTarget({ stories: [stub, weak] }).storyId).toBe('w')
    expect(pickInterviewTarget({ stories: [stub] }).storyId).toBe('s')
    expect(pickInterviewTarget({ stories: [] }).goal).toBe('discover')
  })

  it('question-level refusals keep the story open; whole-story refusals skip it', () => {
    // one refused question ≠ a dead story: other gaps remain fair game
    const partial = normalizeStory({ id: 'p', title: 'P', refusals: ['薪资是多少？'] })
    expect(pickInterviewTarget({ stories: [partial] }).storyId).toBe('p')
    // refusing the story itself takes it off the table
    const whole = normalizeStory({ id: 'w', title: 'W', refusals: ['不想聊这段经历'] })
    expect(pickInterviewTarget({ stories: [whole] }).goal).toBe('discover')
  })
})

describe('applyStoryUpsert', () => {
  it('creates, then merges updates with asked/quote/metrics accumulation', () => {
    const r1 = applyStoryUpsert({ stories: [] }, { title: '重构线索流程', action: '重构了核心流程', asked: '你负责哪部分？', quote: '整个后端都是我做的' })
    expect(r1.saved).toBe(true)
    expect(r1.isNew).toBe(true)
    expect(r1.story.askedFollowups).toEqual(['你负责哪部分？'])
    expect(r1.story.sources[0].quote).toBe('整个后端都是我做的')

    const r2 = applyStoryUpsert(r1.vault, { id: r1.story.id, result: '转化率显著提升', metrics: ['转化率 +27%'], asked: '具体数字？' })
    expect(r2.isNew).toBe(false)
    expect(r2.story.metrics).toEqual(['转化率 +27%'])
    expect(r2.story.askedFollowups.length).toBe(2)
    expect(r2.story.strength).toBe('strong')
    expect(r2.vault.stories.length).toBe(1)
  })

  it('rejects title-less saves and records refusals', () => {
    expect(applyStoryUpsert({ stories: [] }, { action: 'x' }).saved).toBe(false)
    const r = applyStoryUpsert({ stories: [] }, { title: 'T', refused: '不方便说数字' })
    expect(r.story.refusals).toEqual(['不方便说数字'])
  })
})

describe('vaultDigest', () => {
  it('indexes all stories and expands only the target with asked-list', () => {
    const a = normalizeStory({ id: 'a', title: '故事A', star: { a: '内容'.repeat(30), r: '' }, askedFollowups: ['问过的问题'] })
    const b = normalizeStory({ id: 'b', title: '故事B' })
    const d = vaultDigest({ stories: [a, b] }, 'a')
    expect(d).toContain('故事A')
    expect(d).toContain('故事B')
    expect(d).toContain('当前挖掘目标')
    expect(d).toContain('问过的问题')
    expect(d.split('当前挖掘目标').length).toBe(2)
  })
})
