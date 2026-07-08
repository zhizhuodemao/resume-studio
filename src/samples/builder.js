import { uid, DEFAULT_SECTION_ORDER } from '../sampleData.js'

export const CAMPUS_SECTION_ORDER = ['summary', 'education', 'experience', 'projects', 'skills']

export function makeResume({ basics, experience = [], projects = [], education = [], skills = [], sectionOrder }) {
  return {
    basics: { name: '', title: '', email: '', phone: '', location: '', website: '', github: '', photo: '', summary: '', ...basics },
    experience: experience.map(e => ({ id: uid(), company: '', role: '', start: '', end: '', location: '', highlights: '', ...e })),
    projects: projects.map(p => ({ id: uid(), name: '', role: '', link: '', description: '', ...p })),
    education: education.map(e => ({ id: uid(), school: '', degree: '', major: '', start: '', end: '', description: '', ...e })),
    skills: skills.map(s => ({ id: uid(), name: '', level: 3, detail: '', ...s })),
    sectionOrder: sectionOrder ? [...sectionOrder] : [...DEFAULT_SECTION_ORDER],
    hiddenSections: [],
  }
}
