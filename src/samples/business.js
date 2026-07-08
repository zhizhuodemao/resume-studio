import { makeResume, CAMPUS_SECTION_ORDER } from './builder.js'

const social = {
  zh: () =>
    makeResume({
      basics: {
        name: '沈之衡',
        title: '高级财务分析师',
        email: 'zhiheng.shen@example.com',
        phone: '135-0000-7788',
        location: '深圳',
        summary:
          '6 年财务分析经验（4 年制造业 + 2 年事务所），CPA 持证。擅长经营分析与预算管理：搭建的月度经营看板将结账-出报周期从 10 天缩短至 5 天，主导的成本优化专项年节约 1200 万。',
      },
      experience: [
        {
          company: '迅达集团',
          role: '高级财务分析师',
          start: '2021.09',
          end: '',
          location: '深圳',
          highlights:
            '负责 3 个事业部经营分析，搭建月度经营看板（PowerBI），结账-出报周期从 10 天缩短至 5 天\n通过量价拆解识别供应链降本机会，推动采购与产线改善，年节约成本 1200 万\n主导年度预算编制与季度滚动预测（盘子 8 亿），预测偏差控制在 5% 以内\n牵头 ERP 财务模块升级的业务侧落地，覆盖 12 个法人主体',
        },
        {
          company: '德勤华永会计师事务所',
          role: '审计员',
          start: '2019.08',
          end: '2021.08',
          location: '广州',
          highlights:
            '参与 10+ 家上市及拟上市公司年报审计，独立负责收入、存货等核心科目\n参与 1 单 IPO 项目全程，负责三年一期收入穿行测试与底稿编制',
        },
      ],
      projects: [
        {
          name: '集团费用管控体系搭建',
          role: '项目负责人',
          description:
            '设计费用预算-审批-分析闭环制度，上线费控系统并推广至全集团\n可控费用率同比下降 1.8 个百分点，报销平均时效从 7 天缩短至 2 天',
        },
      ],
      education: [
        {
          school: '厦门大学',
          degree: '管理学学士',
          major: '会计学',
          start: '2015.09',
          end: '2019.06',
          description: 'CPA 全科通过（2021）· 优秀毕业生',
        },
      ],
      skills: [
        { name: '财务分析', level: 5, detail: '经营分析、预算与滚动预测、量价拆解' },
        { name: 'Excel / PowerBI', level: 5, detail: '财务建模、自动化报表' },
        { name: 'ERP 系统', level: 4, detail: 'SAP FICO、用友 NC' },
        { name: '专业资质', level: 4, detail: 'CPA 持证、税务与准则功底扎实' },
      ],
    }),
  en: () =>
    makeResume({
      basics: {
        name: 'Victor Shen',
        title: 'Senior Financial Analyst',
        email: 'victor.shen@example.com',
        phone: '+86 135-0000-7788',
        location: 'Shenzhen, China',
        summary:
          'Financial analyst with 6 years of experience (4 in manufacturing FP&A, 2 in audit), CPA certified. Built a monthly performance dashboard that cut the close-to-report cycle from 10 to 5 days; led a cost program saving ¥12M annually.',
      },
      experience: [
        {
          company: 'Xunda Group',
          role: 'Senior Financial Analyst',
          start: '2021.09',
          end: '',
          location: 'Shenzhen',
          highlights:
            'Own FP&A for 3 business units; built the monthly performance dashboard in PowerBI, cutting close-to-report from 10 to 5 days\nIdentified supply-chain savings via price-volume analysis, driving ¥12M annual cost reduction\nLed annual budgeting and quarterly rolling forecasts (¥800M scope) with forecast variance within 5%\nDrove business-side rollout of the ERP finance module across 12 legal entities',
        },
        {
          company: 'Deloitte',
          role: 'Audit Associate',
          start: '2019.08',
          end: '2021.08',
          location: 'Guangzhou',
          highlights:
            'Audited 10+ listed and pre-IPO companies, independently owning revenue and inventory sections\nWorked a full IPO engagement, responsible for revenue walkthroughs and workpapers across three years',
        },
      ],
      projects: [
        {
          name: 'Group Expense Control Framework',
          role: 'Project Lead',
          description:
            'Designed the budget-approval-analysis loop and rolled out an expense system group-wide\nControllable expense ratio down 1.8pp YoY; average reimbursement time cut from 7 days to 2',
        },
      ],
      education: [
        {
          school: 'Xiamen University',
          degree: 'B.Mgmt. in Accounting',
          major: 'Accounting',
          start: '2015.09',
          end: '2019.06',
          description: 'CPA (all sections passed, 2021) · Outstanding Graduate',
        },
      ],
      skills: [
        { name: 'Financial Analysis', level: 5, detail: 'FP&A, budgeting & rolling forecasts, price-volume analysis' },
        { name: 'Excel / PowerBI', level: 5, detail: 'Financial modeling, automated reporting' },
        { name: 'ERP Systems', level: 4, detail: 'SAP FICO, Yonyou NC' },
        { name: 'Credentials', level: 4, detail: 'CPA; solid grounding in tax and accounting standards' },
      ],
    }),
}

