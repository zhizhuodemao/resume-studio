const AI_ENDPOINT = '/api/ai/chat/completions'
const MODEL = 'deepseek-chat'

async function chat(messages, opts = {}) {
  const res = await fetch(AI_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages, stream: false, ...opts }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`AI request failed: ${res.status} ${body.slice(0, 200)}`)
  }
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('AI returned an empty response')
  return content
}

const hasCJK = s => /[一-鿿]/.test(s)

const POLISH_RULES = {
  zh: {
    highlights:
      '你是资深简历教练。逐行改写下面的简历要点，输出行数与输入一致。规则：动词开头、突出成果、语言精炼专业；保留原文全部事实与数字，绝不编造新的数字、公司或成果；原文缺少量化数据时，可在合适位置插入【补充数据】占位提示。直接输出改写结果，每行一条，不加序号、引号或解释。',
    summary:
      '你是资深简历教练。改写下面的个人简介：3-5 句话，第一句点明年限与专业定位，中间突出核心能力与代表性成果，保留原文全部事实与数字，绝不编造。直接输出改写后的简介，不加解释。',
    project:
      '你是资深简历教练。逐行改写下面的项目描述要点，输出行数与输入一致。规则：突出你的角色、动作与结果数据；保留原文全部事实与数字，绝不编造；缺数据处可插入【补充数据】占位。直接输出改写结果，每行一条，不加序号或解释。',
  },
  en: {
    highlights:
      'You are a senior resume coach. Rewrite the resume bullet points below line by line; output the same number of lines as the input. Rules: start each line with a strong action verb, emphasize outcomes, keep the language concise and professional; preserve every fact and number from the original and never invent new numbers, companies or results; where quantification is missing you may insert an [add metric] placeholder. Output only the rewritten lines, one per line, no numbering or commentary.',
    summary:
      'You are a senior resume coach. Rewrite the professional summary below in 3-5 sentences: open with years of experience and positioning, highlight core strengths and one or two signature results. Preserve every fact and number; never invent. Output only the rewritten summary.',
    project:
      'You are a senior resume coach. Rewrite the project description bullets below line by line; same number of lines as input. Emphasize your role, actions and measurable results; preserve all facts and numbers, never invent; insert an [add metric] placeholder where data is missing. Output only the rewritten lines, no numbering or commentary.',
  },
}

export async function polishText(text, { kind = 'highlights', role, company, name } = {}) {
  const lang = hasCJK(text) ? 'zh' : 'en'
  const system = POLISH_RULES[lang][kind] || POLISH_RULES[lang].highlights
  const contextBits = [role, company || name].filter(Boolean).join(' @ ')
  const lineCount = text.split('\n').filter(l => l.trim()).length
  const lineNote =
    kind === 'summary'
      ? ''
      : lang === 'zh'
        ? `输入共 ${lineCount} 行，必须输出恰好 ${lineCount} 行，逐行对应，不得合并或拆分。\n`
        : `The input has ${lineCount} lines; output exactly ${lineCount} lines, one-to-one, without merging or splitting.\n`
  const user =
    (contextBits ? (lang === 'zh' ? `背景：${contextBits}\n` : `Context: ${contextBits}\n`) : '') + lineNote + text
  const result = await chat([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ])
  return result
    .split('\n')
    .map(line => line.replace(/^\s*(?:[-•*]|\d+[.、)])\s*/, '').trimEnd())
    .join('\n')
    .trim()
}

/* ---------- Whole-resume translation ---------- */

// Only translatable text fields travel to the model; ids, dates, links,
// levels, photo and section config stay local and are merged back by index.
export function extractTranslatable(resume) {
  return {
    basics: {
      name: resume.basics.name,
      title: resume.basics.title,
      location: resume.basics.location,
      summary: resume.basics.summary,
    },
    experience: resume.experience.map(e => ({
      company: e.company,
      role: e.role,
      location: e.location,
      highlights: e.highlights,
    })),
    projects: resume.projects.map(p => ({ name: p.name, role: p.role, description: p.description })),
    education: resume.education.map(e => ({
      school: e.school,
      degree: e.degree,
      major: e.major,
      description: e.description,
    })),
    skills: resume.skills.map(s => ({ name: s.name, detail: s.detail })),
  }
}

