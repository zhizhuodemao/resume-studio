// One conversation per document, shared by both lenses (the sidebar
// Assistant and the full-screen Stage). Only one lens writes at a time
// (the Stage is a modal overlay), so a single localStorage store with
// load-on-mount semantics is race-free.

const KEY = docId => `rs-chat-${docId}`
const LIMIT = 60

export function loadChat(docId) {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY(docId)) || 'null')
    if (Array.isArray(raw) && raw.length) return raw
  } catch {
    /* corrupted */
  }
  return []
}

export function persistChat(docId, messages) {
  try {
    const slim = messages.slice(-LIMIT).map(m => {
      const { snapshot, pending, actionLog, streaming, ...rest } = m
      if (rest.plan) rest.plan = { steps: rest.plan.steps, ticks: rest.plan.ticks }
      return rest
    })
    localStorage.setItem(KEY(docId), JSON.stringify(slim))
  } catch {
    /* storage full */
  }
}

// History for the model: role/content only, no client-side artifacts.
export function toModelHistory(messages) {
  return messages.filter(m => !m.system && !m.welcome && m.content).map(m => ({ role: m.role, content: m.content }))
}
