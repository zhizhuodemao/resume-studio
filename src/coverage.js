// Coach coverage map: a deterministic assessment of which resume areas
// are missing / weak / solid. Drives the coach progress panel and is
// injected into the assistant's context so interviews target the gaps.

const hasDigit = s => /\d/.test(s || '')
const lineCount = s =>
  String(s || '')
    .split('\n')
    .filter(l => l.trim()).length

const MSG = {
  zh: {
    summary: '个人简介',
    experience: '工作经历',
    projects: '项目经历',
    education: '教育经历',
    skills: '专业技能',
    hints: {
      summaryMissing: '还没有简介',
      summaryWeak: '缺少量化成果',
      expMissing: '还没有工作经历',
      expWeak: n => `${n} 段经历缺少量化数据`,
      projMissing: '还没有项目（可选）',
      eduMissing: '还没有教育经历',
      eduWeak: '学校或学历不完整',
      skillsMissing: '还没有技能',
      skillsWeak: '技能缺少说明',
      good: '完成',
    },
  },
  en: {
    summary: 'Summary',
    experience: 'Experience',
    projects: 'Projects',
    education: 'Education',
    skills: 'Skills',
    hints: {
      summaryMissing: 'No summary yet',
      summaryWeak: 'No quantified results',
      expMissing: 'No experience yet',
      expWeak: n => `${n} entr${n > 1 ? 'ies' : 'y'} lack metrics`,
      projMissing: 'No projects (optional)',
      eduMissing: 'No education yet',
      eduWeak: 'School or degree incomplete',
      skillsMissing: 'No skills yet',
      skillsWeak: 'Skills lack detail',
      good: 'Done',
    },
  },
}

// → [{ key, label, status: 'missing'|'weak'|'good', hint, optional? }]
export function coachCoverage(resume, lang = 'zh') {
  const m = MSG[lang] || MSG.zh
  const areas = []

  const summary = resume.basics?.summary || ''
  areas.push(
    !summary.trim()
      ? { key: 'summary', label: m.summary, status: 'missing', hint: m.hints.summaryMissing }
      : !hasDigit(summary) || summary.length < 40
        ? { key: 'summary', label: m.summary, status: 'weak', hint: m.hints.summaryWeak }
        : { key: 'summary', label: m.summary, status: 'good', hint: m.hints.good },
  )

  const exp = resume.experience || []
  if (!exp.length) {
    areas.push({ key: 'experience', label: m.experience, status: 'missing', hint: m.hints.expMissing })
  } else {
    const weak = exp.filter(e => {
      const lines = String(e.highlights || '')
        .split('\n')
        .filter(l => l.trim())
      if (!lines.length) return true
      return lines.filter(hasDigit).length / lines.length < 0.5
    }).length
    areas.push(
      weak
        ? { key: 'experience', label: m.experience, status: 'weak', hint: m.hints.expWeak(weak) }
        : { key: 'experience', label: m.experience, status: 'good', hint: m.hints.good },
    )
  }

  const projects = resume.projects || []
  areas.push(
    projects.length
      ? projects.every(p => lineCount(p.description) >= 1 && hasDigit(p.description))
        ? { key: 'projects', label: m.projects, status: 'good', hint: m.hints.good, optional: true }
        : { key: 'projects', label: m.projects, status: 'weak', hint: m.hints.expWeak(projects.filter(p => !hasDigit(p.description)).length), optional: true }
      : { key: 'projects', label: m.projects, status: 'missing', hint: m.hints.projMissing, optional: true },
  )

  const edu = resume.education || []
  areas.push(
    !edu.length
      ? { key: 'education', label: m.education, status: 'missing', hint: m.hints.eduMissing }
      : edu.every(e => e.school && e.degree)
        ? { key: 'education', label: m.education, status: 'good', hint: m.hints.good }
        : { key: 'education', label: m.education, status: 'weak', hint: m.hints.eduWeak },
  )

  const skills = resume.skills || []
  areas.push(
    !skills.length
      ? { key: 'skills', label: m.skills, status: 'missing', hint: m.hints.skillsMissing }
      : skills.filter(sk => sk.detail?.trim()).length >= Math.ceil(skills.length / 2)
        ? { key: 'skills', label: m.skills, status: 'good', hint: m.hints.good }
        : { key: 'skills', label: m.skills, status: 'weak', hint: m.hints.skillsWeak },
  )

  return areas
}

// Compact one-line summary for the assistant's system context.
export function coverageDigest(resume, lang = 'zh') {
  return coachCoverage(resume, lang)
    .map(a => `${a.label}=${a.status === 'good' ? 'OK' : a.status === 'weak' ? `弱(${a.hint})` : `缺失`}`)
    .join('; ')
}