export function mergeTranslated(resume, tr) {
  const pickStr = (v, fallback) => (typeof v === 'string' ? v : fallback)
  const mergeList = (orig, translated, fields) =>
    orig.map((item, i) => {
      const t = translated?.[i]
      if (!t) return item
      const next = { ...item }
      for (const f of fields) next[f] = pickStr(t[f], item[f])
      return next
    })
  return {
    ...resume,
    basics: {
      ...resume.basics,
      name: pickStr(tr.basics?.name, resume.basics.name),
      title: pickStr(tr.basics?.title, resume.basics.title),
      location: pickStr(tr.basics?.location, resume.basics.location),
      summary: pickStr(tr.basics?.summary, resume.basics.summary),
    },
    experience: mergeList(resume.experience, tr.experience, ['company', 'role', 'location', 'highlights']),
    projects: mergeList(resume.projects, tr.projects, ['name', 'role', 'description']),
    education: mergeList(resume.education, tr.education, ['school', 'degree', 'major', 'description']),
    skills: mergeList(resume.skills, tr.skills, ['name', 'detail']),
  }
}

export async function translateResume(resume, target) {
  const targetName = target === 'en' ? 'English' : 'Chinese (Simplified)'
  const system =
    `You are a professional bilingual resume translator. Translate every string value in the user's JSON into idiomatic, professional ${targetName} resume language — adapt phrasing, do not translate literally. ` +
    'Keep the JSON structure and keys exactly the same. Preserve line breaks inside strings (each line is one bullet point). ' +
    'Do not alter numbers or dates. Use official English names for universities and well-known companies when translating to English. ' +
    'Keep proper nouns (product names, tools like React / SQL / Figma) as-is. Respond with JSON only.'
  const payload = extractTranslatable(resume)
  const result = await chat(
    [
      { role: 'system', content: system },
      { role: 'user', content: JSON.stringify(payload) },
    ],
    { response_format: { type: 'json_object' }, temperature: 1.3 },
  )
  let parsed
  try {
    parsed = JSON.parse(result)
  } catch {
    throw new Error('AI returned invalid JSON')
  }
  if (!parsed || typeof parsed !== 'object' || !parsed.basics) throw new Error('AI returned unexpected structure')
  return mergeTranslated(resume, parsed)
}

/* ---------- Generation (L1) ---------- */

export async function generateBullets(description, { role, company } = {}) {
  const lang = hasCJK(description) ? 'zh' : 'en'
  const system =
    lang === 'zh'
      ? '你是资深简历教练。把用户的一句话工作描述扩写成 3 条专业的简历要点：动词开头、突出职责与成果；不知道的数字一律用【补充数据】占位，绝不编造具体数字、规模或成果。直接输出 3 行，每行一条，不加序号或解释。'
      : 'You are a senior resume coach. Expand the user\'s one-line description into 3 professional resume bullets: verb-first, emphasizing responsibility and impact; use [add metric] placeholders for any unknown numbers and never invent figures. Output exactly 3 lines, no numbering or commentary.'
  const context = [role, company].filter(Boolean).join(' @ ')
  const user = (context ? (lang === 'zh' ? `背景：${context}\n` : `Context: ${context}\n`) : '') + description
  const result = await chat([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ])
  return result
    .split('\n')
    .map(line => line.replace(/^\s*(?:[-•*]|\d+[.、)])\s*/, '').trimEnd())
    .filter(Boolean)
    .join('\n')
}

