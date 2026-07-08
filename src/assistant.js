// The unified assistant: coach persona + full tool access over the app.
// One conversation drives content interviews, edits, layout and tailoring.
import { COMMAND_TOOLS } from './commander.js'
import { resumeDigest } from './ai.js'
import { chatStream } from './sse.js'
import { coverageDigest } from './coverage.js'
import { vaultDigest, pickInterviewTarget } from './vault.js'

const MODEL = 'deepseek-chat'

export const ASSISTANT_TOOLS = [
  ...COMMAND_TOOLS,
  {
    type: 'function',
    function: {
      name: 'upsert_story',
      description:
        '把用户刚说的内容存入素材库（新建或更新一条故事）。用户每提供一点信息就调用：只记录用户亲口说的事实，绝不补全、绝不编数字。metrics 只收用户明确说出的数字。',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: '更新已有故事时传其 id；新故事省略' },
          title: { type: 'string', description: '故事标题，如"重构 CRM 线索流程"' },
          situation: { type: 'string' },
          task: { type: 'string' },
          action: { type: 'string' },
          result: { type: 'string' },
          metrics: { type: 'array', items: { type: 'string' }, description: '用户亲口说的数字，如"转化率 +27%"' },
          skills: { type: 'array', items: { type: 'string' } },
          asked: { type: 'string', description: '你刚问的问题（记入已问清单，避免重复提问）' },
          quote: { type: 'string', description: '用户回答的原话摘录（出处溯源）' },
          refused: { type: 'string', description: '用户拒答/跳过的问题（记入拒答清单，不再问）' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'plan_steps',
      description: '大任务（涉及 3 个以上板块或多轮修改）开始前调用：列出 3-6 步执行计划，用户会看到清单。',
      parameters: {
        type: 'object',
        properties: { steps: { type: 'array', items: { type: 'string' }, description: '每步一句话' } },
        required: ['steps'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mark_step_done',
      description: '完成计划中的一步后调用，勾选该步骤（index 从 0 开始）。',
      parameters: {
        type: 'object',
        properties: { index: { type: 'integer' } },
        required: ['index'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'save_target_jd',
      description: '用户粘贴目标职位描述（JD）时调用，把 JD 保存到当前简历的目标岗位档案（用于持续的匹配追踪）。',
      parameters: {
        type: 'object',
        properties: { jd: { type: 'string' } },
        required: ['jd'],
      },
    },
  },
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
    `板块(key=名称): ${sectionNames}\n隐藏板块: ${r.hiddenSections.join(', ') || '无'}\n` +
    `教练覆盖情况: ${coverageDigest(r)}\n` +
    (doc.jd ? `目标岗位 JD（已保存）: ${doc.jd.slice(0, 600)}\n` : '') +
    `\n简历内容:\n${resumeDigest(r).slice(0, 3500)}`
  )
}

// Real agent loop: the model calls tools, SEES each execution result
// (ok / no-op / error), and keeps going until it decides it's done.
// `execute` is provided by the app and returns a JSON-able result.
export async function runAgentLoop({
  history,
  getDoc,
  getVault,
  t,
  uiLang = 'zh',
  mode = 'assist',
  manualChange = false,
  execute,
  callbacks = {},
  maxIters = 8,
}) {
  const doc = getDoc()
  const vault = getVault ? getVault() : { stories: [] }
  const langNote = uiLang === 'zh' ? '始终用中文回复。' : 'Always reply in English.'
  const freshnessNote = manualChange
    ? '\n注意：自你上一轮回复之后，用户手动修改过简历（内容/模板/排版），对话历史中的旧描述可能过期 —— 一切以下方给出的最新状态为准。\n'
    : ''

  if (mode === 'interview') {
    const target = pickInterviewTarget(vault)
    const system =
      '你是「简历工坊」的职业访谈教练，正在对用户进行语音快问快答访谈。你的唯一目标：把用户做过的值钱的事挖出来，存进素材库，并写进简历。\n' +
      '铁律：\n' +
      '1) 一次只问一个问题，问题必须具体（指向某段经历的某个缺口），禁止"还有什么要补充的吗"这类空问。问题保持口语化、简短（一两句话）。\n' +
      '2) 用户每次回答后：先调用 upsert_story 把新信息存入素材库（只记用户亲口说的事实；数字只收用户明确说出的；把你刚问的问题写进 asked，用户原话写进 quote）。素材足够充实时（有动作有结果有数字），再调用 update_resume_content 把它写进简历对应板块（专业表达、动词开头，但只用已存素材里的事实）。\n' +
      '3) 绝不编造：缺的数字要通过追问获得，用户说不知道/不方便就记 refused，换方向，不纠缠。\n' +
      '4) 已问清单里的问题绝不重复问。\n' +
      '5) 每次回复的结尾必须是且只有一个新问题。前面可以用一句话确认收到了什么（"记下了：转化率+27%"），不要复述长内容。\n' +
      '6) 用户明显想结束（说"先到这""结束"等）时：不再提问，总结本次挖到的东西。\n' +
      `当前挖掘方向：${target.hint}${target.storyId ? `（目标故事 id=${target.storyId}）` : ''}\n` +
      freshnessNote +
      langNote +
      '\n\n' +
      (doc.jd ? `目标岗位 JD（提问优先对准它要求的能力）：\n${doc.jd.slice(0, 800)}\n\n` : '') +
      `${vaultDigest(vault, target.storyId)}\n\n当前简历摘要：\n${resumeDigest(doc.resume).slice(0, 1500)}`
    return loopWith(system)
  }

  const system =
    '你是「简历工坊」的 AI 助手，同时是一位顶尖的简历教练。用户在左侧与你对话，右侧画布实时渲染简历。' +
    '行为准则：\n' +
    '1) 修改类指令（内容 / 模板 / 颜色 / 排版 / 纸张 / 板块顺序与显隐 / 翻译）：直接调用工具执行，回复一句话确认。可一次调用多个工具。\n' +
    '2) 教练模式：用户想完善内容或回答了你的问题时，像面试官一样一次只问一个具体问题，优先追问量化数据（规模、百分比、金额）；拿到信息立即用 update_resume_content 写入专业表达（动词开头；只用用户提供的事实，缺数字用【补充数据】占位，绝不编造）。\n' +
    '3) 用户粘贴职位描述（JD）时：先在回复里给出简短匹配分析（2-3 条优势、2-3 条差距、最重要的 1-2 条修改建议），然后询问是否生成该职位的定制版；只有用户明确同意后才调用 create_tailored_version。\n' +
    '4) 回复口语化、简短（1-3 句 + 必要的列表）。不要重复简历内容原文。\n' +
    '5) 铁律：对简历的任何修改只能通过工具调用完成。绝不在文字回复里粘贴改写后的内容，绝不在没有调用工具的情况下声称"已更新/已修改"。用户要求修改时，直接调用工具，不要先征求确认（除了生成定制版）。\n' +
    '6) update_resume_content 可修改：简介(summary)、基本信息(basics)、工作经历(experience)、项目(projects)、教育经历(education)——均按简历摘要中的序号 工作[i]/项目[i]/教育[i] 定位；新增条目用 experience_add/education_add/projects_add/skills_add。\n' +
    '7) 大任务（涉及 3 个以上板块）：先调用 plan_steps 列出计划，执行过程中每完成一步调用 mark_step_done 勾选。教练访谈优先针对"教练覆盖情况"中标记为 缺失/弱 的部分提问。用户粘贴 JD 时先调用 save_target_jd 保存。\n' +
    '8) 每次工具调用后你会收到 JSON 执行结果：ok=true 表示已生效（changed 列出实际修改的板块）；ok=false 表示没有产生任何修改（hint 说明原因，如序号不存在、字段不支持、内容与原文相同）——此时修正参数重试，不要重复相同的调用。全部完成后用一句话总结，不要罗列修改内容原文。\n' +
    freshnessNote +
    langNote +
    '\n\n' +
    docContext(doc, t) +
    (vault.stories.length ? `\n\n${vaultDigest(vault)}` : '')

  return loopWith(system)

  async function loopWith(systemPrompt) {
    const messages = [{ role: 'system', content: systemPrompt }, ...history.slice(-14)]
    const texts = []
    let acted = false

    for (let iter = 0; iter < maxIters; iter++) {
      const { content, toolCalls } = await chatStream(
        { model: MODEL, messages, tools: ASSISTANT_TOOLS, tool_choice: 'auto' },
        callbacks,
      )
      if (content.trim()) texts.push(content.trim())
      if (!toolCalls.length) break

      messages.push({
        role: 'assistant',
        content: content || '',
        tool_calls: toolCalls.map((c, i) => ({
          id: c.id || `call_${iter}_${i}`,
          type: 'function',
          function: { name: c.name, arguments: c.arguments },
        })),
      })

      for (let i = 0; i < toolCalls.length; i++) {
        const call = toolCalls[i]
        const id = call.id || `call_${iter}_${i}`
        let args = {}
        let result
        try {
          args = JSON.parse(call.arguments || '{}')
        } catch {
          result = { ok: false, hint: 'arguments 不是合法 JSON' }
        }
        if (!result) result = await execute({ name: call.name, args })
        if (result.ok) acted = true
        messages.push({ role: 'tool', tool_call_id: id, content: JSON.stringify(result) })
      }
      // separate streamed text between iterations
      if (callbacks.onDelta && texts.length) callbacks.onDelta('')
    }

    return { message: texts.join('\n\n'), acted }
  }
}
