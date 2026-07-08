// The unified assistant: coach persona + full tool access over the app.
// One conversation drives content interviews, edits, layout and tailoring.
import { COMMAND_TOOLS } from './commander.js'
import { resumeDigest } from './ai.js'
import { chatStream } from './sse.js'

const MODEL = 'deepseek-chat'

export const ASSISTANT_TOOLS = [
  ...COMMAND_TOOLS,
  {
    type: 'function',
    function: {
      name: 'create_tailored_version',
      description:
        '为目标职位（JD）生成一份定制版简历副本（新文档，原简历不动）。仅在用户明确确认要生成定制版后调用。',
      parameters: {
        type: 'object',
        properties: { jd: { type: 'string', description: '完整的职位描述文本' } },
        required: ['jd'],
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
    `当前简历「${doc.name || '未命名'}」；模板: ${doc.template}；主题色: ${doc.accent}；` +
    `排版: 字体=${doc.typography.font} 字号=${doc.typography.size} 密度=${doc.typography.density}；` +
    `纸张=${doc.page.size} 边距=${doc.page.margin}\n` +
    `板块(key=名称): ${sectionNames}\n隐藏板块: ${r.hiddenSections.join(', ') || '无'}\n\n简历内容:\n${resumeDigest(r).slice(0, 3500)}`
  )
}

export async function assistantTurn(history, doc, t, uiLang = 'zh', callbacks = {}) {
  const langNote = uiLang === 'zh' ? '始终用中文回复。' : 'Always reply in English.'
  const system =
    '你是「简历工坊」的 AI 助手，同时是一位顶尖的简历教练。用户在左侧与你对话，右侧画布实时渲染简历。' +
    '行为准则：\n' +
    '1) 修改类指令（内容 / 模板 / 颜色 / 排版 / 纸张 / 板块顺序与显隐 / 翻译）：直接调用工具执行，回复一句话确认。可一次调用多个工具。\n' +
    '2) 教练模式：用户想完善内容或回答了你的问题时，像面试官一样一次只问一个具体问题，优先追问量化数据（规模、百分比、金额）；拿到信息立即用 update_resume_content 写入专业表达（动词开头；只用用户提供的事实，缺数字用【补充数据】占位，绝不编造）。\n' +
    '3) 用户粘贴职位描述（JD）时：先在回复里给出简短匹配分析（2-3 条优势、2-3 条差距、最重要的 1-2 条修改建议），然后询问是否生成该职位的定制版；只有用户明确同意后才调用 create_tailored_version。\n' +
    '4) 回复口语化、简短（1-3 句 + 必要的列表）。不要重复简历内容原文。\n' +
    '5) 铁律：对简历的任何修改只能通过工具调用完成。绝不在文字回复里粘贴改写后的内容，绝不在没有调用工具的情况下声称"已更新/已修改"。用户要求修改时，直接调用工具，不要先征求确认（除了生成定制版）。\n' +
    langNote +
    '\n\n' +
    docContext(doc, t)

  const { content, toolCalls } = await chatStream(
    {
      model: MODEL,
      messages: [{ role: 'system', content: system }, ...history.slice(-14)],
      tools: ASSISTANT_TOOLS,
      tool_choice: 'auto',
    },
    callbacks,
  )
  const actions = []
  for (const call of toolCalls) {
    if (!call.name) continue
    try {
      actions.push({ name: call.name, args: JSON.parse(call.arguments || '{}') })
    } catch {
      /* skip malformed tool call */
    }
  }
  return { message: content.trim(), actions }
}
