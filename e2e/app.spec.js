import { test, expect } from '@playwright/test'

const openRefine = page => page.getByTestId('refine-btn').click()

// Sequential AI mock: response N answers request N (last one repeats).
// The agent loop makes follow-up requests after tool executions, so
// tool-call mocks MUST be followed by a plain-content "done" response.
const mockAgent = (page, responses) => {
  let i = 0
  return page.route('**/api/ai/**', route => {
    const r = responses[Math.min(i, responses.length - 1)]
    i += 1
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ choices: [{ message: { content: r.content || '', tool_calls: r.tool_calls || [] } }] }),
    })
  })
}
const toolCall = (name, args, id = 'c1') => ({ id, type: 'function', function: { name, arguments: JSON.stringify(args) } })

// Each test gets a fresh browser context (clean localStorage).
// `?onboarding=0` skips the first-run dialog and loads the default tech sample.

test('onboarding: pick a track, land on the interview stage', async ({ page }) => {
  await mockAgent(page, [{ content: '第一个问题：你最近一段工作里最有成就感的事是什么？' }])
  await page.goto('/')
  await expect(page.getByText('先认识一下你')).toBeVisible()
  await page.getByRole('button', { name: '产品', exact: true }).click()
  await page.getByRole('button', { name: '开始制作' }).click()
  // entry inversion: first-run lands on the Stage, not the editor
  const stage = page.getByTestId('stage')
  await expect(stage).toBeVisible()
  // no JD yet → JD-first entry screen; skip straight to talking
  await page.getByTestId('stage-start').click()
  await expect(page.getByTestId('stage-question')).toContainText('最有成就感', { timeout: 10_000 })
  // exit to the workbench: the tailored sample is there
  await page.getByTestId('stage-exit').click()
  await expect(page.locator('.page .resume.tpl-timeline')).toHaveCount(1)
  await expect(page.locator('.page')).toContainText('苏明远')
})

test('editing a field updates the live preview', async ({ page }) => {
  await page.goto('/?onboarding=0')
  await openRefine(page)
  const name = page.getByLabel('姓名')
  await name.fill('端到端测试员')
  await expect(page.locator('.page')).toContainText('端到端测试员')
})

test('switching template via the refine looks tab', async ({ page }) => {
  await page.goto('/?onboarding=0')
  await openRefine(page)
  await page.getByTestId('looks-tab').click()
  await page.getByRole('radio', { name: /极简/ }).click()
  await expect(page.locator('.page .resume.tpl-minimal')).toHaveCount(1)
})

test('undo restores a deleted experience entry', async ({ page }) => {
  await page.goto('/?onboarding=0')
  await openRefine(page)
  const expSection = page.locator('.section-card', { hasText: '工作经历' })
  const entries = expSection.locator('.entry-card')
  await expect(entries).toHaveCount(2)
  await entries.first().getByTitle('删除').click()
  await expect(entries).toHaveCount(1)
  await page.getByTitle('撤销 (Ctrl+Z)').click()
  await expect(entries).toHaveCount(2)
})

test('multi-resume: create blank, switch back and forth', async ({ page }) => {
  await page.goto('/?onboarding=0')
  await page.getByTestId('doc-switcher').click()
  await page.getByRole('button', { name: '新建空白' }).click()
  await expect(page.getByTestId('doc-switcher')).toContainText('未命名简历')
  // New blank doc renders an empty page (no sample name)
  await expect(page.locator('.page')).not.toContainText('陈嘉禾')
  // Switch back to the first doc
  await page.getByTestId('doc-switcher').click()
  await page.locator('.docs-item', { hasText: '我的简历' }).click()
  await expect(page.locator('.page')).toContainText('陈嘉禾')
})

test('JSON export downloads and import creates a new doc', async ({ page }) => {
  await page.goto('/?onboarding=0')
  await page.getByTestId('export-menu-btn').click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出 JSON' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toContain('.resume.json')

  // Import a minimal bare-resume JSON as a new document (docs menu)
  await page.getByTestId('doc-switcher').click()
  const imported = {
    basics: { name: '导入测试', title: '', email: '', phone: '', location: '', website: '', github: '', photo: '', summary: '' },
    experience: [], projects: [], education: [], skills: [],
    sectionOrder: ['summary', 'experience', 'projects', 'education', 'skills'],
    hiddenSections: [],
  }
  await page.locator('input[type="file"][accept*="json"]').setInputFiles({
    name: 'imported.resume.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(imported)),
  })
  await expect(page.getByTestId('doc-switcher')).toContainText('imported')
  await expect(page.locator('.page')).toContainText('导入测试')
})

test('schema v1 data in localStorage migrates to v2 on load', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'resume-studio-v1',
      JSON.stringify({
        lang: 'zh',
        template: 'classic',
        accent: '#334155',
        resume: {
          basics: { name: '旧版用户', title: '', email: '', phone: '', location: '', website: '', github: '', photo: '', summary: '' },
          experience: [], projects: [], education: [], skills: [],
          sectionOrder: ['summary', 'experience', 'projects', 'education', 'skills'],
          hiddenSections: [],
        },
      }),
    )
  })
  await page.goto('/')
  // No onboarding for migrated users; their data and template survive
  await expect(page.getByText('先认识一下你')).toBeHidden()
  await expect(page.locator('.page')).toContainText('旧版用户')
  await expect(page.locator('.page .resume.tpl-classic')).toHaveCount(1)
})

