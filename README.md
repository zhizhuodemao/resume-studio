# 简历工坊 · Resume Studio

一个美观、开箱即用的在线简历制作工具。左侧编辑、右侧 A4 实时预览，一键导出 PDF。

## 功能

**模板与排版**

- 8 套简历模板（现代 / 经典 / 双栏·深 / 双栏·浅 / 时间线 / 校招 / 极简 / 创意），随时切换互不影响内容
- 排版体系：字体五档（跟随模板 / 黑 / 宋 / 楷 / 仿宋）、字号、密度、A4/Letter 纸张、页边距三档、一键压缩到一页
- 主题色 6 预设 + 自定义取色器，全模板联动

**编辑器**

- 多份简历管理（新建 / 复制 / 重命名 / 删除 / 切换），一人多版本投递
- 撤销 / 重做（Ctrl+Z，AI 修改同样可撤销）；数据 schema 版本化 + 自动迁移
- 自定义板块（证书 / 语言 / 获奖 / 志愿 / 自定义）、富文本（加粗 / 斜体 / 链接）、拖拽排序
- 照片上传 + 编辑（拖动定位 / 缩放裁剪）；示例内容库（5 职业族 × 社招/校招 × 双语）+ 新用户引导
- 预览点击可跳转对应编辑区；移动端有编辑 / 预览切换

**AI-first 交互（DeepSeek，全部带防编造约束）**

- **统一 AI 助手**（左侧对话流，⌘K 聚焦）：自然语言驱动一切——改内容、换模板、调排版、翻译、调板块，function calling 直接执行；每轮修改有变更芯片 + 单轮撤销
- **教练模式**：像面试官一样追问量化细节，把你的回答实时写进简历
- **JD 工作流**：引导页或对话中粘贴 JD → 自动匹配分析 → 确认后生成岗位定制版副本（原件不动）
- 常驻简历体检评分（规则版，零 AI 成本）置顶对话流
- 单点能力仍在：润色 / 生成要点 / 自动简介 / 求职信初稿 / 整份互译
- 表单编辑器降级为「精修」面板：点击画布任意板块直达对应编辑卡片

**导出**

- PDF（浏览器打印管线：矢量文字、链接可点击、多页不断行、侧栏背景跨页延续、文件名跟随简历名）
- Word（.docx）、纯文本（TXT）、JSON 备份导入导出
- 求职信附加页（含 AI 初稿，随 PDF 一起导出）

**账号与云端**

- 邮箱注册 / 登录（scrypt 哈希 + JWT），简历随账号自动同步云端；换设备登录即恢复
- AI 按账户计量（今日 / 累计 tokens、调用次数，账户菜单可见），支持免费额度上限，为收费做好数据基础
- 未登录仍可完整使用编辑 / 模板 / 导出（local-first 不变），AI 功能需登录

**质量**

- 49 个单元测试（含后端集成）+ 27 个 Playwright 端到端测试（含全栈云同步往返），GitHub Actions CI，模板渲染错误边界

## 使用

```bash
npm install
npm run dev        # 开发：http://localhost:5173
npm run build      # 构建：产物在 dist/
npm test           # 单元测试（vitest）
npm run test:e2e   # 端到端测试（Playwright，本地使用已安装的 Chrome）
```

### 后端与部署

自带薄后端（`server/`，Express + Node 内置 SQLite，需 Node ≥ 23.4）承担三件事：**账号登录**（scrypt + JWT）、**云端存档**（简历随账号绑定，登录后自动同步）、**AI 计量代理**（登录后才可用 AI；逐次记录 prompt/completion tokens，供后期计费；可用 `AI_TOKEN_LIMIT` 环境变量设置免费额度上限）。

```bash
npm run server     # 后端：http://localhost:8787（开发时与 npm run dev 并行开两个终端）
```

生产部署为单进程：`npm run build` 后 `node server/index.js` 同时服务静态页面与 API，可部署到任意 Node 托管（VPS / Railway / Fly / Render）。环境变量：`DEEPSEEK_API_KEY`（AI）、`JWT_SECRET`（必改）、`AI_TOKEN_LIMIT`（可选免费额度）、`PORT`。数据落在 `server/.data/app.db`（SQLite 单文件，备份即拷贝）。

### AI 功能配置（可选）

在项目根目录创建 `.env`（已被 .gitignore 排除，不会提交）：

```
DEEPSEEK_API_KEY=sk-xxxx
```

key 由后端读取（浏览器端不可见），前端一律走 `/api/ai/*` 由后端转发计量 —— key 永远不能出现在前端代码或构建产物中。

### 导出 PDF

点击右上角「导出 PDF」→ 在打印对话框中选择「另存为 PDF」。推荐使用 Chrome / Edge。

### URL 参数

支持覆盖初始视图：

```
?template=modern|classic|sidebar|duotone|timeline|campus|minimal|bold
&lang=zh|en  &accent=%232563eb
&font=default|sans|serif  &size=s|m|l  &density=compact|normal|relaxed
&menu=template|typo|sample   （打开对应面板）
&track=tech|product|design|operations|business  &stage=social|campus  （首次访问载入对应示例）
&onboarding=1|0   （强制显示 / 隐藏新用户引导）
```

## 技术栈

React 18 + Vite，无其他运行时依赖；样式为手写 CSS（无 UI 框架）。

## 目录结构

```
src/
  App.jsx               应用状态（模板/语言/主题色/简历数据）与自动保存
  i18n.js               中英文案
  sampleData.js         数据模型（空简历、板块顺序、id 生成）
  samples/              示例内容库：builder.js 构建器 + index.js 注册表 + 每职业族一个数据文件
                        （含推荐模板、校招板块顺序、按职业族联动的输入占位提示）
  components/
    Toolbar.jsx         模板切换、主题色、语言、导出
    Editor.jsx          左侧编辑面板
    Preview.jsx         A4 等比缩放预览
    Icon.jsx            内联 SVG 图标
  templates/
    Resume.jsx          模板调度 + 排版参数（字体/字号/密度）挂载
    shared.jsx          模板公共逻辑（联系方式、要点列表、空板块过滤）
    ClassicTemplate.jsx / ModernTemplate.jsx / SidebarTemplate.jsx / MinimalTemplate.jsx
    CampusTemplate.jsx / TimelineTemplate.jsx / DuotoneTemplate.jsx / BoldTemplate.jsx
  styles/
    app.css             应用界面样式
    templates.css       四套模板的排版样式
    print.css           打印（PDF 导出）样式
```
