// Rules-based resume checker — runs entirely client-side, no AI cost.
// Returns { score, findings: [{ level, section, message }], stats }.

const MSG = {
  zh: {
    noName: '缺少姓名',
    noContact: '缺少邮箱和电话，招聘方无法联系你',
    onlyOneContact: '建议同时提供邮箱和电话',
    badEmail: '邮箱格式看起来不正确',
    noTitle: '缺少求职意向 / 目标职位',
    noSummary: '缺少个人简介 —— 这是招聘方最先看的内容',
    summaryLong: '个人简介偏长（超过 400 字），建议压缩到 3-5 句',
    summaryShort: '个人简介偏短，建议补充年限、定位与核心成果',
    noExperience: '没有工作 / 实习经历',
    expNoDates: e => `「${e}」缺少起止时间`,
    expNoHighlights: e => `「${e}」没有填写工作内容`,
    lowQuant: pct => `只有 ${pct}% 的要点包含量化数据 —— 数字是简历最有说服力的部分`,
    weakVerbs: n => `${n} 条要点以「参与 / 协助 / 负责协助」开头，建议换成更强的动词（主导、搭建、推动…）`,
    lineTooLong: n => `${n} 条要点超过 70 字，建议拆分或精简`,
    tooManyBullets: e => `「${e}」的要点超过 8 条，建议保留最有分量的 4-6 条`,
    noSkills: '没有填写专业技能',
    noEducation: '没有填写教育经历',
  },
  en: {
    noName: 'Name is missing',
    noContact: 'No email or phone — recruiters cannot reach you',
    onlyOneContact: 'Provide both an email and a phone number',
    badEmail: 'Email format looks invalid',
    noTitle: 'Target job title is missing',
    noSummary: 'Summary is missing — it is the first thing recruiters read',
    summaryLong: 'Summary is long (>400 chars); compress to 3-5 sentences',
    summaryShort: 'Summary is short; add years, positioning and a key result',
    noExperience: 'No work / internship experience',
    expNoDates: e => `"${e}" is missing dates`,
    expNoHighlights: e => `"${e}" has no bullet points`,
    lowQuant: pct => `Only ${pct}% of bullets contain numbers — metrics are your strongest evidence`,
    weakVerbs: n => `${n} bullet(s) start with weak verbs (assisted / participated); use stronger ones`,
    lineTooLong: n => `${n} bullet(s) exceed ~70 characters; split or tighten them`,
    tooManyBullets: e => `"${e}" has more than 8 bullets; keep the strongest 4-6`,
    noSkills: 'Skills section is empty',
    noEducation: 'Education section is empty',
  },
}

const WEAK_STARTS_ZH = ['参与', '协助', '帮助', '负责协助']
const WEAK_STARTS_EN = ['assisted', 'participated', 'helped', 'responsible for', 'worked on']

const hasDigit = s => /[0-9０-９]/.test(s)

export function checkResume(resume, lang = 'zh') {
  const m = MSG[lang] || MSG.zh
  const findings = []
  const add = (level, section, message) => findings.push({ level, section, message })
  const b = resume.basics

  /* Contact */
  if (!b.name.trim()) add('error', 'basics', m.noName)
  const hasEmail = Boolean(b.email.trim())
  const hasPhone = Boolean(b.phone.trim())
  if (!hasEmail && !hasPhone) add('error', 'basics', m.noContact)
  else if (!hasEmail || !hasPhone) add('info', 'basics', m.onlyOneContact)
  if (hasEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email.trim())) add('warn', 'basics', m.badEmail)
  if (!b.title.trim()) add('warn', 'basics', m.noTitle)

  /* Summary */
  const summary = b.summary.trim()
  if (!summary) add('warn', 'summary', m.noSummary)
  else if (summary.length > 400) add('warn', 'summary', m.summaryLong)
  else if (summary.length < 40) add('info', 'summary', m.summaryShort)

  /* Experience & bullets */
  const realExp = resume.experience.filter(e => (e.company + e.role + e.highlights).trim())
  if (!realExp.length) add('warn', 'experience', m.noExperience)

  let totalLines = 0
  let quantified = 0
  let weakVerbs = 0
  let longLines = 0
  const allBulletSources = [
    ...realExp.map(e => ({ label: e.role || e.company, text: e.highlights })),
    ...resume.projects.filter(p => (p.name + p.description).trim()).map(p => ({ label: p.name, text: p.description })),
  ]
  for (const e of realExp) {
    if (!(e.start.trim() || e.end.trim())) add('warn', 'experience', m.expNoDates(e.role || e.company))
    if (!e.highlights.trim()) add('warn', 'experience', m.expNoHighlights(e.role || e.company))
  }
  for (const src of allBulletSources) {
    const lines = src.text.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length > 8) add('info', 'experience', m.tooManyBullets(src.label))
    for (const line of lines) {
      totalLines += 1
      if (hasDigit(line)) quantified += 1
      if (line.length > 70) longLines += 1
      const lower = line.toLowerCase()
      if (WEAK_STARTS_ZH.some(w => line.startsWith(w)) || WEAK_STARTS_EN.some(w => lower.startsWith(w))) weakVerbs += 1
    }
  }
  const quantPct = totalLines ? Math.round((quantified / totalLines) * 100) : 0
  if (totalLines >= 3 && quantPct < 30) add('warn', 'experience', m.lowQuant(quantPct))
  if (weakVerbs > 0) add('info', 'experience', m.weakVerbs(weakVerbs))
  if (longLines > 0) add('info', 'experience', m.lineTooLong(longLines))

  /* Skills & education */
  if (!resume.skills.some(s => s.name.trim())) add('info', 'skills', m.noSkills)
  if (!resume.education.some(e => e.school.trim())) add('info', 'education', m.noEducation)

  /* Score */
  let score = 100
  for (const f of findings) {
    if (f.level === 'error') score -= 18
    else if (f.level === 'warn') score -= 8
    else score -= 3
  }
  score = Math.max(5, Math.min(100, score))

  return {
    score,
    findings,
    stats: { totalLines, quantified, quantPct, weakVerbs },
  }
}