test('custom section: add preset, fill item, renders in preview', async ({ page }) => {
  await page.goto('/?onboarding=0')
  await openRefine(page)
  await page.getByRole('button', { name: '添加板块' }).click()
  await page.getByRole('button', { name: '证书资质' }).click()
  // custom section titles live in an <input>, so match by value not text
  const section = page.locator('.section-card').filter({ has: page.locator('.section-title-input') }).last()
  await expect(section.locator('.section-title-input')).toHaveValue('证书资质')
  await section.getByRole('button', { name: '添加一项' }).click()
  await section.getByLabel('名称', { exact: true }).fill('PMP 项目管理认证')
  await section.getByLabel('时间 / 备注').fill('2024.06')
  await expect(page.locator('.page')).toContainText('证书资质')
  await expect(page.locator('.page')).toContainText('PMP 项目管理认证')
  await expect(page.locator('.page')).toContainText('2024.06')
})

test('rich text: bold markdown renders as <strong> in preview', async ({ page }) => {
  await page.goto('/?onboarding=0')
  await openRefine(page)
  const summary = page.locator('.section-card', { hasText: '个人简介' }).locator('textarea')
  await summary.fill('拥有 **8 年** 大型项目经验')
  await expect(page.locator('.page strong').first()).toHaveText('8 年')
})

test('drag and drop reorders sections', async ({ page }) => {
  await page.goto('/?onboarding=0')
  await openRefine(page)
  const skillsHandle = page.locator('.section-card', { hasText: '专业技能' }).locator('.drag-handle').first()
  const summaryCard = page.locator('.section-card', { hasText: '个人简介' })
  // dispatch HTML5 drag events deterministically (drives our React handlers)
  const dt = await page.evaluateHandle(() => new DataTransfer())
  await skillsHandle.dispatchEvent('dragstart', { dataTransfer: dt })
  await summaryCard.dispatchEvent('dragover', { dataTransfer: dt })
  await summaryCard.dispatchEvent('drop', { dataTransfer: dt })
  // 技能板块被拖到个人简介位置 → 预览中第一个板块标题应为 专业技能
  await expect(page.locator('.page .m-section').first()).toContainText('专业技能')
})

test('layout controls: paper size, margins and fonts apply', async ({ page }) => {
  await page.goto('/?onboarding=0')
  await openRefine(page)
  await page.getByTestId('looks-tab').click()
  // Letter paper resizes the preview page
  await page.getByRole('button', { name: 'Letter' }).click()
  await expect(page.locator('.preview .page')).toHaveCSS('width', '816px')
  // compact margins + kai font map to resume classes
  await page.locator('.typo-row', { hasText: '页边距' }).getByRole('button', { name: '紧凑' }).click()
  await page.getByRole('button', { name: '楷体' }).click()
  await expect(page.locator('.preview .resume')).toHaveClass(/margin-compact/)
  await expect(page.locator('.preview .resume')).toHaveClass(/font-kai/)
})

test('fit to one page compresses overflowing content', async ({ page }) => {
  await page.goto('/?onboarding=0')
  await openRefine(page)
  const summary = page.locator('.section-card', { hasText: '个人简介' }).locator('textarea')
  await summary.fill('很长的内容。'.repeat(120))
  await expect(page.locator('.page-hint')).toContainText('共 2 页')
  await page.locator('.page-hint').getByRole('button', { name: '压缩到一页' }).click()
  await expect(page.locator('.page-hint')).toContainText('共 1 页')
  // undo fit restores
  await page.locator('.page-hint').getByRole('button', { name: '取消压缩' }).click()
  await expect(page.locator('.page-hint')).toContainText('共 2 页')
})

test('status strip: quiet ✓ when perfect, findings expand when not', async ({ page }) => {
  await page.goto('/?onboarding=0')
  const health = page.getByTestId('health-btn')
  // perfect sample resume → quiet ✓, nothing to expand
  await expect(health).toContainText('✓')
  await expect(health).toBeDisabled()
  // blank doc → score + issue count appear, click expands findings
  await page.getByTestId('doc-switcher').click()
  await page.getByRole('button', { name: '新建空白' }).click()
  await expect(health).toContainText('项')
  await health.click()
  await expect(page.getByTestId('assistant').locator('.assistant-findings')).toContainText('缺少姓名')
})

test('assistant coaches: interview turn writes into the resume', async ({ page }) => {
  await mockAgent(page, [
    { content: '', tool_calls: [toolCall('update_resume_content', { summary: '教练更新后的专业简介，突出量化成果。' })] },
    { content: '很棒！下一个问题：这个项目服务了多少用户？' },
  ])
  await page.goto('/?onboarding=0')
  const assistant = page.getByTestId('assistant')
  await page.getByTestId('cmd-input').fill('我把转化率提升了 30%')
  await page.getByTestId('cmd-input').press('Enter')
  await expect(assistant).toContainText('下一个问题')
  await expect(assistant).toContainText('简介已更新')
  await expect(page.locator('.preview .page')).toContainText('教练更新后的专业简介')
  const card = assistant.getByTestId('diff-card').first()
  await expect(card).toContainText('个人简介')
  await expect(card).toContainText('教练更新后的专业简介')
  await card.getByRole('button', { name: '撤销此次修改' }).click()
  await expect(page.locator('.preview .page')).not.toContainText('教练更新后的专业简介')
})

