import { makeResume, CAMPUS_SECTION_ORDER } from './builder.js'

const social = {
  zh: () =>
    makeResume({
      basics: {
        name: '陈嘉禾',
        title: '高级前端工程师',
        email: 'jiahe.chen@example.com',
        phone: '138-0000-8888',
        location: '上海',
        website: 'jiahechen.dev',
        github: 'github.com/jiahechen',
        summary:
          '6 年大型 Web 应用开发经验，深耕 React 技术栈、设计系统与前端性能优化。曾带领 5 人小组重构日活 200 万的核心产品，首屏时间降低 58%。热衷工程效率建设，主导的组件库被 6 条产品线采用。',
      },
      experience: [
        {
          company: '新光科技',
          role: '高级前端工程师',
          start: '2022.03',
          end: '',
          location: '上海',
          highlights:
            '主导核心 SaaS 控制台重构（React 18 + Vite），首屏时间从 3.2s 降至 1.3s\n设计并落地公司级设计系统（45+ 组件），被 6 条产品线采用，UI 开发效率提升 40%\n搭建覆盖报错、性能、行为的前端监控平台，线上问题响应时间缩短至 10 分钟内\n指导 4 名初级工程师，其中 2 人一年内晋升',
        },
        {
          company: '字浪网络',
          role: '前端工程师',
          start: '2019.07',
          end: '2022.02',
          location: '杭州',
          highlights:
            '开发服务 80 万用户的实时协同编辑器，实现基于 OT 的冲突合并算法\n推动 30 万行代码库由 JavaScript 平滑迁移至 TypeScript，线上零回归\n通过代码分割与依赖治理，构建产物体积减小 45%',
        },
      ],
      projects: [
        {
          name: 'OpenCharts 开源图表库',
          role: '作者 / 维护者',
          link: 'github.com/jiahechen/opencharts',
          description:
            '基于 Canvas 的开源图表库，GitHub 4.2K Star\n支持 20+ 图表类型，可摇树架构，核心包 gzip 后小于 18KB\n30+ 公司在生产环境中使用',
        },
      ],
      education: [
        {
          school: '浙江大学',
          degree: '工学学士',
          major: '计算机科学与技术',
          start: '2015.09',
          end: '2019.06',
          description: 'GPA 3.8/4.0 · 国家奖学金（2017）· ACM-ICPC 区域赛银牌',
        },
      ],
      skills: [
        { name: 'React / TypeScript', level: 5, detail: 'React 18、Next.js、Zustand、设计系统' },
        { name: '工程化', level: 4, detail: 'Vite、CI/CD、monorepo、测试体系' },
        { name: '性能优化', level: 4, detail: 'Core Web Vitals、渲染优化、性能分析' },
        { name: 'Node.js', level: 3, detail: 'BFF 服务、CLI 工具开发' },
      ],
    }),
  en: () =>
    makeResume({
      basics: {
        name: 'Alex Chen',
        title: 'Senior Frontend Engineer',
        email: 'alex.chen@example.com',
        phone: '+86 138-0000-8888',
        location: 'Shanghai, China',
        website: 'alexchen.dev',
        github: 'github.com/alexchen',
        summary:
          'Frontend engineer with 6 years of experience building large-scale web applications. Specialized in React ecosystems, design systems and web performance. Led a 5-person team to rebuild a core product serving 2M+ daily active users, cutting first-paint time by 58%.',
      },
      experience: [
        {
          company: 'Nova Technology',
          role: 'Senior Frontend Engineer',
          start: '2022.03',
          end: '',
          location: 'Shanghai',
          highlights:
            'Led the rebuild of the core SaaS dashboard with React 18 and Vite; first-paint time dropped from 3.2s to 1.3s\nDesigned the company-wide design system (45+ components), adopted by 6 product lines and cutting UI development time by 40%\nBuilt a frontend observability platform covering errors, performance and user behavior, reducing online incident response time to under 10 minutes\nMentored 4 junior engineers; two were promoted within a year',
        },
        {
          company: 'Bytewave Inc.',
          role: 'Frontend Engineer',
          start: '2019.07',
          end: '2022.02',
          location: 'Hangzhou',
          highlights:
            'Developed the real-time collaborative editor used by 800K users, implementing OT-based conflict resolution\nDrove the migration from JavaScript to TypeScript across a 300K-line codebase with zero production regressions\nOptimized bundle size by 45% through code splitting and dependency governance',
        },
      ],
      projects: [
        {
          name: 'OpenCharts',
          role: 'Author & Maintainer',
          link: 'github.com/alexchen/opencharts',
          description:
            'An open-source charting library based on Canvas with 4.2K GitHub stars\nSupports 20+ chart types, tree-shakable architecture, gzipped core under 18KB\nUsed in production by 30+ companies',
        },
      ],
      education: [
        {
          school: 'Zhejiang University',
          degree: 'B.Eng. in Computer Science',
          major: 'Computer Science and Technology',
          start: '2015.09',
          end: '2019.06',
          description: 'GPA 3.8/4.0 · National Scholarship (2017) · ACM-ICPC Regional Silver Medal',
        },
      ],
      skills: [
        { name: 'React / TypeScript', level: 5, detail: 'React 18, Next.js, Zustand, design systems' },
        { name: 'Engineering', level: 4, detail: 'Vite, CI/CD, monorepo, testing strategy' },
        { name: 'Performance', level: 4, detail: 'Core Web Vitals, rendering optimization, profiling' },
        { name: 'Node.js', level: 3, detail: 'BFF services, CLI tooling' },
      ],
    }),
}

