// AI command orchestration: turns a natural-language instruction into
// tool calls over the app's structured action space, and applies them.
import { resumeDigest } from './ai.js'

const AI_ENDPOINT = '/api/ai/chat/completions'
const MODEL = 'deepseek-chat'

export const COMMAND_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'update_resume_content',
      description:
        '修改简历文本内容。改写/生成正文时使用；只使用简历中已有事实，绝不编造数字。highlights/description 为多行文本，每行一条要点。',
      parameters: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: '新的个人简介全文' },
          basics: {
            type: 'object',
            properties: {
              name: { type: 'string' }, title: { type: 'string' }, location: { type: 'string' },
              email: { type: 'string' }, phone: { type: 'string' }, website: { type: 'string' }, github: { type: 'string' },
            },
          },
          experience: {
            type: 'array',
            description: '按序号修改已有工作经历（序号见简历摘要中的 工作[i]）',
            items: {
              type: 'object',
              properties: {
                index: { type: 'integer', description: '经历序号，从 0 开始' },
                highlights: { type: 'string' }, role: { type: 'string' }, company: { type: 'string' },
                start: { type: 'string' }, end: { type: 'string' }, location: { type: 'string' },
              },
              required: ['index'],
            },
          },
          projects: {
            type: 'array',
            description: '按序号修改已有项目（序号见 项目[i]）',
            items: {
              type: 'object',
              properties: {
                index: { type: 'integer' }, description: { type: 'string' }, name: { type: 'string' },
                role: { type: 'string' }, link: { type: 'string' },
              },
              required: ['index'],
            },
          },
          education: {
            type: 'array',
            description: '按序号修改已有教育经历（序号见 教育[i]）',
            items: {
              type: 'object',
              properties: {
                index: { type: 'integer' }, school: { type: 'string' }, degree: { type: 'string' },
                major: { type: 'string' }, description: { type: 'string' },
                start: { type: 'string' }, end: { type: 'string' },
              },
              required: ['index'],
            },
          },
          experience_add: {
            type: 'array',
            description: '新增工作经历条目',
            items: {
              type: 'object',
              properties: {
                company: { type: 'string' }, role: { type: 'string' }, start: { type: 'string' },
                end: { type: 'string' }, location: { type: 'string' }, highlights: { type: 'string' },
              },
              required: ['company', 'role'],
            },
          },
          education_add: {
            type: 'array',
            description: '新增教育经历条目',
            items: {
              type: 'object',
              properties: {
                school: { type: 'string' }, degree: { type: 'string' }, major: { type: 'string' },
                start: { type: 'string' }, end: { type: 'string' }, description: { type: 'string' },
              },
              required: ['school'],
            },
          },
          projects_add: {
            type: 'array',
            description: '新增项目条目',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' }, role: { type: 'string' }, link: { type: 'string' },
                description: { type: 'string' },
              },
              required: ['name'],
            },
          },
          skills_add: {
            type: 'array',
            items: { type: 'object', properties: { name: { type: 'string' }, detail: { type: 'string' } }, required: ['name'] },
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_template',
      description: '切换简历视觉模板',
      parameters: {
        type: 'object',
        properties: {
          template: { type: 'string', enum: ['modern', 'classic', 'sidebar', 'duotone', 'timeline', 'campus', 'minimal', 'bold'] },
        },
        required: ['template'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_accent',
      description: '设置主题色（十六进制颜色）',
      parameters: {
        type: 'object',
        properties: { color: { type: 'string', description: '#RRGGBB' } },
        required: ['color'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_typography',
      description: '调整排版：字体 / 字号 / 密度',
      parameters: {
        type: 'object',
        properties: {
          font: { type: 'string', enum: ['default', 'sans', 'serif', 'kai', 'fang'] },
          size: { type: 'string', enum: ['s', 'm', 'l'] },
          density: { type: 'string', enum: ['compact', 'normal', 'relaxed'] },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_page',
      description: '页面设置：纸张 / 页边距 / 压缩到一页',
      parameters: {
        type: 'object',
        properties: {
          paper: { type: 'string', enum: ['a4', 'letter'] },
          margin: { type: 'string', enum: ['compact', 'normal', 'relaxed'] },
          fit_one_page: { type: 'boolean', description: 'true=压缩到一页, false=取消压缩' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reorder_sections',
      description: '调整板块顺序。给出完整的新顺序数组（板块 key 见系统提示）。',
      parameters: {
        type: 'object',
        properties: { order: { type: 'array', items: { type: 'string' } } },
        required: ['order'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'toggle_section',
      description: '显示或隐藏某个板块',
      parameters: {
        type: 'object',
        properties: { key: { type: 'string' }, hidden: { type: 'boolean' } },
        required: ['key', 'hidden'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_cover_letter',
      description: '撰写或修改求职信（作为附加页展示）。content 为求职信全文；enabled 控制是否随简历导出。',
      parameters: {
        type: 'object',
        properties: { content: { type: 'string' }, enabled: { type: 'boolean' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'translate_resume',
      description: '整份简历翻译成目标语言',
      parameters: {
        type: 'object',
        properties: { target: { type: 'string', enum: ['en', 'zh'] } },
        required: ['target'],
      },
    },
  },
]

function docContext(doc, t) {
  const r = doc.resume
  const sectionNames = r.sectionOrder
    .map(k => {
      if (k.startsWith('custom:')) {
        const sec = (r.customSections || []).find(c => `custom:${c.id}` === k)
        return `${k}=${sec ? sec.title : '?'}`
      }
      return `${k}=${t.sections[k] || k}`
    })
    .join(', ')
  return (
    `当前模板: ${doc.template}；主题色: ${doc.accent}；排版: 字体=${doc.typography.font} 字号=${doc.typography.size} 密度=${doc.typography.density}；` +
    `纸张=${doc.page.size} 边距=${doc.page.margin} 压缩=${doc.page.fitScale < 1 ? '已压缩' : '未压缩'}\n` +
    `板块顺序(key=名称): ${sectionNames}\n隐藏板块: ${r.hiddenSections.join(', ') || '无'}\n\n简历内容摘要:\n${resumeDigest(r).slice(0, 3500)}`
  )
}

// One command turn: returns { message, actions: [{name, args}] }
export async function commandTurn(instruction, doc, t) {
  const system =
    '你是简历工作台的 AI 操作助手。用户会用自然语言下达指令，你通过调用工具完成操作，可以一次调用多个工具。' +
    '内容改写类指令：直接产出改写后的完整文本放进 update_resume_content（只用已有事实，缺数据用【补充数据】占位，绝不编造）。' +
    '外观类指令（模板/颜色/字体/纸张/顺序）：调用对应设置工具。' +
    '无法执行或指令含糊时不调用工具，用一句话说明。回复文字保持简短（一句话说明做了什么）。\n\n' +
    docContext(doc, t)

  const res = await fetch(AI_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: instruction },
      ],
      tools: COMMAND_TOOLS,
      tool_choice: 'auto',
    }),
  })
  if (!res.ok) throw new Error(`AI request failed: ${res.status}`)
  const data = await res.json()
  const msg = data.choices?.[0]?.message
  if (!msg) throw new Error('AI returned empty response')
  const actions = []
  for (const call of msg.tool_calls || []) {
    if (call.type !== 'function') continue
    let args = {}
    try {
      args = JSON.parse(call.function.arguments || '{}')
    } catch {
      continue
    }
    actions.push({ name: call.function.name, args })
  }
  return { message: (msg.content || '').trim(), actions }
}

/* ---------- Pure executors (sync actions) ---------- */

const CORE_KEYS = ['summary', 'experience', 'projects', 'education', 'skills']
const str = v => (typeof v === 'string' ? v : undefined)

export function applyContentPatch(resume, patch) {
  let next = resume
  const touched = new Set()
  const uid = (() => {
    let n = 0
    return () => `cmd-${Date.now().toString(36)}-${n++}`
  })()

  if (str(patch.summary)?.trim() && patch.summary !== resume.basics.summary) {
    next = { ...next, basics: { ...next.basics, summary: patch.summary } }
    touched.add('summary')
  }
  if (patch.basics && typeof patch.basics === 'object') {
    const allowed = ['name', 'title', 'location', 'email', 'phone', 'website', 'github']
    const updates = {}
    for (const k of allowed) {
      if (str(patch.basics[k]) !== undefined && patch.basics[k] !== next.basics[k]) updates[k] = patch.basics[k]
    }
    if (Object.keys(updates).length) {
      next = { ...next, basics: { ...next.basics, ...updates } }
      touched.add('basics')
    }
  }

  const patchList = (listKey, fields) => {
    if (!Array.isArray(patch[listKey])) return
    const list = [...next[listKey]]
    let hit = false
    for (const p of patch[listKey]) {
      const i = Number(p?.index)
      if (!Number.isInteger(i) || !list[i]) continue
      const updates = {}
      for (const f of fields) {
        if (str(p[f])?.trim() && p[f] !== list[i][f]) updates[f] = p[f]
      }
      if (Object.keys(updates).length) {
        list[i] = { ...list[i], ...updates }
        hit = true
      }
    }
    if (hit) {
      next = { ...next, [listKey]: list }
      touched.add(listKey)
    }
  }
  patchList('experience', ['highlights', 'role', 'company', 'start', 'end', 'location'])
  patchList('projects', ['description', 'name', 'role', 'link'])
  patchList('education', ['school', 'degree', 'major', 'description', 'start', 'end'])

  const addList = (addKey, listKey, requiredField, defaults) => {
    if (!Array.isArray(patch[addKey])) return
    const additions = patch[addKey]
      .filter(item => item && str(item[requiredField])?.trim())
      .map(item => {
        const entry = { id: uid(), ...defaults }
        for (const k of Object.keys(defaults)) {
          if (k !== 'id' && str(item[k]) !== undefined) entry[k] = item[k]
        }
        return entry
      })
    if (additions.length) {
      next = { ...next, [listKey]: [...next[listKey], ...additions] }
      touched.add(listKey)
    }
  }
  addList('experience_add', 'experience', 'company', {
    company: '', role: '', start: '', end: '', location: '', highlights: '',
  })
  addList('education_add', 'education', 'school', {
    school: '', degree: '', major: '', start: '', end: '', description: '',
  })
  addList('projects_add', 'projects', 'name', { name: '', role: '', link: '', description: '' })

  if (Array.isArray(patch.skills_add)) {
    const additions = patch.skills_add
      .filter(sk => sk && str(sk.name)?.trim())
      .map(sk => ({ id: uid(), name: sk.name, level: 3, detail: str(sk.detail) || '' }))
    if (additions.length) {
      next = { ...next, skills: [...next.skills, ...additions] }
      touched.add('skills')
    }
  }

  return { resume: next, touched: [...touched] }
}

// Applies one sync action to a doc; returns { doc, label } or null when invalid.
// translate_resume is async and handled by the caller.
export function applyCommandAction(doc, action, t) {
  const { name, args } = action
  if (name === 'update_resume_content') {
    const { resume, touched } = applyContentPatch(doc.resume, args)
    if (!touched.length) return null
    return {
      doc: { ...doc, resume },
      label: touched.map(k => t.cmd.labels.sections[k] || t.cmd.labels.content).join('、'),
    }
  }
  if (name === 'set_template') {
    if (!args.template) return null
    return { doc: { ...doc, template: args.template }, label: `${t.cmd.labels.template} → ${t.templates[args.template] || args.template}` }
  }
  if (name === 'set_accent') {
    if (!/^#[0-9a-fA-F]{6}$/.test(args.color || '')) return null
    return { doc: { ...doc, accent: args.color }, label: `${t.cmd.labels.accent} → ${args.color}` }
  }
  if (name === 'set_typography') {
    const typography = { ...doc.typography }
    let touched = false
    for (const k of ['font', 'size', 'density']) {
      if (args[k] && args[k] !== typography[k]) {
        typography[k] = args[k]
        touched = true
      }
    }
    if (!touched) return null
    return { doc: { ...doc, typography }, label: t.cmd.labels.typography }
  }
  if (name === 'set_page') {
    const page = { ...doc.page }
    let touched = false
    if (args.paper && args.paper !== page.size) {
      page.size = args.paper
      touched = true
    }
    if (args.margin && args.margin !== page.margin) {
      page.margin = args.margin
      touched = true
    }
    if (args.fit_one_page === false && page.fitScale < 1) {
      page.fitScale = 1
      touched = true
    }
    if (!touched && args.fit_one_page !== true) return null
    return { doc: { ...doc, page }, label: t.cmd.labels.page, wantsFit: args.fit_one_page === true }
  }
  if (name === 'reorder_sections') {
    if (!Array.isArray(args.order)) return null
    const valid = doc.resume.sectionOrder
    const requested = args.order.filter(k => valid.includes(k))
    const order = [...requested, ...valid.filter(k => !requested.includes(k))]
    if (order.join() === valid.join()) return null
    return { doc: { ...doc, resume: { ...doc.resume, sectionOrder: order } }, label: t.cmd.labels.reorder }
  }
  if (name === 'set_cover_letter') {
    const cover = { ...(doc.coverLetter || { enabled: false, content: '' }) }
    let touched = false
    if (str(args.content)?.trim()) {
      cover.content = args.content
      cover.enabled = args.enabled !== false
      touched = true
    } else if (typeof args.enabled === 'boolean' && args.enabled !== cover.enabled) {
      cover.enabled = args.enabled
      touched = true
    }
    if (!touched) return null
    return { doc: { ...doc, coverLetter: cover }, label: t.cmd.labels.cover }
  }
  if (name === 'toggle_section') {
    const key = args.key
    if (!key || (!CORE_KEYS.includes(key) && !doc.resume.sectionOrder.includes(key))) return null
    const hidden = doc.resume.hiddenSections
    const nextHidden = args.hidden ? [...new Set([...hidden, key])] : hidden.filter(k => k !== key)
    if (nextHidden.join() === hidden.join()) return null
    return {
      doc: { ...doc, resume: { ...doc.resume, hiddenSections: nextHidden } },
      label: args.hidden ? t.cmd.labels.hide : t.cmd.labels.show,
    }
  }
  return null
}