test('JD tailoring via assistant tool creates and opens a tailored copy', async ({ page }) => {
  await mockAgent(page, [
    { content: '好的，正在为这个职位生成定制版…', tool_calls: [toolCall('create_tailored_version', { jd: '高级前端，要求 React 与 K8s' })] },
    { content: JSON.stringify({
        basics: { name: '陈嘉禾', title: '高级前端工程师', location: '上海', summary: '为该职位定制的简介' },
        experience: [], projects: [], education: [], skills: [],
      }) },
    { content: '定制版已创建。' },
  ])
  await page.goto('/?onboarding=0')
  await page.getByTestId('cmd-input').fill('帮我生成这个 JD 的定制版：高级前端，要求 React 与 K8s')
  await page.getByTestId('cmd-input').press('Enter')
  await expect(page.getByTestId('doc-switcher')).toContainText('定制版', { timeout: 10_000 })
  await expect(page.locator('.preview .page')).toContainText('为该职位定制的简介')
  await page.getByTestId('doc-switcher').click()
  await page.locator('.docs-item', { hasText: /^我的简历/ }).first().click()
  await expect(page.locator('.preview .page')).not.toContainText('为该职位定制的简介')
})

test('Word and TXT export download files', async ({ page }) => {
  await page.goto('/?onboarding=0')
  await page.getByTestId('export-menu-btn').click()
  const d1 = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出 Word' }).click()
  expect((await d1).suggestedFilename()).toContain('.docx')
  await page.getByTestId('export-menu-btn').click()
  const d2 = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出 TXT' }).click()
  expect((await d2).suggestedFilename()).toContain('.txt')
})

test('cover letter renders as an extra preview page when enabled', async ({ page }) => {
  await page.goto('/?onboarding=0')
  await openRefine(page)
  const coverCard = page.locator('.section-card', { hasText: '求职信' })
  await coverCard.locator('textarea').fill('尊敬的招聘经理：\n我对贵公司的职位很感兴趣。')
  await expect(page.locator('.preview .page')).toHaveCount(1) // still disabled
  await coverCard.getByTitle('在简历中显示').click()
  await expect(page.locator('.preview .page')).toHaveCount(2)
  await expect(page.locator('.preview .page').nth(1)).toContainText('尊敬的招聘经理')
  await coverCard.getByTitle('在简历中隐藏').click()
  await expect(page.locator('.preview .page')).toHaveCount(1)
})

test('clicking a preview section jumps to its editor card', async ({ page }) => {
  await page.goto('/?onboarding=0')
  await page.locator('.preview .page section', { hasText: '教育经历' }).locator('h2').click()
  await expect(page.locator('.section-card.flash', { hasText: '教育经历' })).toHaveCount(1)
})

test('mobile layout: tab bar switches between assistant and preview', async ({ page }) => {
  await page.setViewportSize({ width: 420, height: 800 })
  await page.goto('/?onboarding=0')
  await expect(page.locator('.mobile-tabs')).toBeVisible()
  await expect(page.getByTestId('assistant')).toBeVisible()
  await expect(page.locator('.preview')).toBeHidden()
  await page.locator('.mobile-tabs').getByRole('button', { name: '预览' }).click()
  await expect(page.getByTestId('assistant')).toBeHidden()
  await expect(page.locator('.preview')).toBeVisible()
})

