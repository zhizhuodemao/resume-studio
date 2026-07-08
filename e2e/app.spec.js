import { test, expect } from '@playwright/test'

const openRefine = page => page.getByTestId('refine-btn').click()

// Each test gets a fresh browser context (clean localStorage).
// `?onboarding=0` skips the first-run dialog and loads the default tech sample.

test('onboarding: pick a track and start with a tailored sample', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('先认识一下你')).toBeVisible()
  await page.getByRole('button', { name: '产品', exact: true }).click()
  await page.getByRole('button', { name: '开始制作' }).click()
  await expect(page.getByText('先认识一下你')).toBeHidden()
  // Product sample loaded with its recommended template (timeline)
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
  await page.getByTestId('doc-switcher').click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出 JSON' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toContain('.resume.json')

  // Import a minimal bare-resume JSON as a new document
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

test('assistant health card: hidden when perfect, findings when not', async ({ page }) => {
  await page.goto('/?onboarding=0')
  const assistant = page.getByTestId('assistant')
  // perfect sample resume → no nagging score card at all
  await expect(assistant.locator('.assistant-health')).toHaveCount(0)
  // blank doc → the card appears with must-fix findings
  await page.getByTestId('doc-switcher').click()
  await page.getByRole('button', { name: '新建空白' }).click()
  await expect(assistant.locator('.assistant-health-text')).toContainText('优化建议')
  await assistant.locator('.assistant-health').click()
  await expect(assistant.locator('.assistant-findings')).toContainText('缺少姓名')
})

test('assistant coaches: interview turn writes into the resume', async ({ page }) => {
  await page.route('**/api/ai/**', route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        choices: [{ message: {
          content: '很棒！我把这段成果写进了你的简历。下一个问题：这个项目服务了多少用户？',
          tool_calls: [
            { id: '1', type: 'function', function: { name: 'update_resume_content', arguments: JSON.stringify({ summary: '教练更新后的专业简介，突出量化成果。' }) } },
          ],
        } }],
      }),
    }),
  )
  await page.goto('/?onboarding=0')
  const assistant = page.getByTestId('assistant')
  await page.getByTestId('cmd-input').fill('我把转化率提升了 30%')
  await page.getByTestId('cmd-input').press('Enter')
  await expect(assistant).toContainText('下一个问题')
  await expect(assistant).toContainText('内容已更新')
  await expect(page.locator('.preview .page')).toContainText('教练更新后的专业简介')
  // per-turn undo reverts the change
  await assistant.getByRole('button', { name: '撤销此次修改' }).click()
  await expect(page.locator('.preview .page')).not.toContainText('教练更新后的专业简介')
  await expect(assistant).toContainText('已撤销')
})

test('JD tailoring via assistant tool creates and opens a tailored copy', async ({ page }) => {
  let call = 0
  await page.route('**/api/ai/**', route => {
    call += 1
    if (call === 1) {
      // assistant turn: user confirms → tool call
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          choices: [{ message: {
            content: '好的，正在为这个职位生成定制版…',
            tool_calls: [
              { id: '1', type: 'function', function: { name: 'create_tailored_version', arguments: JSON.stringify({ jd: '高级前端，要求 React 与 K8s' }) } },
            ],
          } }],
        }),
      })
    } else {
      // tailorResume call
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          choices: [{ message: { content: JSON.stringify({
            basics: { name: '陈嘉禾', title: '高级前端工程师', location: '上海', summary: '为该职位定制的简介' },
            experience: [], projects: [], education: [], skills: [],
          }) } }],
        }),
      })
    }
  })
  await page.goto('/?onboarding=0')
  await page.getByTestId('cmd-input').fill('帮我生成这个 JD 的定制版：高级前端，要求 React 与 K8s')
  await page.getByTestId('cmd-input').press('Enter')
  await expect(page.getByTestId('doc-switcher')).toContainText('定制版', { timeout: 10_000 })
  await expect(page.locator('.preview .page')).toContainText('为该职位定制的简介')
  // original doc unchanged
  await page.getByTestId('doc-switcher').click()
  await page.locator('.docs-item', { hasText: /^我的简历/ }).first().click()
  await expect(page.locator('.preview .page')).not.toContainText('为该职位定制的简介')
})

