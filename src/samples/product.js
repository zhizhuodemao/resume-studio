import { makeResume, CAMPUS_SECTION_ORDER } from './builder.js'

const social = {
  zh: () =>
    makeResume({
      basics: {
        name: '苏明远',
        title: '高级产品经理',
        email: 'mingyuan.su@example.com',
        phone: '139-0000-2233',
        location: '北京',
        website: 'mingyuan.notion.site',
        summary:
          '5 年 B 端 SaaS 产品经验，完整经历过 0→1 与规模化两个阶段，现负责服务 3000+ 企业客户的 CRM 产品线，年续费率 92%。擅长用数据驱动决策：主导的转化优化项目将核心流程转化率提升 27%。',
      },
      experience: [
        {
          company: '云徙科技',
          role: '高级产品经理',
          start: '2022.04',
          end: '',
          location: '北京',
          highlights:
            '负责 CRM 产品线规划与迭代，0→1 搭建营销自动化模块，上线 6 个月付费企业 400+，贡献产品线年营收 15%\n重构线索-商机核心流程，关键路径转化率提升 27%，客户 NPS 从 31 提升至 47\n建立需求分级与价值评估机制，需求平均交付周期缩短 35%\n协同销售与客户成功团队完成 20+ 场大客户共创，沉淀 3 个行业解决方案',
        },
        {
          company: '蓝湖网络',
          role: '产品经理',
          start: '2019.07',
          end: '2022.03',
          location: '北京',
          highlights:
            '负责协作文档产品增长方向，DAU 从 8 万增长至 25 万\n设计邀请协作裂变机制，K 因子达 0.6，贡献 40% 新增用户\n从 0 搭建 AB 实验流程与指标体系，覆盖 90% 功能迭代决策',
        },
      ],
      projects: [
        {
          name: '企业微信生态集成',
          role: '项目负责人',
          description:
            '主导产品与企业微信生态打通，接入应用市场并联合 5 家 ISV 共建\n上线后带来 20% 的新客线索，成为年度最重要获客渠道之一',
        },
      ],
      education: [
        {
          school: '上海交通大学',
          degree: '管理学学士',
          major: '工商管理',
          start: '2015.09',
          end: '2019.06',
          description: '校辩论队队长 · 优秀毕业生',
        },
      ],
      skills: [
        { name: '产品设计', level: 5, detail: 'PRD、Axure / Figma、B 端复杂流程设计' },
        { name: '数据分析', level: 4, detail: 'SQL、AB 实验设计、指标体系搭建' },
        { name: '项目管理', level: 4, detail: '敏捷开发、跨部门协作、大客户共创' },
        { name: '行业认知', level: 4, detail: 'SaaS / CRM / 营销科技' },
      ],
    }),
  en: () =>
    makeResume({
      basics: {
        name: 'Kevin Su',
        title: 'Senior Product Manager',
        email: 'kevin.su@example.com',
        phone: '+86 139-0000-2233',
        location: 'Beijing, China',
        website: 'kevinsu.notion.site',
        summary:
          'Product manager with 5 years in B2B SaaS, covering both 0-to-1 and scale-up stages. Currently own a CRM product line serving 3,000+ enterprise customers with a 92% annual renewal rate. Data-driven: led a funnel optimization program that lifted core-flow conversion by 27%.',
      },
      experience: [
        {
          company: 'Yunxi Technology',
          role: 'Senior Product Manager',
          start: '2022.04',
          end: '',
          location: 'Beijing',
          highlights:
            'Own roadmap and delivery of the CRM product line; built the marketing-automation module from 0 to 1, reaching 400+ paying companies in 6 months and 15% of line revenue\nRedesigned the lead-to-opportunity flow, lifting key-path conversion by 27% and NPS from 31 to 47\nIntroduced a demand-triage and value-scoring process, cutting average delivery cycle by 35%\nRan 20+ co-creation sessions with strategic accounts, producing 3 industry solutions',
        },
        {
          company: 'Lanhu Networks',
          role: 'Product Manager',
          start: '2019.07',
          end: '2022.03',
          location: 'Beijing',
          highlights:
            'Drove growth for a collaborative docs product; DAU grew from 80K to 250K\nDesigned an invite-to-collaborate loop with a K-factor of 0.6, contributing 40% of new users\nBuilt the A/B testing process and metrics framework from scratch, covering 90% of feature decisions',
        },
      ],
      projects: [
        {
          name: 'WeCom Ecosystem Integration',
          role: 'Project Lead',
          description:
            'Led integration with the WeCom ecosystem, launching on the app marketplace with 5 ISV partners\nGenerated 20% of new leads after launch — one of the top acquisition channels of the year',
        },
      ],
      education: [
        {
          school: 'Shanghai Jiao Tong University',
          degree: 'B.A. in Management',
          major: 'Business Administration',
          start: '2015.09',
          end: '2019.06',
          description: 'Captain of the university debate team · Outstanding Graduate',
        },
      ],
      skills: [
        { name: 'Product Design', level: 5, detail: 'PRD, Axure / Figma, complex B2B workflows' },
        { name: 'Data Analysis', level: 4, detail: 'SQL, A/B testing, metrics frameworks' },
        { name: 'Project Management', level: 4, detail: 'Agile, cross-functional leadership' },
        { name: 'Domain Knowledge', level: 4, detail: 'SaaS / CRM / MarTech' },
      ],
    }),
}

