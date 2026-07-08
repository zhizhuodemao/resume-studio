import ClassicTemplate from './ClassicTemplate.jsx'
import ModernTemplate from './ModernTemplate.jsx'
import SidebarTemplate from './SidebarTemplate.jsx'
import MinimalTemplate from './MinimalTemplate.jsx'
import CampusTemplate from './CampusTemplate.jsx'
import TimelineTemplate from './TimelineTemplate.jsx'
import DuotoneTemplate from './DuotoneTemplate.jsx'
import BoldTemplate from './BoldTemplate.jsx'
import CoverLetter from './CoverLetter.jsx'

const TEMPLATES = {
  modern: ModernTemplate,
  classic: ClassicTemplate,
  sidebar: SidebarTemplate,
  duotone: DuotoneTemplate,
  timeline: TimelineTemplate,
  campus: CampusTemplate,
  minimal: MinimalTemplate,
  bold: BoldTemplate,
}

export const TEMPLATE_IDS = Object.keys(TEMPLATES)

export { DEFAULT_TYPOGRAPHY } from '../store.js'
import { DEFAULT_TYPOGRAPHY } from '../store.js'

export default function Resume({ template, resume, accent, typography = DEFAULT_TYPOGRAPHY, page, t, cover = false, coverContent = '' }) {
  const Template = TEMPLATES[template] || ModernTemplate
  const cls = [
    'resume',
    cover ? 'tpl-cover' : `tpl-${template}`,
    `size-${typography.size}`,
    `density-${typography.density}`,
    `margin-${page?.margin || 'normal'}`,
    typography.font !== 'default' ? `font-${typography.font}` : '',
  ]
    .filter(Boolean)
    .join(' ')
  const fit = page?.fitScale && page.fitScale < 1 ? page.fitScale : 1
  return (
    <div className={cls} style={{ '--accent': accent, '--fit': cover ? 1 : fit }}>
      {cover ? <CoverLetter basics={resume.basics} content={coverContent} t={t} /> : <Template resume={resume} t={t} />}
    </div>
  )
}