test('Word and TXT export download files', async ({ page }) => {
  await page.goto('/?onboarding=0')
  await page.getByTestId('doc-switcher').click()
  const d1 = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出 Word' }).click()
  expect((await d1).suggestedFilename()).toContain('.docx')
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
  // overflow menu keeps sample/clear/language
  await page.getByTestId('more-btn').click()
  await expect(page.getByRole('button', { name: '载入示例' })).toBeVisible()
  await expect(page.getByRole('button', { name: '清空内容' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'EN' })).toBeVisible()
})
test('assistant executes tool calls and supports per-turn undo', async ({ page }) => {
  await page.route('**/api/ai/**', route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        choices: [{ message: {
          content: '好的，已切换到时间线模板并更新了简介。',
          tool_calls: [
            { id: '1', type: 'function', function: { name: 'set_template', arguments: '{"template":"timeline"}' } },
            { id: '2', type: 'function', function: { name: 'update_resume_content', arguments: JSON.stringify({ summary: '助手更新的简介' }) } },
          ],
        } }],
      }),
    }),
  )
  await page.goto('/?onboarding=0')
  const input = page.getByTestId('cmd-input')
  await input.fill('换成时间线模板，简介重写一下')
  await input.press('Enter')
  await expect(page.locator('.preview .resume.tpl-timeline')).toHaveCount(1)
  await expect(page.locator('.preview .page')).toContainText('助手更新的简介')
  const assistant = page.getByTestId('assistant')
  await expect(assistant).toContainText('时间线')
  await assistant.getByRole('button', { name: '撤销此次修改' }).click()
  await expect(page.locator('.preview .resume.tpl-modern')).toHaveCount(1)
  await expect(page.locator('.preview .page')).not.toContainText('助手更新的简介')
})

test('JD pasted in onboarding triggers an automatic assistant analysis', async ({ page }) => {
  await page.route('**/api/ai/**', route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        choices: [{ message: {
          content: '匹配度不错：你的 React 经验是加分项；差距是缺少 K8s。需要我生成定制版吗？',
          tool_calls: [],
        } }],
      }),
    }),
  )
  await page.goto('/')
  await page.getByRole('button', { name: '产品', exact: true }).click()
  await page.locator('.onboard-jd').fill('招聘高级产品经理，要求 B 端 SaaS 经验')
  await page.getByRole('button', { name: '开始制作' }).click()
  const assistant = page.getByTestId('assistant')
  // the pasted JD becomes the first user message automatically
  await expect(assistant).toContainText('这是我目标职位的 JD')
  await expect(assistant).toContainText('需要我生成定制版吗')
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
  await page.route('**/api/ai/**', route =>
    route.fulfill({ contentType: 'text/event-stream', body: sse }),
  )
  await page.goto('/?onboarding=0')
  const input = page.getByTestId('cmd-input')
  await input.fill('换成创意模板')
  await input.press('Enter')
  const assistant = page.getByTestId('assistant')
  await expect(assistant).toContainText('正在为你切换模板…')
  // fragmented tool_call reassembled and executed
  await expect(page.locator('.preview .resume.tpl-bold')).toHaveCount(1)
  await expect(assistant).toContainText('创意')
})

test('account: register, cloud sync roundtrip after wiping local data', async ({ page }) => {
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.dev`
  page.on('dialog', d => d.accept())

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

  // wipe local storage entirely (token + resume data) and reload
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await expect(page.getByTestId('account-btn')).toBeVisible() // logged out
  await expect(page.locator('.page')).not.toContainText('云端同步用户')

  // log back in — dialog auto-accepted → cloud state restored
  await page.getByTestId('account-btn').click()
  await page.getByTestId('account-email').fill(email)
  await page.getByTestId('account-password').fill('secret123')
  await page.getByTestId('account-submit').click()
  await expect(page.locator('.page')).toContainText('云端同步用户', { timeout: 10_000 })
  await expect(page.getByTestId('account-menu-btn')).toBeVisible()
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
  await page.route('**/api/ai/chat/**', route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        choices: [{ message: {
          content: '已更新。',
          tool_calls: [
            { id: '1', type: 'function', function: { name: 'update_resume_content', arguments: JSON.stringify({ summary: '游客体验的新简介' }) } },
          ],
        } }],
      }),
    }),
  )
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

test('agent guardrail: narrated edit without tools triggers a forced action retry', async ({ page }) => {
  let call = 0
  await page.route('**/api/ai/**', route => {
    call += 1
    const msg =
      call === 1
        ? { content: '好的，个人简介已更新为更有冲击力的版本。', tool_calls: [] }
        : {
            content: '已通过工具完成修改。',
            tool_calls: [
              { id: '1', type: 'function', function: { name: 'update_resume_content', arguments: JSON.stringify({ summary: '守护机制写入的简介' }) } },
            ],
          }
    route.fulfill({ contentType: 'application/json', body: JSON.stringify({ choices: [{ message: msg }] }) })
  })
  await page.goto('/?onboarding=0')
  await page.getByTestId('cmd-input').fill('帮我修改个人简介')
  await page.getByTestId('cmd-input').press('Enter')
  // the retry actually executed the tool
  await expect(page.locator('.preview .page')).toContainText('守护机制写入的简介')
  expect(call).toBe(2)
  await expect(page.getByTestId('assistant')).toContainText('内容已更新')
})
