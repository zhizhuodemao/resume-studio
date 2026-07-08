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
function extractTranslatable(resume) {
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

function mergeTranslated(resume, tr) {
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