const campus = {
  zh: () =>
    makeResume({
      sectionOrder: CAMPUS_SECTION_ORDER,
      basics: {
        name: '周雨桐',
        title: '产品经理（2025 届）',
        email: 'yutong.zhou@example.com',
        phone: '151-0000-9900',
        location: '广州 / 可到岗一线城市',
        summary:
          '2025 届信息管理本科，腾讯、美团两段产品实习。实习期间独立负责的内容专题使 CTR 提升 12%；主导的校园产品项目获"互联网+"大赛省金奖并服务 3 所高校 2 万用户。逻辑清晰，擅长数据分析与用户访谈。',
      },
      education: [
        {
          school: '武汉大学',
          degree: '管理学学士',
          major: '信息管理与信息系统',
          start: '2021.09',
          end: '2025.06',
          description: 'GPA 3.8/4.0（专业前 5%）· 一等奖学金 ×2 · 主修数据分析、用户行为学、产品设计',
        },
      ],
      experience: [
        {
          company: '腾讯',
          role: '产品经理实习生（信息流方向）',
          start: '2024.06',
          end: '2024.09',
          location: '深圳',
          highlights:
            '独立负责信息流内容专题策划，上线 8 期，专题均值 CTR 较大盘提升 12%\n完成 20+ 份竞品分析与 15 组 AB 实验跟进，输出的排序策略建议被采纳上线\n参与需求评审 30+ 场，独立撰写 PRD 6 份',
        },
        {
          company: '美团',
          role: '产品运营实习生',
          start: '2023.12',
          end: '2024.03',
          location: '北京',
          highlights:
            '负责到店业务商家侧活动落地，触达商家 5000+，活动参与率提升 8pct\n搭建活动数据日报体系，将人工统计时间从 2 小时压缩到 10 分钟',
        },
      ],
      projects: [
        {
          name: '校园自习室预约平台「静座」',
          role: '产品负责人（5 人团队）',
          description:
            '"互联网+"大学生创新创业大赛省级金奖\n从 0 完成用户调研（访谈 60 人、问卷 800 份）、PRD 与原型设计\n覆盖 3 所高校、注册用户 2 万，座位利用率提升 35%',
        },
      ],
      skills: [
        { name: '产品基本功', level: 4, detail: 'PRD、Axure / 墨刀原型、流程图' },
        { name: '数据分析', level: 4, detail: 'SQL、Excel、AB 实验方法' },
        { name: '用户研究', level: 4, detail: '深度访谈、问卷设计、用户画像' },
        { name: '协作表达', level: 4, detail: '跨职能沟通、汇报与文档能力' },
      ],
    }),
  en: () =>
    makeResume({
      sectionOrder: CAMPUS_SECTION_ORDER,
      basics: {
        name: 'Emma Zhou',
        title: 'Product Manager (New Grad, 2025)',
        email: 'emma.zhou@example.com',
        phone: '+86 151-0000-9900',
        location: 'Guangzhou / Open to relocation',
        summary:
          'Information Management senior (class of 2025) with PM internships at Tencent and Meituan. Independently ran content campaigns that lifted CTR by 12%; led a campus product serving 20K users across 3 universities and won a provincial gold medal in a national innovation competition.',
      },
      education: [
        {
          school: 'Wuhan University',
          degree: 'B.Mgmt. in Information Management',
          major: 'Information Management & Information Systems',
          start: '2021.09',
          end: '2025.06',
          description: 'GPA 3.8/4.0 (top 5%) · First-class Scholarship ×2 · Coursework: data analysis, user behavior, product design',
        },
      ],
      experience: [
        {
          company: 'Tencent',
          role: 'Product Manager Intern (Content Feed)',
          start: '2024.06',
          end: '2024.09',
          location: 'Shenzhen',
          highlights:
            'Independently planned 8 content campaigns; average CTR beat the baseline by 12%\nDelivered 20+ competitive analyses and tracked 15 A/B tests; ranking-strategy proposal was adopted and shipped\nJoined 30+ requirement reviews and wrote 6 PRDs independently',
        },
        {
          company: 'Meituan',
          role: 'Product Operations Intern',
          start: '2023.12',
          end: '2024.03',
          location: 'Beijing',
          highlights:
            'Ran merchant-side campaigns reaching 5,000+ merchants, lifting participation by 8pp\nBuilt a daily campaign-metrics report, cutting manual reporting from 2 hours to 10 minutes',
        },
      ],
      projects: [
        {
          name: 'Campus Study-Room Booking Platform',
          role: 'Product Lead (team of 5)',
          description:
            'Provincial gold medal, national college innovation & entrepreneurship competition\nOwned user research (60 interviews, 800 surveys), PRD and prototyping from scratch\n20K registered users across 3 universities; seat utilization up 35%',
        },
      ],
      skills: [
        { name: 'PM Fundamentals', level: 4, detail: 'PRD, Axure / prototyping, flowcharts' },
        { name: 'Data Analysis', level: 4, detail: 'SQL, Excel, A/B testing methods' },
        { name: 'User Research', level: 4, detail: 'In-depth interviews, survey design, personas' },
        { name: 'Communication', level: 4, detail: 'Cross-functional collaboration, presentations' },
      ],
    }),
}

export default {
  stages: { social, campus },
  recommend: { social: 'timeline', campus: 'campus' },
  placeholders: {
    zh: {
      summary: '例：X 年 B 端产品经验，主导过 0→1 模块……用续费率 / 转化率 / 营收等数据背书',
      highlights: '每行一条，突出业务结果：转化率、留存、营收、效率提升，写清你的角色',
      projectDescription: '项目背景 → 你的方案 → 数据结果（增长 / 转化 / 营收）',
      skillDetail: '写具体工具与方法，如：SQL、AB 实验、Axure',
    },
    en: {
      summary: 'e.g. PM with X years in B2B SaaS, led 0-to-1 modules… back it with renewal / conversion / revenue numbers',
      highlights: 'One per line, business outcomes first: conversion, retention, revenue — state your role clearly',
      projectDescription: 'Context → your approach → measurable results (growth / conversion / revenue)',
      skillDetail: 'Be specific, e.g. SQL, A/B testing, Axure',
    },
  },
}
