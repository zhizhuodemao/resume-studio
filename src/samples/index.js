import tech from './tech.js'
import product from './product.js'
import design from './design.js'
import operations from './operations.js'
import business from './business.js'

const LIBRARY = { tech, product, design, operations, business }

export const SAMPLE_TRACKS = Object.keys(LIBRARY)

export const hasStage = (track, stage) => Boolean(LIBRARY[track]?.stages[stage])

export function getSample(track, stage, lang) {
  const entry = LIBRARY[track] || LIBRARY.tech
  const stageEntry = entry.stages[stage] || entry.stages.social
  return (stageEntry[lang] || stageEntry.zh)()
}

export function recommendedTemplate(track, stage) {
  const entry = LIBRARY[track]
  return (entry && (entry.recommend[stage] || entry.recommend.social)) || 'modern'
}

export function getPlaceholders(track, lang) {
  return LIBRARY[track]?.placeholders[lang] || null
}
