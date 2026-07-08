import ClassicTemplate from './ClassicTemplate.jsx'
import ModernTemplate from './ModernTemplate.jsx'
import SidebarTemplate from './SidebarTemplate.jsx'
import MinimalTemplate from './MinimalTemplate.jsx'
import CampusTemplate from './CampusTemplate.jsx'
import TimelineTemplate from './TimelineTemplate.jsx'
import DuotoneTemplate from './DuotoneTemplate.jsx'
import BoldTemplate from './BoldTemplate.jsx'

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

export const DEFAULT_TYPOGRAPHY = { font: 'default', size: 'm', density: 'normal' }

export default function Resume({ template, resume, accent, typography = DEFAULT_TYPOGRAPHY, t }) {
  const Template = TEMPLATES[template] || ModernTemplate
  const cls = [
    'resume',
    `tpl-${template}`,
    `size-${typography.size}`,
    `density-${typography.density}`,
    typography.font !== 'default' ? `font-${typography.font}` : '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <div className={cls} style={{ '--accent': accent }}>
      <Template resume={resume} t={t} />
    </div>
  )
}
