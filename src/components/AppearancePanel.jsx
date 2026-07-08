import { TEMPLATE_IDS } from '../templates/Resume.jsx'

const ACCENT_PRESETS = ['#2563eb', '#4f46e5', '#0d9488', '#b45309', '#e11d48', '#334155']

export function Segmented({ value, options, onChange }) {
  return (
    <div className="segmented">
      {options.map(opt => (
        <button
          key={opt.value}
          className={value === opt.value ? 'active' : ''}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function TemplateThumb({ id }) {
  // Miniature CSS sketches of each template's layout
  switch (id) {
    case 'classic':
      return (
        <div className="thumb">
          <i className="th-line th-center th-w50" />
          <i className="th-line th-center th-w35 th-faint" />
          <i className="th-rule" />
          <i className="th-line th-w80 th-faint" />
          <i className="th-line th-w70 th-faint" />
          <i className="th-rule" />
          <i className="th-line th-w75 th-faint" />
          <i className="th-line th-w60 th-faint" />
        </div>
      )
    case 'modern':
      return (
        <div className="thumb">
          <i className="th-line th-w50 th-bold" />
          <i className="th-line th-w30 th-accent" />
          <i className="th-block th-accent-bar" />
          <i className="th-line th-w85 th-faint" />
          <i className="th-line th-w70 th-faint" />
          <i className="th-block th-accent-bar" />
          <i className="th-line th-w80 th-faint" />
          <i className="th-line th-w60 th-faint" />
        </div>
      )
    case 'sidebar':
      return (
        <div className="thumb thumb-cols">
          <div className="th-side th-side-dark" />
          <div className="th-main">
            <i className="th-line th-w70 th-bold" />
            <i className="th-line th-w85 th-faint" />
            <i className="th-line th-w60 th-faint" />
            <i className="th-line th-w80 th-faint" />
            <i className="th-line th-w55 th-faint" />
          </div>
        </div>
      )
    case 'duotone':
      return (
        <div className="thumb thumb-cols">
          <div className="th-side th-side-light" />
          <div className="th-main">
            <i className="th-line th-w70 th-bold" />
            <i className="th-line th-w85 th-faint" />
            <i className="th-line th-w60 th-faint" />
            <i className="th-line th-w80 th-faint" />
            <i className="th-line th-w55 th-faint" />
          </div>
        </div>
      )
    case 'timeline':
      return (
        <div className="thumb">
          <i className="th-line th-w50 th-bold" />
          <div className="th-tl">
            <div className="th-tl-rail" />
            <div className="th-tl-lines">
              <i className="th-line th-w85 th-faint" />
              <i className="th-line th-w65 th-faint" />
              <i className="th-line th-w80 th-faint" />
              <i className="th-line th-w55 th-faint" />
            </div>
          </div>
        </div>
      )
    case 'campus':
      return (
        <div className="thumb">
          <i className="th-line th-w50 th-bold" />
          <i className="th-pill" />
          <i className="th-line th-w85 th-faint" />
          <i className="th-line th-w70 th-faint" />
          <i className="th-pill" />
          <div className="th-chips">
            <i /><i /><i />
          </div>
        </div>
      )
    case 'minimal':
      return (
        <div className="thumb">
          <i className="th-line th-w45 th-bold" />
          <div className="th-cols">
            <i className="th-line th-w90 th-faint" />
          </div>
          <div className="th-cols">
            <i className="th-line th-w90 th-faint" />
          </div>
          <div className="th-cols">
            <i className="th-line th-w80 th-faint" />
          </div>
        </div>
      )
    case 'bold':
      return (
        <div className="thumb thumb-banner">
          <div className="th-banner">
            <i className="th-line th-w50 th-white" />
            <i className="th-line th-w35 th-white-faint" />
          </div>
          <div className="th-banner-body">
            <i className="th-line th-w80 th-faint" />
            <i className="th-line th-w65 th-faint" />
            <i className="th-line th-w75 th-faint" />
          </div>
        </div>
      )
    default:
      return <div className="thumb" />
  }
}

// Manual appearance controls, demoted from the toolbar into refine mode.
// The primary path for these decisions is the assistant + onboarding.
export default function AppearancePanel({ t, template, accent, typography, page, onPatchDoc }) {
  const setTypo = patch => onPatchDoc({ typography: { ...typography, ...patch } })
  return (
    <div className="appearance-panel" data-testid="appearance-panel">
      <div className="appearance-group">
        <div className="appearance-title">{t.template}</div>
        <div className="appearance-templates" role="radiogroup" aria-label={t.template}>
          {TEMPLATE_IDS.map(id => (
            <button
              key={id}
              role="radio"
              aria-checked={template === id}
              className={`template-card ${template === id ? 'active' : ''}`}
              onClick={() => onPatchDoc({ template: id })}
            >
              <TemplateThumb id={id} />
              <span>{t.templates[id]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="appearance-group">
        <div className="appearance-title">{t.accentColor}</div>
        <div className="accent-picker appearance-accents" aria-label={t.accentColor}>
          {ACCENT_PRESETS.map(c => (
            <button
              key={c}
              className={`accent-swatch ${accent === c ? 'active' : ''}`}
              style={{ background: c }}
              title={c}
              onClick={() => onPatchDoc({ accent: c })}
            />
          ))}
          <label className="accent-custom" title={t.accentColor}>
            <input type="color" value={accent} onChange={e => onPatchDoc({ accent: e.target.value })} />
            <span
              className={`accent-swatch rainbow ${ACCENT_PRESETS.includes(accent) ? '' : 'active'}`}
              style={ACCENT_PRESETS.includes(accent) ? undefined : { background: accent }}
            />
          </label>
        </div>
      </div>

      <div className="appearance-group">
        <div className="appearance-title">{t.typography}</div>
        <div className="typo-row">
          <span className="typo-label">{t.typo.font}</span>
          <Segmented
            value={typography.font}
            onChange={v => setTypo({ font: v })}
            options={['default', 'sans', 'serif', 'kai', 'fang'].map(v => ({ value: v, label: t.typo.fonts[v] }))}
          />
        </div>
        <div className="typo-row">
          <span className="typo-label">{t.typo.size}</span>
          <Segmented
            value={typography.size}
            onChange={v => setTypo({ size: v })}
            options={['s', 'm', 'l'].map(v => ({ value: v, label: t.typo.sizes[v] }))}
          />
        </div>
        <div className="typo-row">
          <span className="typo-label">{t.typo.density}</span>
          <Segmented
            value={typography.density}
            onChange={v => setTypo({ density: v })}
            options={['compact', 'normal', 'relaxed'].map(v => ({ value: v, label: t.typo.densities[v] }))}
          />
        </div>
        <div className="typo-row">
          <span className="typo-label">{t.typo.paper}</span>
          <Segmented
            value={page.size}
            onChange={v => onPatchDoc({ page: { ...page, size: v } })}
            options={['a4', 'letter'].map(v => ({ value: v, label: t.typo.papers[v] }))}
          />
        </div>
        <div className="typo-row">
          <span className="typo-label">{t.typo.marginLabel}</span>
          <Segmented
            value={page.margin}
            onChange={v => onPatchDoc({ page: { ...page, margin: v } })}
            options={['compact', 'normal', 'relaxed'].map(v => ({ value: v, label: t.typo.margins[v] }))}
          />
        </div>
      </div>
    </div>
  )
}