test('toolbar fits common laptop widths without horizontal overflow', async ({ page }) => {
  for (const width of [1680, 1440, 1366, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/?onboarding=0')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow, `overflow at ${width}px`).toBeLessThanOrEqual(0)
    // export button (rightmost) must be fully visible
    const btn = page.getByRole('button', { name: /导出 PDF/ })
    const box = await btn.boundingBox()
    expect(box.x + box.width, `export button clipped at ${width}px`).toBeLessThanOrEqual(width)
  }
})

test('slim toolbar: looks live in refine, utilities in the overflow menu', async ({ page }) => {
  await page.goto('/?onboarding=0')
  // appearance controls are no longer toolbar chrome
  await expect(page.getByRole('button', { name: /^模板/ })).toHaveCount(0)
  await expect(page.locator('.toolbar .accent-picker')).toHaveCount(0)
  await openRefine(page)
  await page.getByTestId('looks-tab').click()
  await expect(page.getByTestId('appearance-panel')).toContainText('模板')
  await expect(page.getByTestId('appearance-panel').locator('.accent-swatch').first()).toBeVisible()
  // labeled sample-library menu keeps load/clear; language is standalone
  await expect(page.locator('.toolbar').getByRole('button', { name: 'EN' })).toBeVisible()
  await page.getByTestId('more-btn').click()
  await expect(page.getByRole('button', { name: '载入示例' })).toBeVisible()
  await expect(page.getByRole('button', { name: '清空内容' })).toBeVisible()
})
test('assistant executes tool calls with live canvas highlight and undo', async ({ page }) => {
  await mockAgent(page, [
    { content: '', tool_calls: [
      toolCall('set_template', { template: 'timeline' }, 'c1'),
      toolCall('update_resume_content', { summary: '助手更新的简介' }, 'c2'),
    ] },
    { content: '已切换到时间线模板并更新了简介。' },
  ])
  await page.goto('/?onboarding=0')
  const input = page.getByTestId('cmd-input')
  await input.fill('换成时间线模板，简介重写一下')
  await input.press('Enter')
  await expect(page.locator('.preview .resume.tpl-timeline')).toHaveCount(1)
  await expect(page.locator('.preview .page')).toContainText('助手更新的简介')
  await expect(page.locator('.preview .page section.ai-changed').first()).toBeVisible()
  const assistant = page.getByTestId('assistant')
  await expect(assistant).toContainText('时间线')
  await assistant.getByRole('button', { name: '撤销此次修改' }).click()
  await expect(page.locator('.preview .resume.tpl-modern')).toHaveCount(1)
  await expect(page.locator('.preview .page')).not.toContainText('助手更新的简介')
})

test('JD pasted in onboarding routes into a targeted stage interview', async ({ page }) => {
  await mockAgent(page, [{ content: '这个岗位要求增长经验——你做过最能体现增长能力的一件事是什么？' }])
  await page.goto('/')
  await page.getByRole('button', { name: '产品', exact: true }).click()
  await page.locator('.onboard-jd').fill('招聘高级产品经理：负责增长策略，要求数据驱动')
  await page.getByRole('button', { name: '开始制作' }).click()
  await expect(page.getByTestId('stage')).toBeVisible()
  await expect(page.getByTestId('stage-question')).toContainText('增长', { timeout: 10_000 })
  await page.getByTestId('stage-exit').click()
  await expect(page.getByTestId('jd-btn')).toContainText('目标岗位')
})
test('assistant streams SSE: typed deltas and fragmented tool calls', async ({ page }) => {
  const sse = [
    'data: {"choices":[{"delta":{"content":"正在为你"}}]}',
    'data: {"choices":[{"delta":{"content":"切换模板…"}}]}',
    'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"c1","function":{"name":"set_template","arguments":"{\\"temp"}}]}}]}',
    'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"late\\":\\"bold\\"}"}}]}}]}',
    'data: [DONE]',
    '',
  ].join('\n\n')
  let call = 0
  await page.route('**/api/ai/**', route => {
    call += 1
    if (call === 1) route.fulfill({ contentType: 'text/event-stream', body: sse })
    else
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ choices: [{ message: { content: '已切换到创意模板。' } }] }),
      })
  })
  await page.goto('/?onboarding=0')
  const input = page.getByTestId('cmd-input')
  await input.fill('换成创意模板')
  await input.press('Enter')
  const assistant = page.getByTestId('assistant')
  await expect(assistant).toContainText('正在为你切换模板…')
  await expect(page.locator('.preview .resume.tpl-bold')).toHaveCount(1)
  await expect(assistant).toContainText('创意')
})

