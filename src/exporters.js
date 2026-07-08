import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from 'docx'
import { visibleSections, getCustomSection, splitLines, dateRange, buildContacts } from './templates/shared.jsx'

/* ---------- Plain text ---------- */

export function resumeToText(resume, t) {
  const b = resume.basics
  const out = []
  const line = s => out.push(s)
  const rule = () => out.push('—'.repeat(30))

  if (b.name) line(b.name)
  if (b.title) line(b.title)
  const contacts = buildContacts(b).map(c => c.text)
  if (contacts.length) line(contacts.join(' | '))
  rule()

  const present = t.fields.present
  for (const key of visibleSections(resume)) {
    if (key === 'summary') {
      line(t.sections.summary)
      line(b.summary)
    } else if (key === 'experience') {
      line(t.sections.experience)
      for (const e of resume.experience) {
        line(`${e.role}  ${e.company}  ${dateRange(e.start, e.end, present)}`.trim())
        for (const l of splitLines(e.highlights)) line(`- ${stripMarkdown(l)}`)
      }
    } else if (key === 'projects') {
      line(t.sections.projects)
      for (const p of resume.projects) {
        line([p.name, p.role, p.link].filter(Boolean).join('  '))
        for (const l of splitLines(p.description)) line(`- ${stripMarkdown(l)}`)
      }
    } else if (key === 'education') {
      line(t.sections.education)
      for (const e of resume.education) {
        line([e.school, e.degree, e.major, dateRange(e.start, e.end, present)].filter(Boolean).join('  '))
        if (e.description) line(stripMarkdown(e.description))
      }
    } else if (key === 'skills') {
      line(t.sections.skills)
      for (const s of resume.skills) line(`- ${s.name}${s.detail ? `: ${s.detail}` : ''}`)
    } else if (key.startsWith('custom:')) {
      const sec = getCustomSection(resume, key)
      if (!sec) continue
      line(sec.title)
      for (const it of sec.items) {
        line([it.title, it.subtitle, it.meta].filter(Boolean).join('  '))
        for (const l of splitLines(it.description)) line(`- ${stripMarkdown(l)}`)
      }
    }
    rule()
  }
  return out.join('\n')
}

export const stripMarkdown = s =>
  s
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, '$1 ($2)')

/* ---------- DOCX (generic professional layout) ---------- */

const H = (text, opts = {}) =>
  new Paragraph({
    children: [new TextRun({ text, bold: true, size: 22, color: '1a1f2b' })],
    spacing: { before: 220, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' } },
    ...opts,
  })

const bullets = text =>
  splitLines(text).map(
    l =>
      new Paragraph({
        children: [new TextRun({ text: stripMarkdown(l), size: 20 })],
        bullet: { level: 0 },
        spacing: { after: 40 },
      }),
  )

const entryHead = (primary, secondary, meta) =>
  new Paragraph({
    children: [
      new TextRun({ text: primary, bold: true, size: 21 }),
      ...(secondary ? [new TextRun({ text: `  ${secondary}`, size: 20, color: '555555' })] : []),
      ...(meta ? [new TextRun({ text: `  ${meta}`, size: 18, color: '888888' })] : []),
    ],
    spacing: { before: 100, after: 40 },
  })

export function resumeToDocx(resume, t) {
  const b = resume.basics
  const present = t.fields.present
  const children = []

  children.push(
    new Paragraph({
      children: [new TextRun({ text: b.name || ' ', bold: true, size: 40 })],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    }),
  )
  if (b.title)
    children.push(
      new Paragraph({
        children: [new TextRun({ text: b.title, size: 22, color: '444444' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
      }),
    )
  const contacts = buildContacts(b).map(c => c.text)
  if (contacts.length)
    children.push(
      new Paragraph({
        children: [new TextRun({ text: contacts.join('  ·  '), size: 18, color: '666666' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      }),
    )

  for (const key of visibleSections(resume)) {
    if (key === 'summary') {
      children.push(H(t.sections.summary))
      children.push(new Paragraph({ children: [new TextRun({ text: stripMarkdown(b.summary), size: 20 })], spacing: { after: 60 } }))
    } else if (key === 'experience') {
      children.push(H(t.sections.experience))
      for (const e of resume.experience) {
        children.push(entryHead(e.role || e.company, e.company, dateRange(e.start, e.end, present)))
        children.push(...bullets(e.highlights))
      }
    } else if (key === 'projects') {
      children.push(H(t.sections.projects))
      for (const p of resume.projects) {
        children.push(entryHead(p.name, p.role, p.link))
        children.push(...bullets(p.description))
      }
    } else if (key === 'education') {
      children.push(H(t.sections.education))
      for (const e of resume.education) {
        children.push(entryHead(e.school, [e.degree, e.major].filter(Boolean).join(' · '), dateRange(e.start, e.end, present)))
        if (e.description) children.push(...bullets(e.description))
      }
    } else if (key === 'skills') {
      children.push(H(t.sections.skills))
      for (const s of resume.skills) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: s.name, bold: true, size: 20 }),
              ...(s.detail ? [new TextRun({ text: ` — ${s.detail}`, size: 20, color: '555555' })] : []),
            ],
            bullet: { level: 0 },
            spacing: { after: 40 },
          }),
        )
      }
    } else if (key.startsWith('custom:')) {
      const sec = getCustomSection(resume, key)
      if (!sec) continue
      children.push(H(sec.title))
      for (const it of sec.items) {
        children.push(entryHead(it.title, it.subtitle, it.meta))
        children.push(...bullets(it.description))
      }
    }
  }

  return new Document({
    styles: { default: { document: { run: { font: 'Calibri' } } } },
    sections: [{ properties: {}, children }],
  })
}

export async function downloadDocx(resume, t, filename) {
  const doc = resumeToDocx(resume, t)
  const blob = await Packer.toBlob(doc)
  triggerDownload(blob, `${filename}.docx`)
}

export function downloadText(resume, t, filename) {
  const blob = new Blob([resumeToText(resume, t)], { type: 'text/plain;charset=utf-8' })
  triggerDownload(blob, `${filename}.txt`)
}

function triggerDownload(blob, name) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}
