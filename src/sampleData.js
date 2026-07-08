let idCounter = 0
export const uid = () => `id-${Date.now().toString(36)}-${idCounter++}`

export const DEFAULT_SECTION_ORDER = ['summary', 'experience', 'projects', 'education', 'skills']

export function emptyResume() {
  return {
    basics: {
      name: '',
      title: '',
      email: '',
      phone: '',
      location: '',
      website: '',
      github: '',
      photo: '',
      summary: '',
    },
    experience: [],
    projects: [],
    education: [],
    skills: [],
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    hiddenSections: [],
  }
}
