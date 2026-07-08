import { makeResume } from './builder.js'

const social = {
  zh: () =>
    makeResume({
      basics: {
        name: '顾晚晴',
        title: '高级 UI/UX 设计师',
        email: 'wanqing.gu@example.com',
        phone: '137-0000-5577',
        location: '杭州',
        website: 'wanqing.design',
        summary:
          '6 年数字产品设计经验，覆盖移动端与 B 端，擅长从用户研究到视觉落地的全链路设计。主导的 App 改版将次日留存提升 5.2 个百分点；搭建的设计系统服务 5 条产品线。2023 站酷设计大赛银奖。',
      },
      experience: [
        {
          company: '声浪科技',
          role: '高级 UI/UX 设计师',
          start: '2021.08',
          end: '',
          location: '杭州',
          highlights:
            '主导音频社区 App 全链路改版：重梳信息架构并完成 60+ 页面重设计，次日留存提升 5.2pct\n从 0 搭建设计系统（120+ 组件、深浅双主题），设计-开发交付效率提升 50%\n建立每双周可用性测试机制，累计 40+ 场，推动 30+ 体验问题闭环\n指导 2 名初级设计师完成职级晋升',
        },
        {
          company: '橙屿网络',
          role: 'UI 设计师',
          start: '2018.07',
          end: '2021.07',
          location: '上海',
          highlights:
            '负责电商 App 大促会场视觉设计，双 11 主会场点击率提升 18%\n输出 3 套营销插画风格规范，覆盖全年 20+ 场活动\n与前端协作建立设计走查流程，视觉还原问题减少 60%',
        },
      ],
      projects: [
        {
          name: 'Waveform 播客 App 概念设计',
          role: '个人作品',
          link: 'dribbble.com/wanqing',
          description:
            'Dribbble 累计 12K 浏览，获 Best of Product Design 推荐\n完成从品牌、交互到动效的完整概念方案，含 30+ 高保真页面',
        },
      ],
      education: [
        {
          school: '中国美术学院',
          degree: '艺术学学士',
          major: '视觉传达设计',
          start: '2014.09',
          end: '2018.06',
          description: '毕业设计入选校优秀作品年展',
        },
      ],
      skills: [
        { name: 'Figma / Sketch', level: 5, detail: '组件化设计、Auto Layout、插件开发' },
        { name: '交互设计', level: 4, detail: '信息架构、用户旅程、可用性测试' },
        { name: '视觉与动效', level: 4, detail: '插画、AE / Principle 动效' },
        { name: '设计系统', level: 4, detail: 'Design Token、多主题、组件规范' },
      ],
    }),
  en: () =>
    makeResume({
      basics: {
        name: 'Chloe Gu',
        title: 'Senior UI/UX Designer',
        email: 'chloe.gu@example.com',
        phone: '+86 137-0000-5577',
        location: 'Hangzhou, China',
        website: 'chloegu.design',
        summary:
          'Product designer with 6 years across mobile and B2B products, covering the full journey from user research to visual delivery. Led an app redesign that lifted next-day retention by 5.2pp; built a design system serving 5 product lines. Silver award, ZCOOL Design Awards 2023.',
      },
      experience: [
        {
          company: 'Soundwave Technology',
          role: 'Senior UI/UX Designer',
          start: '2021.08',
          end: '',
          location: 'Hangzhou',
          highlights:
            'Led the end-to-end redesign of an audio community app: restructured the IA and redesigned 60+ screens, lifting next-day retention by 5.2pp\nBuilt the design system from scratch (120+ components, light/dark themes), improving design-to-dev handoff efficiency by 50%\nEstablished biweekly usability testing (40+ sessions), closing the loop on 30+ UX issues\nMentored 2 junior designers through promotion',
        },
        {
          company: 'Orange Isle Networks',
          role: 'UI Designer',
          start: '2018.07',
          end: '2021.07',
          location: 'Shanghai',
          highlights:
            'Designed major e-commerce campaign pages; Singles-Day main venue CTR up 18%\nCreated 3 marketing illustration style guides covering 20+ campaigns a year\nSet up a design-QA process with frontend, cutting visual-fidelity issues by 60%',
        },
      ],
      projects: [
        {
          name: 'Waveform — Podcast App Concept',
          role: 'Personal Work',
          link: 'dribbble.com/chloegu',
          description:
            '12K views on Dribbble, featured in Best of Product Design\nComplete concept covering branding, interaction and motion, with 30+ hi-fi screens',
        },
      ],
      education: [
        {
          school: 'China Academy of Art',
          degree: 'B.A. in Design',
          major: 'Visual Communication Design',
          start: '2014.09',
          end: '2018.06',
          description: 'Graduation project selected for the academy annual exhibition',
        },
      ],
      skills: [
        { name: 'Figma / Sketch', level: 5, detail: 'Component-based design, Auto Layout, plugins' },
        { name: 'Interaction Design', level: 4, detail: 'IA, user journeys, usability testing' },
        { name: 'Visual & Motion', level: 4, detail: 'Illustration, AE / Principle' },
        { name: 'Design Systems', level: 4, detail: 'Design tokens, theming, component specs' },
      ],
    }),
}

export default {
  stages: { social },
  recommend: { social: 'bold' },
  placeholders: {
    zh: {
      summary: '例：X 年产品设计经验，擅长……记得附上作品集链接',
      highlights: '每行一条：改版 / 设计系统 / 效率类成果，尽量带数据（留存、点击率、交付效率）',
      projectDescription: '设计目标 → 方案亮点 → 结果（数据、获奖或收录）',
      skillDetail: '写具体工具与专长，如：Figma、AE 动效、设计系统',
    },
    en: {
      summary: 'e.g. Product designer with X years… always include your portfolio link',
      highlights: 'One per line: redesigns / design systems / efficiency wins, with numbers where possible',
      projectDescription: 'Design goal → key decisions → results (metrics, awards or features)',
      skillDetail: 'Be specific, e.g. Figma, AE motion, design systems',
    },
  },
}
