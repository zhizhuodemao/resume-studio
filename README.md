# 简历工坊 · Resume Studio

一个美观、开箱即用的在线简历制作工具。左侧编辑、右侧 A4 实时预览，一键导出 PDF。

## 功能

- **8 套简历模板**：现代（强调色块）、经典（衬线正统）、双栏·深（深色侧栏）、双栏·浅（浅色侧栏 + 衬线大名）、时间线（日期轨道）、校招（药丸标题，适合应届生）、极简（瑞士排版）、创意（整幅色带页头），随时切换互不影响内容
- **示例内容库**：5 个职业族（技术 / 产品 / 设计 / 运营市场 / 商科通用）× 社招/校招（技术、产品、商科含校招版）× 中英双语，共 8 套按优秀简历标准撰写的示例；载入时自动切换推荐模板，校招示例自动将教育经历前置
- **新用户引导**：首次打开先选择求职方向与阶段，直接从一份对口的示例简历开始；输入框占位提示随职业族联动（如运营提示写增长数据、设计提示附作品集）
- **排版调节**：字体（跟随模板 / 无衬线 / 衬线）、字号（小 / 标准 / 大）、密度（紧凑 / 标准 / 宽松），对所有模板生效
- **实时预览**：所见即所得，按 A4 尺寸等比缩放，虚线标出分页参考线
- **导出 PDF**：走浏览器打印管线（矢量文字、可选中、可点击链接），已预设 A4 零边距；多页时条目不会被拦腰截断，双栏模板的侧栏背景在每一页延续
- **中英双语**：界面与简历板块标题一键切换，内置中/英示例数据
- **主题色**：6 种预设 + 自定义取色器，所有模板联动
- **完整编辑能力**：板块排序 / 显隐，条目增删、上下移动、折叠，照片上传（自动压缩），技能熟练度
- **自动保存**：内容实时写入浏览器 localStorage，刷新不丢失

## 使用

```bash
npm install
npm run dev        # 开发：http://localhost:5173
npm run build      # 构建：产物在 dist/，纯静态文件可部署到任何静态托管
```

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