const campus = {
  zh: () =>
    makeResume({
      sectionOrder: CAMPUS_SECTION_ORDER,
      basics: {
        name: '赵子萱',
        title: '商业分析 / 管培生（2025 届）',
        email: 'zixuan.zhao@example.com',
        phone: '152-0000-1122',
        location: '广州 / 可到岗一线城市',
        summary:
          '2025 届金融学本科（GPA 前 3%），普华永道、联合利华两段实习。审计实习独立完成 3 个科目底稿；市场实习完成 30 家门店调研并输出的陈列优化建议被区域采纳。CFA 一级通过，擅长用数据讲清商业问题。',
      },
      education: [
        {
          school: '中山大学',
          degree: '经济学学士',
          major: '金融学',
          start: '2021.09',
          end: '2025.06',
          description: 'GPA 3.9/4.0（专业前 3%）· 一等奖学金 ×2 · CFA 一级通过 · 全国大学生市场调查大赛国家二等奖',
        },
      ],
      experience: [
        {
          company: '普华永道',
          role: '审计实习生',
          start: '2024.01',
          end: '2024.04',
          location: '广州',
          highlights:
            '参与 2 家上市公司年报审计，独立完成货币资金、费用等 3 个科目底稿\n协助执行函证程序 200+ 份，回函差异全部完成核查说明\n获项目经理书面推荐信',
        },
        {
          company: '联合利华',
          role: '市场部实习生',
          start: '2023.06',
          end: '2023.09',
          location: '广州',
          highlights:
            '支持新品上市项目，完成 30 家零售门店实地调研与竞品价格追踪\n输出的货架陈列优化建议被区域团队采纳，试点门店销量提升 12%\n搭建周度销售数据模板，减少团队 50% 的重复统计工作',
        },
      ],
      projects: [
        {
          name: '校学生会外联部',
          role: '部长（20 人团队）',
          description:
            '牵头年度校园文化节招商，签约 12 家品牌、拉取赞助 15 万元，创历年新高\n建立赞助商分级合作与复盘机制，次年续约率 70%',
        },
      ],
      skills: [
        { name: 'Excel / PPT', level: 4, detail: '数据透视、财务建模入门、商业汇报' },
        { name: '数据分析', level: 4, detail: 'SPSS、Python 基础、问卷与调研设计' },
        { name: '英语', level: 4, detail: '六级 620 / 雅思 7.0，可工作语言' },
        { name: '专业资质', level: 3, detail: 'CFA 一级通过、备考 CPA' },
      ],
    }),
  en: () =>
    makeResume({
      sectionOrder: CAMPUS_SECTION_ORDER,
      basics: {
        name: 'Cynthia Zhao',
        title: 'Business Analyst / Management Trainee (New Grad, 2025)',
        email: 'cynthia.zhao@example.com',
        phone: '+86 152-0000-1122',
        location: 'Guangzhou / Open to relocation',
        summary:
          'Finance senior (class of 2025, top 3% GPA) with internships at PwC and Unilever. Independently completed 3 audit sections; retail-audit recommendations from a 30-store field study were adopted regionally. CFA Level I passed; strong at turning data into business narratives.',
      },
      education: [
        {
          school: 'Sun Yat-sen University',
          degree: 'B.Econ. in Finance',
          major: 'Finance',
          start: '2021.09',
          end: '2025.06',
          description: 'GPA 3.9/4.0 (top 3%) · First-class Scholarship ×2 · CFA Level I · National runner-up, college market research competition',
        },
      ],
      experience: [
        {
          company: 'PwC',
          role: 'Audit Intern',
          start: '2024.01',
          end: '2024.04',
          location: 'Guangzhou',
          highlights:
            'Supported year-end audits of 2 listed companies; independently completed 3 workpaper sections (cash, expenses)\nExecuted 200+ confirmation procedures and reconciled all response variances\nReceived a written recommendation from the engagement manager',
        },
        {
          company: 'Unilever',
          role: 'Marketing Intern',
          start: '2023.06',
          end: '2023.09',
          location: 'Guangzhou',
          highlights:
            'Supported a product launch with field research across 30 retail stores and competitor price tracking\nShelf-display recommendations adopted by the regional team; pilot-store sales up 12%\nBuilt a weekly sales-data template, cutting repetitive reporting work by 50%',
        },
      ],
      projects: [
        {
          name: 'Student Union — External Relations',
          role: 'Department Head (team of 20)',
          description:
            'Led sponsorship for the annual campus festival: 12 brand deals and ¥150K raised, an all-time record\nBuilt a tiered sponsor program with post-event reviews; 70% renewal the following year',
        },
      ],
      skills: [
        { name: 'Excel / PPT', level: 4, detail: 'Pivot tables, intro financial modeling, business decks' },
        { name: 'Data Analysis', level: 4, detail: 'SPSS, basic Python, survey design' },
        { name: 'English', level: 4, detail: 'CET-6 620 / IELTS 7.0, working proficiency' },
        { name: 'Credentials', level: 3, detail: 'CFA Level I passed; preparing for CPA' },
      ],
    }),
}

export default {
  stages: { social, campus },
  recommend: { social: 'classic', campus: 'campus' },
  placeholders: {
    zh: {
      summary: '例：X 年财务 / 咨询经验……突出专业资质（CPA / CFA）与量化成果',
      highlights: '每行一条：负责范围 + 改进动作 + 量化结果（节约成本、缩短周期、准确率）',
      projectDescription: '项目角色 → 你的产出 → 结果（金额、效率、采纳情况）',
      skillDetail: '写具体工具与资质，如：Excel 建模、SAP、CPA',
    },
    en: {
      summary: 'e.g. Finance professional with X years… highlight credentials (CPA / CFA) and quantified wins',
      highlights: 'One per line: scope + action + quantified result (savings, cycle time, accuracy)',
      projectDescription: 'Your role → deliverables → results (amounts, efficiency, adoption)',
      skillDetail: 'Be specific, e.g. Excel modeling, SAP, CPA',
    },
  },
}