// Compact plain-text digest of a resume for analysis prompts.
export function resumeDigest(resume) {
  const b = resume.basics
  const parts = []
  if (b.name || b.title) parts.push(`${b.name} — ${b.title}`)
  if (b.summary) parts.push(`简介: ${b.summary}`)
  for (const e of resume.experience) {
    parts.push(`工作: ${e.role} @ ${e.company} (${e.start}-${e.end || '至今'})\n${e.highlights}`)
  }
  for (const p of resume.projects) parts.push(`项目: ${p.name} ${p.role}\n${p.description}`)
  for (const e of resume.education) parts.push(`教育: ${e.school} ${e.degree} ${e.major} ${e.description}`)
  if (resume.skills.length) parts.push(`技能: ${resume.skills.map(s => `${s.name}(${s.detail})`).join('; ')}`)
  for (const c of resume.customSections || []) {
    parts.push(`${c.title}: ${c.items.map(i => `${i.title} ${i.subtitle} ${i.description}`).join('; ')}`)
  }
  return parts.join('\n\n').slice(0, 6000)
}

export async function generateSummary(resume) {
  const digest = resumeDigest(resume)
  const lang = hasCJK(digest) ? 'zh' : 'en'
  const system =
    lang === 'zh'
      ? '你是资深简历教练。根据下面的简历内容，写一段 3-5 句的个人简介：第一句点明年限与专业定位，中间突出核心能力与最有说服力的量化成果，只使用简历中已有的事实与数字，绝不编造。直接输出简介文本，不加解释。'
      : 'You are a senior resume coach. Based on the resume below, write a 3-5 sentence professional summary: open with years of experience and positioning, highlight core strengths and the most convincing quantified results. Use only facts present in the resume; never invent. Output only the summary text.'
  return (await chat([
    { role: 'system', content: system },
    { role: 'user', content: digest },
  ])).trim()
}

/* ---------- JD matching (L2) ---------- */

export async function matchJD(resume, jd, uiLang = 'zh') {
  const outLang = uiLang === 'zh' ? '中文' : 'English'
  const system =
    `You are an expert technical recruiter. Compare the candidate resume against the job description. Respond with JSON only, in ${outLang}, with this exact shape: ` +
    '{"score": <0-100 integer, overall match>, "missing_keywords": [<up to 8 important JD keywords absent or weak in the resume>], ' +
    '"strengths": [<up to 5 concrete matching strengths>], "suggestions": [<up to 6 specific, actionable resume edits for this JD>]}. ' +
    'Be honest about gaps; do not flatter.'
  const user = JSON.stringify({ resume: resumeDigest(resume), job_description: jd.slice(0, 6000) })
  const result = await chat(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { response_format: { type: 'json_object' } },
  )
  let parsed
  try {
    parsed = JSON.parse(result)
  } catch {
    throw new Error('AI returned invalid JSON')
  }
  const arr = v => (Array.isArray(v) ? v.filter(x => typeof x === 'string') : [])
  return {
    score: Number.isFinite(parsed.score) ? Math.max(0, Math.min(100, Math.round(parsed.score))) : 0,
    missing_keywords: arr(parsed.missing_keywords),
    strengths: arr(parsed.strengths),
    suggestions: arr(parsed.suggestions),
  }
}

/* ---------- L3 agents ---------- */

