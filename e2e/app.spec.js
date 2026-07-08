import { test, expect } from '@playwright/test'

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
  const name = page.getByLabel('姓名')
  await name.fill('端到端测试员')
  await expect(page.locator('.page')).toContainText('端到端测试员')
})

test('switching template re-renders the preview', async ({ page }) => {
  await page.goto('/?onboarding=0')
  await page.getByRole('button', { name: /模板/ }).click()
  await page.getByRole('radio', { name: /极简/ }).click()
  await expect(page.locator('.page .resume.tpl-minimal')).toHaveCount(1)
})

test('undo restores a deleted experience entry', async ({ page }) => {
  await page.goto('/?onboarding=0')
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
  const summary = page.locator('.section-card', { hasText: '个人简介' }).locator('textarea')
  await summary.fill('拥有 **8 年** 大型项目经验')
  await expect(page.locator('.page strong').first()).toHaveText('8 年')
})

test('drag and drop reorders sections', async ({ page }) => {
  await page.goto('/?onboarding=0')
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
  await page.goto('/?onboarding=0&menu=typo')
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
  const summary = page.locator('.section-card', { hasText: '个人简介' }).locator('textarea')
  await summary.fill('很长的内容。'.repeat(120))
  await expect(page.locator('.page-hint')).toContainText('共 2 页')
  await page.getByRole('button', { name: '压缩到一页' }).click()
  await expect(page.locator('.page-hint')).toContainText('共 1 页')
  // undo fit restores
  await page.getByRole('button', { name: '取消压缩' }).click()
  await expect(page.locator('.page-hint')).toContainText('共 2 页')
})
