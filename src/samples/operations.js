import { makeResume } from './builder.js'

const social = {
  zh: () =>
    makeResume({
      basics: {
        name: '韩雪莉',
        title: '内容运营负责人',
        email: 'xueli.han@example.com',
        phone: '136-0000-3344',
        location: '成都',
        website: 'xiaohongshu.com/user/hanxueli',
        summary:
          '5 年内容与用户运营经验，专注小红书 / 抖音双平台增长。累计孵化 3 个百万粉账号，单条视频最高 1200 万播放；搭建的内容 SOP 将爆款率从 5% 提升至 22%。既能亲自下场做内容，也能带团队规模化复制。',
      },
      experience: [
        {
          company: '花漾文化',
          role: '内容运营负责人',
          start: '2022.05',
          end: '',
          location: '成都',
          highlights:
            '从 0 搭建小红书账号矩阵（5 个账号），12 个月累计粉丝 180 万，稳居美妆垂类头部\n建立选题-脚本-拍摄-投放全流程 SOP，爆款率（单篇曝光 10w+）从 5% 提升至 22%\n管理 4 人内容团队，月产出 120+ 条，人均产能提升 60%\n主导品牌合作提案，年度商单营收 800 万，复购品牌占比 55%',
        },
        {
          company: '优选电商',
          role: '用户运营',
          start: '2019.06',
          end: '2022.04',
          location: '成都',
          highlights:
            '负责私域运营，企业微信用户 15 万，月均 GMV 300 万\n设计会员分层权益体系，90 天复购率提升 9 个百分点\n策划年度会员日活动，单场 ROI 1:8，创部门纪录',
        },
      ],
      projects: [
        {
          name: '「城市漫游指南」本地生活 IP',
          role: '项目发起人',
          description:
            '联合 20+ 本地商家打造城市探店内容 IP，全网累计曝光 5000 万\n带动合作商家平均到店客流提升 30%，项目入选平台年度优秀案例',
        },
      ],
      education: [
        {
          school: '浙江传媒学院',
          degree: '文学学士',
          major: '网络与新媒体',
          start: '2015.09',
          end: '2019.06',
          description: '校新媒体中心主编',
        },
      ],
      skills: [
        { name: '内容策划', level: 5, detail: '短视频脚本、图文种草、选题体系' },
        { name: '投放增长', level: 4, detail: '千川 / 聚光投放、ROI 优化' },
        { name: '数据复盘', level: 4, detail: '飞瓜 / 灰豚、内容归因分析' },
        { name: '私域运营', level: 4, detail: '企业微信、社群分层、会员体系' },
      ],
    }),
  en: () =>
    makeResume({
      basics: {
        name: 'Sherry Han',
        title: 'Content & Growth Lead',
        email: 'sherry.han@example.com',
        phone: '+86 136-0000-3344',
        location: 'Chengdu, China',
        website: 'linkedin.com/in/sherryhan',
        summary:
          'Content and user-growth operator with 5 years on short-video and community platforms. Grew 3 accounts past 1M followers with a single-video record of 12M views; built a content SOP that raised the hit rate (100K+ views) from 5% to 22%. Hands-on creator who also scales teams.',
      },
      experience: [
        {
          company: 'Huayang Culture',
          role: 'Content Operations Lead',
          start: '2022.05',
          end: '',
          location: 'Chengdu',
          highlights:
            'Built a 5-account content matrix from scratch, reaching 1.8M total followers in 12 months — top tier in the beauty vertical\nCreated an end-to-end SOP (topics, scripts, production, paid boost), lifting the viral-hit rate from 5% to 22%\nManaged a 4-person team producing 120+ pieces monthly; output per head up 60%\nLed brand-partnership pitches generating ¥8M annual revenue with a 55% repeat rate',
        },
        {
          company: 'Youxuan E-commerce',
          role: 'User Operations',
          start: '2019.06',
          end: '2022.04',
          location: 'Chengdu',
          highlights:
            'Ran private-domain channels with 150K WeCom users and ¥3M monthly GMV\nDesigned a tiered membership program, lifting 90-day repurchase rate by 9pp\nPlanned the annual member-day campaign with a record 1:8 ROI',
        },
      ],
      projects: [
        {
          name: 'City Wander Guide — Local Lifestyle IP',
          role: 'Initiator',
          description:
            'Co-created a city-exploration content IP with 20+ local merchants; 50M total impressions\nDrove a 30% average uplift in partner store traffic; selected as a platform case study of the year',
        },
      ],
      education: [
        {
          school: 'Communication University of Zhejiang',
          degree: 'B.A.',
          major: 'Network & New Media',
          start: '2015.09',
          end: '2019.06',
          description: 'Editor-in-chief of the campus new-media center',
        },
      ],
      skills: [
        { name: 'Content Strategy', level: 5, detail: 'Short-video scripting, seeding posts, topic systems' },
        { name: 'Paid Growth', level: 4, detail: 'Ad platform campaigns, ROI optimization' },
        { name: 'Analytics', level: 4, detail: 'Content attribution, third-party data tools' },
        { name: 'Private Domain', level: 4, detail: 'WeCom, community tiers, membership programs' },
      ],
    }),
}

export default {
  stages: { social },
  recommend: { social: 'duotone' },
  placeholders: {
    zh: {
      summary: '例：X 年内容 / 用户运营经验，擅长……用粉丝量、GMV、爆款率等数据背书',
      highlights: '每行一条，用数据说话：曝光、粉丝增长、转化率、GMV、ROI',
      projectDescription: '项目背景 → 你的打法 → 数据结果（曝光 / 增长 / 转化）',
      skillDetail: '写具体平台与工具，如：千川投放、企微私域、飞瓜数据',
    },
    en: {
      summary: 'e.g. Growth/content operator with X years… back it with followers, GMV, hit-rate numbers',
      highlights: 'One per line, numbers first: impressions, follower growth, conversion, GMV, ROI',
      projectDescription: 'Context → your playbook → measurable results (reach / growth / conversion)',
      skillDetail: 'Be specific, e.g. ad platforms, WeCom, analytics tools',
    },
  },
}