test('account: register, then restore resumes on a fresh device', async ({ page, browser }) => {
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.dev`

  await page.goto('/?onboarding=0')
  // register through the modal
  await page.getByTestId('account-btn').click()
  await page.getByTestId('account-switch').click()
  await page.getByTestId('account-email').fill(email)
  await page.getByTestId('account-password').fill('secret123')
  await page.getByTestId('account-submit').click()
  await expect(page.getByTestId('account-menu-btn')).toBeVisible()

  // make an identifiable edit and let autosave + cloud push run
  await openRefine(page)
  await page.getByLabel('姓名').fill('云端同步用户')
  await expect(page.locator('.page')).toContainText('云端同步用户')
  await page.waitForTimeout(2300)

  // brand-new browser context = fresh device with empty storage
  const ctx2 = await browser.newContext()
  const page2 = await ctx2.newPage()
  await page2.goto('http://localhost:5199/?onboarding=0')
  await expect(page2.getByTestId('account-btn')).toBeVisible() // logged out
  await expect(page2.locator('.page')).not.toContainText('云端同步用户')

  // log in — cloud-restore dialog auto-accepted → resumes appear
  await page2.getByTestId('account-btn').click()
  await page2.getByTestId('account-email').fill(email)
  await page2.getByTestId('account-password').fill('secret123')
  await page2.getByTestId('account-submit').click()
  // in-app dialog offers the cloud restore — accept it
  await page2.getByTestId('dialog-ok').click()
  await expect(page2.locator('.page')).toContainText('云端同步用户', { timeout: 10_000 })
  await expect(page2.getByTestId('account-menu-btn')).toBeVisible()
  await ctx2.close()
})
test('guest trial exhaustion prompts signup and opens the login modal', async ({ page }) => {
  await page.route('**/api/ai/**', route =>
    route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: 'guest_trial_exhausted' }) }),
  )
  await page.goto('/?onboarding=0')
  const input = page.getByTestId('cmd-input')
  await input.fill('帮我润色简介')
  await input.press('Enter')
  await expect(page.getByTestId('assistant')).toContainText('免费体验次数用完')
  await expect(page.getByTestId('account-submit')).toBeVisible()
})

test('guest conversion nudge appears after a successful AI edit', async ({ page }) => {
  await mockAgent(page, [
    { content: '', tool_calls: [toolCall('update_resume_content', { summary: '游客体验的新简介' })] },
    { content: '已更新。' },
  ])
  await page.goto('/?onboarding=0')
  await expect(page.getByTestId('guest-chip')).toContainText('体验模式')
  await page.getByTestId('cmd-input').fill('改一下简介')
  await page.getByTestId('cmd-input').press('Enter')
  const assistant = page.getByTestId('assistant')
  await expect(assistant).toContainText('云端备份')
  await expect(assistant.getByRole('button', { name: '免费注册 / 登录' })).toBeVisible()
})

test('assistant bubbles render markdown instead of raw asterisks', async ({ page }) => {
  await page.route('**/api/ai/**', route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        choices: [{ message: {
          content: '建议如下：\n- 突出 **量化成果**\n- 精简第二段',
          tool_calls: [],
        } }],
      }),
    }),
  )
  await page.goto('/?onboarding=0')
  await page.getByTestId('cmd-input').fill('给点建议')
  await page.getByTestId('cmd-input').press('Enter')
  const assistant = page.getByTestId('assistant')
  await expect(assistant.locator('.coach-bubble strong')).toHaveText('量化成果')
  await expect(assistant.locator('.coach-bubble li')).toHaveCount(2)
  await expect(assistant).not.toContainText('**')
})

test('agent insurance: narrated edit without tools triggers a forced action retry', async ({ page }) => {
  await mockAgent(page, [
    { content: '好的，个人简介已更新为更有冲击力的版本。' },
    { content: '', tool_calls: [toolCall('update_resume_content', { summary: '守护机制写入的简介' })] },
    { content: '这次真的更新好了。' },
  ])
  await page.goto('/?onboarding=0')
  await page.getByTestId('cmd-input').fill('帮我修改个人简介')
  await page.getByTestId('cmd-input').press('Enter')
  await expect(page.locator('.preview .page')).toContainText('守护机制写入的简介')
  await expect(page.getByTestId('assistant')).toContainText('简介已更新')
})

test('agent self-corrects a bad index from the tool result feedback', async ({ page }) => {
  await mockAgent(page, [
    { content: '', tool_calls: [toolCall('update_resume_content', { education: [{ index: 9, school: '清华大学' }] })] },
    { content: '', tool_calls: [toolCall('update_resume_content', { education: [{ index: 0, school: '清华大学' }] })] },
    { content: '教育经历已改为清华大学。' },
  ])
  await page.goto('/?onboarding=0')
  await page.getByTestId('cmd-input').fill('教育经历改成清华大学')
  await page.getByTestId('cmd-input').press('Enter')
  await expect(page.locator('.preview .page')).toContainText('清华大学')
  await expect(page.locator('.preview .page')).not.toContainText('浙江大学')
  const card = page.getByTestId('diff-card').first()
  await expect(card).toContainText('教育经历')
  await expect(card).toContainText('浙江大学')
  await expect(card).toContainText('清华大学')
})

test('review-first mode: canvas untouched until the diff is accepted', async ({ page }) => {
  await mockAgent(page, [
    { content: '', tool_calls: [toolCall('update_resume_content', { summary: '待确认的新简介' })] },
    { content: '修改已准备好，请确认。' },
  ])
  await page.goto('/?onboarding=0')
  await page.getByTestId('review-confirm').click()
  await page.getByTestId('cmd-input').fill('改一下简介')
  await page.getByTestId('cmd-input').press('Enter')
  const card = page.getByTestId('diff-card').first()
  await expect(card).toContainText('待确认')
  // canvas NOT changed yet
  await expect(page.locator('.preview .page')).not.toContainText('待确认的新简介')
  await card.getByTestId('diff-accept').click()
  await expect(page.locator('.preview .page')).toContainText('待确认的新简介')
  await expect(card).toContainText('已采纳')
})

test('conversation persists across reloads per document', async ({ page }) => {
  await mockAgent(page, [
    { content: '', tool_calls: [toolCall('update_resume_content', { summary: '持久化测试简介' })] },
    { content: '好的，已完成修改。' },
  ])
  await page.goto('/?onboarding=0')
  await page.getByTestId('cmd-input').fill('这轮对话应当在刷新后保留')
  await page.getByTestId('cmd-input').press('Enter')
  await expect(page.getByTestId('assistant')).toContainText('已完成修改')
  await page.reload()
  const assistant = page.getByTestId('assistant')
  await expect(assistant).toContainText('这轮对话应当在刷新后保留')
  await expect(assistant).toContainText('已完成修改')
  await expect(assistant.getByTestId('diff-card').first()).toContainText('个人简介')
})

test('plan checklist renders and ticks during a multi-step task', async ({ page }) => {
  await mockAgent(page, [
    { content: '', tool_calls: [toolCall('plan_steps', { steps: ['优化简介', '量化工作经历', '调整模板'] })] },
    { content: '', tool_calls: [
      toolCall('update_resume_content', { summary: '按计划更新的简介' }, 'c2'),
      toolCall('mark_step_done', { index: 0 }, 'c3'),
    ] },
    { content: '', tool_calls: [toolCall('mark_step_done', { index: 1 }, 'c4'), toolCall('set_template', { template: 'minimal' }, 'c5'), toolCall('mark_step_done', { index: 2 }, 'c6')] },
    { content: '全部完成。' },
  ])
  await page.goto('/?onboarding=0')
  await page.getByTestId('cmd-input').fill('整份简历全面优化一遍')
  await page.getByTestId('cmd-input').press('Enter')
  const plan = page.getByTestId('plan-card')
  await expect(plan).toContainText('执行计划 · 3/3')
  await expect(plan.locator('.plan-step.done')).toHaveCount(3)
  await expect(page.locator('.preview .resume.tpl-minimal')).toHaveCount(1)
})

test('selecting canvas text offers an AI handoff that prefills the input', async ({ page }) => {
  await page.goto('/?onboarding=0')
  // select the summary paragraph on the canvas
  await page.evaluate(() => {
    const sections = [...document.querySelectorAll('.preview .page section')]
    const sec = sections.find(el => el.querySelector('h2')?.textContent.includes('个人简介'))
    const para = sec.querySelector('p')
    const range = document.createRange()
    range.selectNodeContents(para)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
  })
  await page.locator('.preview').dispatchEvent('mouseup')
  const btn = page.getByTestId('sel-edit-btn')
  await expect(btn).toBeVisible()
  await btn.click()
  const input = page.getByTestId('cmd-input')
  await expect(input).toHaveValue(/修改画布上选中的这段内容/)
  await expect(input).toHaveValue(/6 年大型 Web 应用开发经验/)
})

test('JD workspace: save target, analyze match, keyword chips prefill', async ({ page }) => {
  await page.route('**/api/ai/**', route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        choices: [{ message: { content: JSON.stringify({
          score: 68,
          missing_keywords: ['Kubernetes', '微服务'],
          strengths: ['React 深度匹配'],
          suggestions: ['补充容器化经验'],
        }) } }],
      }),
    }),
  )
  await page.goto('/?onboarding=0')
  await page.getByTestId('jd-btn').click()
  const panel = page.getByTestId('jd-panel')
  await panel.locator('textarea').fill('招聘高级前端，要求 React、Kubernetes、微服务')
  await panel.getByRole('button', { name: '分析匹配度' }).click()
  await expect(panel).toContainText('匹配度 68')
  const kw = panel.locator('.jd-kw', { hasText: 'Kubernetes' })
  await expect(kw).toBeVisible()
  await kw.click()
  await expect(page.getByTestId('cmd-input')).toHaveValue(/自然融入关键词「Kubernetes」/)
  // target chip reflects the saved JD + score
  await expect(page.getByTestId('jd-btn')).toContainText('目标岗位 · 68')
})

test('vault dashboard: migrated v2 resumes appear as stub stories', async ({ page }) => {
  await page.addInitScript(() => {
    const doc = {
      id: 'old-1', name: '老简历', template: 'modern', accent: '#2563eb',
      typography: { font: 'default', size: 'm', density: 'normal' },
      page: { size: 'a4', margin: 'normal', fitScale: 1 },
      coverLetter: { enabled: false, content: '' },
      resume: {
        basics: { name: '老用户', title: 'PM', email: '', phone: '', location: '', website: '', github: '', photo: '', summary: '' },
        experience: [{ id: 'e1', company: '云徙科技', role: '高级产品经理', start: '', end: '', location: '', highlights: '负责 CRM 产品线' }],
        projects: [{ id: 'p1', name: '企业微信生态集成', role: '', link: '', description: '主导打通' }],
        education: [], skills: [], customSections: [],
        sectionOrder: ['summary', 'experience', 'projects', 'education', 'skills'],
        hiddenSections: [],
      },
    }
    localStorage.setItem('resume-studio-v2', JSON.stringify({ version: 2, lang: 'zh', activeId: 'old-1', resumes: [doc] }))
  })
  await page.goto('/?onboarding=0')
  const vaultBtn = page.getByTestId('vault-btn')
  await expect(vaultBtn).toContainText('2')
  await vaultBtn.click()
  const panel = page.getByTestId('vault-panel')
  await expect(panel).toContainText('高级产品经理 @ 云徙科技')
  await expect(panel).toContainText('企业微信生态集成')
})
test('conversation identity: user right-aligned dark, assistant left with avatar', async ({ page }) => {
  await mockAgent(page, [{ content: '收到，这是一条测试回复。' }])
  await page.goto('/?onboarding=0')
  await page.getByTestId('cmd-input').fill('这是用户消息')
  await page.getByTestId('cmd-input').press('Enter')
  const assistant = page.getByTestId('assistant')
  await expect(assistant).toContainText('这是一条测试回复')
  const geo = await page.evaluate(() => {
    const panel = document.querySelector('.assistant-list').getBoundingClientRect()
    const userMsg = [...document.querySelectorAll('.coach-msg-user')].at(-1)
    const aiMsg = [...document.querySelectorAll('.coach-msg-assistant')].at(-1)
    const u = userMsg.querySelector('.coach-bubble').getBoundingClientRect()
    const a = aiMsg.querySelector('.coach-bubble').getBoundingClientRect()
    return {
      userGapRight: panel.right - u.right,
      userGapLeft: u.left - panel.left,
      aiGapLeft: a.left - panel.left,
      aiHasAvatar: Boolean(aiMsg.querySelector('.assistant-avatar')),
      avatarBesideBubble:
        Math.abs(
          aiMsg.querySelector('.assistant-avatar').getBoundingClientRect().top -
            a.top,
        ) < 20,
    }
  })
  // user bubble hugs the RIGHT edge, assistant hugs the left with an inline avatar
  expect(geo.userGapRight).toBeLessThan(16)
  expect(geo.userGapLeft).toBeGreaterThan(60)
  expect(geo.aiGapLeft).toBeLessThan(60)
  expect(geo.aiHasAvatar).toBe(true)
  expect(geo.avatarBesideBubble).toBe(true)
})

test('rename is inline in the docs menu — no native prompt', async ({ page }) => {
  await page.goto('/?onboarding=0')
  await page.getByTestId('doc-switcher').click()
  await page.getByRole('button', { name: '重命名' }).click()
  const input = page.getByTestId('rename-input')
  await expect(input).toBeFocused()
  await input.fill('投递字节的简历')
  await input.press('Enter')
  await expect(page.getByTestId('doc-switcher')).toContainText('投递字节的简历')
  // Escape cancels without renaming
  await page.getByRole('button', { name: '重命名' }).click()
  await page.getByTestId('rename-input').fill('不要这个名字')
  await page.getByTestId('rename-input').press('Escape')
  await expect(page.getByTestId('doc-switcher')).toContainText('投递字节的简历')
})

test('delete and clear use the in-app confirm dialog', async ({ page }) => {
  await page.goto('/?onboarding=0')
  // delete flow: cancel keeps the doc
  await page.getByTestId('doc-switcher').click()
  await page.getByRole('button', { name: '删除' }).click()
  const dialog = page.getByTestId('app-dialog')
  await expect(dialog).toContainText('删除这份简历')
  await page.getByTestId('dialog-cancel').click()
  await expect(page.getByTestId('doc-switcher')).toContainText('我的简历')
  // clear flow: confirm empties the canvas
  await page.getByTestId('more-btn').click()
  await page.getByRole('button', { name: '清空内容' }).click()
  await expect(page.getByTestId('app-dialog')).toContainText('清空')
  await page.getByTestId('dialog-ok').click()
  await expect(page.locator('.page')).not.toContainText('陈嘉禾')
})

test('stage full loop: JD entry → question → answer → receipt → resume grows → summary', async ({ page }) => {
  await mockAgent(page, [
    { content: '你在云徙做的最有分量的一件事是什么？' },
    { content: '', tool_calls: [
      toolCall('upsert_story', {
        title: '重构线索-商机流程', action: '重构了 CRM 线索到商机的核心流程',
        metrics: ['转化率 +27%'], asked: '最有分量的一件事？', quote: '重构了线索流程，转化率提升了 27%',
      }, 'c1'),
      toolCall('update_resume_content', { summary: '重构线索流程，核心转化率提升 27%。' }, 'c2'),
    ] },
    { content: '记下了：转化率 +27%。这个重构影响了多少企业客户？' },
  ])
  await page.goto('/?onboarding=0')
  await page.getByTestId('stage-btn').click()
  const stage = page.getByTestId('stage')
  // fresh user, no vault, no JD → entry phase
  await page.getByTestId('stage-jd').fill('招聘高级产品经理，要求 CRM 经验与数据驱动')
  await page.getByTestId('stage-start').click()
  // Q1 arrives
  await expect(page.getByTestId('stage-question')).toContainText('最有分量')
  // answer by typing (voice path shares the same input)
  await page.getByTestId('stage-input').fill('我重构了线索流程，转化率提升 27%')
  await page.getByTestId('stage-input').press('Enter')
  // receipt + next question + mined counter + thumbnail grew
  await expect(stage.locator('.stage-receipt')).toContainText('重构线索-商机流程')
  await expect(page.getByTestId('stage-question')).toContainText('多少企业客户')
  await expect(page.getByTestId('stage-mined')).toContainText('+1 个故事')
  await expect(stage.locator('.stage-thumb')).toContainText('转化率提升 27%')
  // finish → 成果单
  await page.getByTestId('stage-finish').click()
  const summary = page.getByTestId('stage-summary')
  await expect(summary).toContainText('本次挖掘成果')
  await expect(summary.locator('.stage-summary-stats')).toContainText('1')
  await page.getByTestId('stage-to-workbench').click()
  // workbench: resume updated, vault has the story, jd saved
  await expect(page.locator('.preview .page')).toContainText('转化率提升 27%')
  await expect(page.getByTestId('vault-btn')).toContainText('1')
  await expect(page.getByTestId('jd-btn')).toContainText('目标岗位')
  // persistence: reload keeps the vault
  await page.reload()
  await expect(page.getByTestId('vault-btn')).toContainText('1')
})

test('cross-session memory: the interviewer never re-asks answered questions', async ({ page }) => {
  const captured = []
  let call = 0
  await page.route('**/api/ai/**', route => {
    captured.push(JSON.parse(route.request().postData()))
    call += 1
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ choices: [{ message: { content: `问题 ${call}` } }] }),
    })
  })
  // seed a v3 state whose story already has an asked/refused history
  await page.addInitScript(() => {
    const doc = {
      id: 'd1', name: 'R', template: 'modern', accent: '#2563eb',
      typography: { font: 'default', size: 'm', density: 'normal' },
      page: { size: 'a4', margin: 'normal', fitScale: 1 },
      coverLetter: { enabled: false, content: '' },
      resume: {
        basics: { name: 'U', title: '', email: '', phone: '', location: '', website: '', github: '', photo: '', summary: '' },
        experience: [], projects: [], education: [], skills: [], customSections: [],
        sectionOrder: ['summary', 'experience', 'projects', 'education', 'skills'], hiddenSections: [],
      },
    }
    const story = {
      id: 'st1', title: '重构线索流程',
      star: { s: '', t: '', a: '重构了核心流程做了很多事情', r: '' },
      metrics: [], skills: [], source: 'interview', sources: [],
      askedFollowups: ['当时团队有多少人？'], refusals: ['薪资范围是多少？'],
    }
    localStorage.setItem('resume-studio-v2', JSON.stringify({
      version: 3, lang: 'zh', activeId: 'd1', resumes: [doc], vault: { stories: [story] },
    }))
  })
  await page.goto('/?onboarding=0')
  await page.getByTestId('stage-btn').click()
  // vault non-empty → straight to live phase; kickoff request fires
  await expect(page.getByTestId('stage-question')).toContainText('问题 1')
  // the system context must carry the asked/refused lists for the target story
  const system = captured[0].messages.find(m => m.role === 'system').content
  expect(system).toContain('当时团队有多少人？')
  expect(system).toContain('薪资范围是多少？')
  expect(system).toContain('不要重复')
})

test('stage entry: language toggle and paste-resume path', async ({ page }) => {
  await mockAgent(page, [
    // call 1: parseResumeText (non-stream chat) returns structured resume JSON
    { content: JSON.stringify({
        basics: { name: '王五', title: '数据分析师', email: '', phone: '', location: '', summary: '' },
        experience: [{ company: '数元科技', role: '数据分析师', start: '2021.03', end: '', location: '', highlights: '搭建经营看板\n负责 AB 实验' }],
        projects: [], education: [], skills: [{ name: 'SQL', detail: '' }],
      }) },
    // call 2: interview kickoff question
    { content: '你在数元科技搭的经营看板，服务多少个业务方？' },
  ])
  await page.goto('/?onboarding=0')
  await page.getByTestId('stage-btn').click()
  // language selection lives on the entry screen
  const langSeg = page.getByTestId('stage-lang')
  await expect(langSeg).toBeVisible()
  await langSeg.getByRole('button', { name: 'English' }).click()
  await expect(page.getByTestId('stage')).toContainText('Paste a JD')
  await langSeg.getByRole('button', { name: '中文' }).click()
  // paste-resume path
  await page.getByTestId('stage-paste-link').click()
  await page.getByTestId('stage-paste').fill('王五 数据分析师\n数元科技 2021.03-至今 搭建经营看板、负责 AB 实验\n技能：SQL')
  await page.getByTestId('stage-parse').click()
  // parsed resume landed on the canvas thumbnail + vault seeded, interview starts
  await expect(page.getByTestId('stage-question')).toContainText('经营看板', { timeout: 10_000 })
  await page.getByTestId('stage-exit').click()
  await expect(page.locator('.preview .page')).toContainText('数元科技')
  await expect(page.getByTestId('vault-btn')).toContainText('1')
})

test('interview session is continuous across close and reload', async ({ page }) => {
  let calls = 0
  await page.route('**/api/ai/**', route => {
    calls += 1
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ choices: [{ message: { content: `问题 ${calls}` } }] }),
    })
  })
  await page.goto('/?onboarding=0')
  await page.getByTestId('stage-btn').click()
  await page.getByTestId('stage-start').click() // no JD, start talking
  await expect(page.getByTestId('stage-question')).toContainText('问题 1')
  await page.getByTestId('stage-input').fill('我做过一个后台系统')
  await page.getByTestId('stage-input').press('Enter')
  await expect(page.getByTestId('stage-question')).toContainText('问题 2')
  const before = calls
  // close the stage, reload the app, reopen: conversation resumes in place
  await page.getByTestId('stage-exit').click()
  await page.reload()
  await page.getByTestId('stage-btn').click()
  await expect(page.getByTestId('stage-question')).toContainText('问题 2')
  expect(calls).toBe(before) // restored, not re-asked
})
