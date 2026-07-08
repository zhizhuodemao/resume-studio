// Vault pure functions: digest for context, stats for the dashboard,
// deterministic interview-target selection, and the upsert executor.
// Iron rules: plain JSON in, plain JSON out; printable; unit-testable.
import { makeStory, normalizeStory } from './store.js'

export function vaultStats(vault) {
  const stories = vault?.stories || []
  const by = { strong: 0, weak: 0, stub: 0 }
  let metrics = 0
  for (const st of stories) {
    by[st.strength] = (by[st.strength] || 0) + 1
    metrics += st.metrics.length
  }
  return { total: stories.length, ...by, metrics }
}

// Layered projection: index lines for every story; the current target
// expanded in full. Keeps context size decoupled from vault size.
export function vaultDigest(vault, targetId = null) {
  const stories = vault?.stories || []
  if (!stories.length) return '素材库为空。'
  const lines = stories.map((st, i) => {
    const flags = [
      st.strength === 'strong' ? '完整' : st.strength === 'weak' ? '缺数字' : '仅存根',
      st.metrics.length ? `${st.metrics.length}个数字` : null,
      st.askedFollowups.length ? `已问${st.askedFollowups.length}题` : null,
      st.refusals.length ? '有拒答' : null,
    ]
      .filter(Boolean)
      .join('·')
    return `[${i}] ${st.title || '(无标题)'} (id=${st.id}) — ${flags}`
  })
  let out = `素材库共 ${stories.length} 条故事：\n${lines.join('\n')}`
  const target = stories.find(st => st.id === targetId)
  if (target) {
    out +=
      `\n\n当前挖掘目标（展开全文）：${target.title} (id=${target.id})\n` +
      `情境: ${target.star.s || '（空）'}\n任务: ${target.star.t || '（空）'}\n` +
      `动作: ${target.star.a || '（空）'}\n结果: ${target.star.r || '（空）'}\n` +
      `数字: ${target.metrics.join('；') || '（无）'}\n` +
      `已问过（不要重复）: ${target.askedFollowups.join('；') || '（无）'}\n` +
      `拒答过（不要再问）: ${target.refusals.join('；') || '（无）'}`
  }
  return out
}

// Deterministic gap model: the next most valuable thing to dig.
// Order: weak story missing numbers → stub story to grow → new ground.
export function pickInterviewTarget(vault) {
  const stories = vault?.stories || []
  // refusals live at question level (the prompt carries the do-not-ask
  // list); a story with one refused question still has other gaps —
  // only stories the user refused outright are skipped.
  const open = stories.filter(st => !st.refusals.some(r => /整个|这段|这份|不想聊这/.test(r)))
  const weak = open.find(st => st.strength === 'weak')
  if (weak) return { storyId: weak.id, goal: 'quantify', hint: `「${weak.title}」有内容但缺数字` }
  const stub = open.find(st => st.strength === 'stub')
  if (stub) return { storyId: stub.id, goal: 'grow', hint: `「${stub.title}」只有存根，补齐情境/动作/结果` }
  return { storyId: null, goal: 'discover', hint: '挖掘一段还没聊过的经历' }
}

// Executor for the upsert_story tool. Returns { vault, story, isNew, saved }.
// Numbers must come from the user's mouth — the tool just records them.
export function applyStoryUpsert(vault, args) {
  const stories = [...(vault?.stories || [])]
  const str = v => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
  const idx = args?.id ? stories.findIndex(st => st.id === args.id) : -1
  const base = idx >= 0 ? stories[idx] : null

  const merged = normalizeStory({
    ...(base || {}),
    id: base?.id,
    title: str(args?.title) ?? base?.title ?? '',
    star: {
      s: str(args?.situation) ?? base?.star.s ?? '',
      t: str(args?.task) ?? base?.star.t ?? '',
      a: str(args?.action) ?? base?.star.a ?? '',
      r: str(args?.result) ?? base?.star.r ?? '',
    },
    metrics: [...new Set([...(base?.metrics || []), ...(Array.isArray(args?.metrics) ? args.metrics : [])])],
    skills: [...new Set([...(base?.skills || []), ...(Array.isArray(args?.skills) ? args.skills : [])])],
    sources: [
      ...(base?.sources || []),
      ...(str(args?.quote) ? [{ q: str(args?.asked) || '', quote: args.quote.trim(), at: '' }] : []),
    ],
    askedFollowups: [
      ...new Set([...(base?.askedFollowups || []), ...(str(args?.asked) ? [args.asked.trim()] : [])]),
    ],
    refusals: [...new Set([...(base?.refusals || []), ...(str(args?.refused) ? [args.refused.trim()] : [])])],
    source: base?.source || 'interview',
  })

  if (!merged.title) return { vault: vault || { stories }, story: null, isNew: false, saved: false }
  const isNew = idx < 0
  if (isNew) stories.push(merged)
  else stories[idx] = merged
  return { vault: { stories }, story: merged, isNew, saved: true }
}

export { makeStory }