// JD tailoring: rewrites summary / highlights / details to emphasize
// JD-relevant facts, reusing the translate merge path (index-aligned,
// protected fields untouched). Returns a NEW resume object.
export async function tailorResume(resume, jd, uiLang = 'zh') {
  const system =
    '你是资深简历教练。请根据目标职位描述（JD）定制这份简历：' +
    '1) 改写 basics.summary 与各条 highlights/description，突出与 JD 最相关的技能、经验与成果；' +
    '2) 可以调整每段经历内部要点的顺序（把最匹配的放前面）；' +
    '3) skills 的 detail 可以强调与 JD 匹配的技术点；' +
    '4) 只能使用简历中已有的事实与数字，绝对不允许编造新的经历、数字或技能；' +
    '5) 保持简历原有语言，保持每行一条要点的格式。' +
    '输出 JSON，结构与输入的 resume 对象完全一致（相同的键、相同的数组长度），只修改字符串内容。Respond with JSON only.'
  const payload = JSON.stringify({ resume: extractTranslatable(resume), job_description: jd.slice(0, 6000) })
  const result = await chat(
    [
      { role: 'system', content: system },
      { role: 'user', content: payload },
    ],
    { response_format: { type: 'json_object' } },
  )
  let parsed
  try {
    parsed = JSON.parse(result)
  } catch {
    throw new Error('AI returned invalid JSON')
  }
  const body = parsed.resume && typeof parsed.resume === 'object' ? parsed.resume : parsed
  if (!body.basics) throw new Error('AI returned unexpected structure')
  return mergeTranslated(resume, body)
}

// Resume coach: one interview turn. History is [{role, content}] of prior
// user/assistant messages (assistant content = reply text only).
export async function coachTurn(history, resume, uiLang = 'zh') {
  const langNote = uiLang === 'zh' ? '用中文回复。' : 'Reply in English.'
  const system =
    '你是一位顶尖的简历教练，通过访谈帮助用户完善简历。工作方式：' +
    '1) 每次只问一个具体、易回答的问题，优先追问缺失的量化数据（规模、百分比、金额、人数）与成果；' +
    '2) 用户给出信息后，把它转写成专业的简历表达，并通过 patch 更新简历；' +
    '3) 只使用用户明确提供的事实，绝不编造；用户没给数字就不要写数字；' +
    '4) reply 保持口语化、简短（1-3 句），一次一个问题。' +
    langNote +
    `\n\n当前简历内容：\n${resumeDigest(resume)}\n\n` +
    '严格输出 JSON：{"reply": "给用户的话", "patch": null 或 {' +
    '"summary": "新的个人简介（可选）", ' +
    '"experience": [{"index": 经历序号从0开始, "highlights": "该经历的完整要点（多行，每行一条）"}]（可选）, ' +
    '"skills_add": [{"name": "技能名", "detail": "说明"}]（可选）}}。' +
    'patch 只在确有内容可更新时给出，否则为 null。Respond with JSON only.'
  const result = await chat(
    [{ role: 'system', content: system }, ...history.slice(-12)],
    { response_format: { type: 'json_object' } },
  )
  let parsed
  try {
    parsed = JSON.parse(result)
  } catch {
    throw new Error('AI returned invalid JSON')
  }
  const patch = parsed.patch && typeof parsed.patch === 'object' ? parsed.patch : null
  return {
    reply: typeof parsed.reply === 'string' && parsed.reply ? parsed.reply : '…',
    patch,
  }
}

// Apply a coach patch immutably; invalid parts are ignored.
export function applyCoachPatch(resume, patch) {
  if (!patch) return resume
  let next = resume
  if (typeof patch.summary === 'string' && patch.summary.trim()) {
    next = { ...next, basics: { ...next.basics, summary: patch.summary } }
  }
  if (Array.isArray(patch.experience)) {
    const experience = [...next.experience]
    let touched = false
    for (const p of patch.experience) {
      const i = Number(p?.index)
      if (Number.isInteger(i) && experience[i] && typeof p.highlights === 'string' && p.highlights.trim()) {
        experience[i] = { ...experience[i], highlights: p.highlights }
        touched = true
      }
    }
    if (touched) next = { ...next, experience }
  }
  if (Array.isArray(patch.skills_add)) {
    const additions = patch.skills_add
      .filter(s => s && typeof s.name === 'string' && s.name.trim())
      .map(s => ({ id: `coach-${Math.random().toString(36).slice(2, 9)}`, name: s.name, level: 3, detail: typeof s.detail === 'string' ? s.detail : '' }))
    if (additions.length) next = { ...next, skills: [...next.skills, ...additions] }
  }
  return next
}