const campus = {
  zh: () =>
    makeResume({
      sectionOrder: CAMPUS_SECTION_ORDER,
      basics: {
        name: '林晓阳',
        title: '前端开发工程师（2025 届）',
        email: 'xiaoyang.lin@example.com',
        phone: '150-0000-6666',
        location: '武汉 / 可到岗一线城市',
        github: 'github.com/xylin',
        summary:
          '2025 届计算机本科，两段大厂前端实习经历。实习期间独立交付 3 个中台页面并沉淀 12 个通用组件；校内主导开发的校园二手交易小程序服务 8000+ 用户。基础扎实，LeetCode 刷题 400+。',
      },
      education: [
        {
          school: '华中科技大学',
          degree: '工学学士',
          major: '计算机科学与技术',
          start: '2021.09',
          end: '2025.06',
          description: 'GPA 3.7/4.0（专业前 10%）· 国家奖学金 · 蓝桥杯省一等奖 · 主修数据结构、操作系统、计算机网络',
        },
      ],
      experience: [
        {
          company: '字节跳动',
          role: '前端开发实习生',
          start: '2024.06',
          end: '2024.09',
          location: '北京',
          highlights:
            '参与创作者平台开发，独立完成 3 个中台页面的开发与联调，按期上线零事故\n优化数据列表页渲染性能，首屏耗时降低 30%\n沉淀 12 个通用表单组件并编写文档，被组内 3 个项目复用',
        },
        {
          company: '校计算机协会',
          role: '技术部部长',
          start: '2022.09',
          end: '2023.06',
          location: '武汉',
          highlights:
            '组织前端技术分享 12 场，累计参与 600+ 人次\n带领 5 人团队维护协会官网与活动报名系统，服务全校 20+ 场活动',
        },
      ],
      projects: [
        {
          name: '校园二手交易小程序「淘二手」',
          role: '发起人 / 前端负责人',
          link: 'github.com/xylin/taoershou',
          description:
            '微信小程序 + Node.js + MySQL，覆盖本校及周边 2 所高校\n注册用户 8000+，日活峰值 1200，累计撮合交易 3000+ 笔\n设计基于信用分的交易保障机制，纠纷率低于 0.5%',
        },
      ],
      skills: [
        { name: 'JavaScript / TypeScript', level: 4, detail: 'ES6+、TypeScript 日常使用' },
        { name: 'React / 小程序', level: 4, detail: 'React Hooks、微信小程序原生开发' },
        { name: '计算机基础', level: 4, detail: '数据结构与算法、网络、操作系统，LeetCode 400+' },
        { name: '工程工具', level: 3, detail: 'Git、Vite、基础 CI/CD' },
      ],
    }),
  en: () =>
    makeResume({
      sectionOrder: CAMPUS_SECTION_ORDER,
      basics: {
        name: 'Ryan Lin',
        title: 'Frontend Engineer (New Grad, 2025)',
        email: 'ryan.lin@example.com',
        phone: '+86 150-0000-6666',
        location: 'Wuhan / Open to relocation',
        github: 'github.com/ryanlin',
        summary:
          'CS senior (class of 2025) with two frontend internships at major tech companies. Shipped 3 internal pages independently and contributed 12 reusable components during internships; built a campus marketplace mini-program serving 8,000+ users. Solid CS fundamentals with 400+ LeetCode problems solved.',
      },
      education: [
        {
          school: 'Huazhong University of Science and Technology',
          degree: 'B.Eng. in Computer Science',
          major: 'Computer Science and Technology',
          start: '2021.09',
          end: '2025.06',
          description: 'GPA 3.7/4.0 (top 10%) · National Scholarship · Coursework: Data Structures, OS, Networks',
        },
      ],
      experience: [
        {
          company: 'ByteDance',
          role: 'Frontend Engineer Intern',
          start: '2024.06',
          end: '2024.09',
          location: 'Beijing',
          highlights:
            'Delivered 3 internal admin pages end-to-end on the creator platform, shipped on time with zero incidents\nReduced first-screen render time of a data-heavy list page by 30%\nBuilt 12 reusable form components with docs, adopted by 3 team projects',
        },
        {
          company: 'University Computer Society',
          role: 'Head of Tech Department',
          start: '2022.09',
          end: '2023.06',
          location: 'Wuhan',
          highlights:
            'Organized 12 frontend tech talks with 600+ total attendees\nLed a 5-person team maintaining the society website and event registration system used by 20+ campus events',
        },
      ],
      projects: [
        {
          name: 'Campus Marketplace Mini-Program',
          role: 'Founder / Frontend Lead',
          link: 'github.com/ryanlin/campus-market',
          description:
            'WeChat mini-program + Node.js + MySQL, covering 3 universities\n8,000+ registered users, 1,200 peak DAU, 3,000+ completed transactions\nDesigned a credit-score-based trade protection mechanism; dispute rate under 0.5%',
        },
      ],
      skills: [
        { name: 'JavaScript / TypeScript', level: 4, detail: 'ES6+, TypeScript in daily use' },
        { name: 'React / Mini-program', level: 4, detail: 'React Hooks, WeChat mini-program' },
        { name: 'CS Fundamentals', level: 4, detail: 'Algorithms, networks, OS; 400+ LeetCode' },
        { name: 'Tooling', level: 3, detail: 'Git, Vite, basic CI/CD' },
      ],
    }),
}

export default {
  stages: { social, campus },
  recommend: { social: 'modern', campus: 'campus' },
  placeholders: {
    zh: {
      summary: '例：X 年后端开发经验，深耕高并发服务与稳定性建设……结尾用 1-2 个量化成果背书',
      highlights: '每行一条，动词开头 + 量化结果，例：接口 P99 耗时降低 40%、支撑日活 100 万',
      projectDescription: '项目是什么 → 你的贡献 → 结果数据（Star 数 / 用户量 / 性能指标）',
      skillDetail: '写具体技术点，如：Spring Cloud、MySQL 调优、K8s',
    },
    en: {
      summary: 'e.g. Backend engineer with X years of experience in high-concurrency services… end with 1-2 quantified wins',
      highlights: 'One per line, verb-first with numbers, e.g. Cut P99 latency by 40%; served 1M DAU',
      projectDescription: 'What it is → your contribution → measurable results (stars / users / performance)',
      skillDetail: 'Be specific, e.g. Spring Cloud, MySQL tuning, K8s',
    },
  },
}
