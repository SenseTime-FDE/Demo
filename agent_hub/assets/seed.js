/* ============================================================================
   统一 Agent 运营中台 · 数据模型种子（前后端单一数据源）
   window.SEED       —— 业务/配置数据（可在页面里增删改，落 SQLite app 表）
   window.TRACE_SEED —— 语音留痕初始记录（落 SQLite traces 真表，可持续增长）
   全部数字为「目标态示意」，用于讲清场景与闭环，非真实经营数据。
   ============================================================================ */
window.SEED = {
  platform: { name: "灵犀 · 统一 Agent 运营中台", short: "SenseAgent Hub", org: "商汤科技 · 大模型生态渠道部", base: "商汤日日新大模型 · SenseAudio 语音底座" },

  // ---- 四大场景（accent 决定该场景的主题强调色）----
  scenarios: [
    { id: "media",     name: "数字传媒", icon: "📡", accent: "#F2603C", tag: "采编·分发·舆情", desc: "采编写作、一键多渠道分发、7×24 舆情监测、热词选题、媒体知识库" },
    { id: "campus",    name: "数字校园", icon: "🎓", accent: "#3E7BFA", tag: "招生·教务·家校", desc: "招生咨询、教务问答、家校沟通、校园安全事件处置" },
    { id: "eldercare", name: "智慧养老", icon: "🧓", accent: "#17B8A6", tag: "照护·家属·机构", desc: "照护助理、家属沟通、机构经营、健康预警与应急处置" },
    { id: "dining",    name: "数字餐饮", icon: "🍽️", accent: "#F5A524", tag: "门店·督导·加盟", desc: "门店督导、点餐推荐、供应链协同、食安巡检与客诉处置" },
  ],

  // ---- Agent 注册表（在「Agent 控制台」上下架 / 编排 / 绑定知识库·SOP）----
  agents: [
    // 数字传媒
    { id: "ag_m_edit",  scenario: "media", name: "采编助理 Agent", role: "记者/编辑", status: "on",  version: "v2.3", calls: 4820, owner: "周莹", updated: "2026-07-14", desc: "语音口述成稿、标题优化、事实核查、一键送审", skills: ["选题建议", "语音写稿", "标题优化", "事实核查", "一键分发"], kbIds: ["kb_m_edit", "kb_m_asset", "kb_m_gov"], sopIds: ["sop_m_review", "sop_m_dist"] },
    { id: "ag_m_senti", scenario: "media", name: "舆情监测 Agent", role: "舆情分析师", status: "on", version: "v3.1", calls: 9130, owner: "周莹", updated: "2026-07-15", desc: "7×24 全网监测、情绪研判、分级预警、处置建议", skills: ["实时监测", "情绪研判", "分级预警", "处置建议", "简报生成"], kbIds: ["kb_m_gov", "kb_m_comp"], sopIds: ["sop_m_senti"] },
    { id: "ag_m_dist",  scenario: "media", name: "内容分发 Agent", role: "新媒体运营", status: "on", version: "v2.0", calls: 3610, owner: "丘晓涵", updated: "2026-07-12", desc: "一键适配多平台文风与规格、定时发布、回执追踪", skills: ["多平台适配", "一键分发", "定时发布", "回执追踪"], kbIds: ["kb_m_asset"], sopIds: ["sop_m_dist"] },
    { id: "ag_m_check", scenario: "media", name: "合规审核 Agent", role: "内容审核", status: "off", version: "v1.4", calls: 1280, owner: "丘晓涵", updated: "2026-07-08", desc: "发布前合规双审、敏感词与口径校验", skills: ["敏感词校验", "口径核对", "风险标注"], kbIds: ["kb_m_comp"], sopIds: ["sop_m_review"] },
    // 数字校园
    { id: "ag_c_enroll", scenario: "campus", name: "招生咨询 Agent", role: "招生老师", status: "on", version: "v1.8", calls: 2140, owner: "蒋磊", updated: "2026-07-13", desc: "招生政策问答、意向登记、线索沉淀", skills: ["政策问答", "意向登记", "线索跟进"], kbIds: ["kb_c_enroll"], sopIds: ["sop_c_enroll"] },
    { id: "ag_c_edu",   scenario: "campus", name: "教务助手 Agent", role: "教务/班主任", status: "on", version: "v1.5", calls: 1760, owner: "蒋磊", updated: "2026-07-10", desc: "课表答疑、请假审批、成绩查询引导", skills: ["课表答疑", "流程引导", "成绩查询"], kbIds: ["kb_c_edu"], sopIds: [] },
    { id: "ag_c_home",  scenario: "campus", name: "家校沟通 Agent", role: "班主任", status: "on", version: "v1.2", calls: 980, owner: "蒋磊", updated: "2026-07-09", desc: "通知触达、家长答疑、投诉受理", skills: ["通知触达", "家长答疑", "投诉受理"], kbIds: ["kb_c_edu"], sopIds: ["sop_c_complain"] },
    { id: "ag_c_safe",  scenario: "campus", name: "校园安全 Agent", role: "安保/德育", status: "off", version: "v1.0", calls: 320, owner: "蒋磊", updated: "2026-07-05", desc: "安全巡查、事件上报与处置引导", skills: ["巡查提醒", "事件上报", "应急引导"], kbIds: [], sopIds: ["sop_c_safe"] },
    // 智慧养老
    { id: "ag_e_care",  scenario: "eldercare", name: "照护助理 Agent", role: "护理员", status: "on", version: "v2.1", calls: 5230, owner: "马强", updated: "2026-07-14", desc: "语音派工、SOP 问答、护理记录、异常上报", skills: ["接单派工", "SOP问答", "语音记录", "异常上报"], kbIds: ["kb_e_care", "kb_e_emerg"], sopIds: ["sop_e_daily", "sop_e_fall"] },
    { id: "ag_e_family",scenario: "eldercare", name: "家属沟通 Agent", role: "客服/社工", status: "on", version: "v1.6", calls: 2410, owner: "马强", updated: "2026-07-11", desc: "家属回访、健康播报、满意度回收", skills: ["家属回访", "健康播报", "满意度回收"], kbIds: ["kb_e_health"], sopIds: ["sop_e_family"] },
    { id: "ag_e_mgr",   scenario: "eldercare", name: "机构管理 Agent", role: "院长/主管", status: "on", version: "v1.9", calls: 1650, owner: "马强", updated: "2026-07-12", desc: "床位与排班调度、经营问数、预警看板", skills: ["排班调度", "经营问数", "预警看板"], kbIds: ["kb_e_care"], sopIds: [] },
    { id: "ag_e_health",scenario: "eldercare", name: "健康提醒 Agent", role: "医护", status: "on", version: "v1.3", calls: 1980, owner: "马强", updated: "2026-07-10", desc: "用药与体征提醒、健康异常预警", skills: ["用药提醒", "体征监测", "异常预警"], kbIds: ["kb_e_health", "kb_e_emerg"], sopIds: ["sop_e_fall"] },
    // 数字餐饮
    { id: "ag_d_super", scenario: "dining", name: "门店督导 Agent", role: "区域督导", status: "on", version: "v1.7", calls: 2680, owner: "郭强健", updated: "2026-07-13", desc: "营业前检查、SOP 巡店、整改跟踪", skills: ["巡店检查", "SOP核对", "整改跟踪"], kbIds: ["kb_d_ops", "kb_d_food"], sopIds: ["sop_d_open", "sop_d_food"] },
    { id: "ag_d_order", scenario: "dining", name: "点餐推荐 Agent", role: "前厅/线上", status: "on", version: "v1.4", calls: 8420, owner: "郭强健", updated: "2026-07-14", desc: "语音点餐、套餐推荐、忌口与过敏识别", skills: ["语音点餐", "套餐推荐", "忌口识别"], kbIds: ["kb_d_menu"], sopIds: [] },
    { id: "ag_d_supply",scenario: "dining", name: "供应链 Agent", role: "采购/仓管", status: "on", version: "v1.1", calls: 1120, owner: "郭强健", updated: "2026-07-09", desc: "订货建议、库存预警、临期提醒", skills: ["订货建议", "库存预警", "临期提醒"], kbIds: ["kb_d_ops"], sopIds: [] },
    { id: "ag_d_join",  scenario: "dining", name: "加盟支持 Agent", role: "加盟顾问", status: "off", version: "v1.0", calls: 460, owner: "郭强健", updated: "2026-07-06", desc: "加盟政策问答、开店进度、话术支持", skills: ["政策问答", "开店进度", "话术支持"], kbIds: ["kb_d_ops"], sopIds: [] },
  ],

  // ---- 知识库 ----
  kbs: [
    { id: "kb_m_edit",  scenario: "media", name: "采编规范库", docs: 128, updated: "2026-07-15", status: "on", desc: "写作规范、体裁模板、署名与版权口径" },
    { id: "kb_m_asset", scenario: "media", name: "媒体素材库", docs: 3400, updated: "2026-07-15", status: "on", desc: "图片/视频/图表素材、可复用通稿模块" },
    { id: "kb_m_gov",   scenario: "media", name: "政务通稿库", docs: 260, updated: "2026-07-14", status: "on", desc: "政策原文、权威口径、领导讲话要点" },
    { id: "kb_m_comp",  scenario: "media", name: "合规口径库", docs: 96, updated: "2026-07-13", status: "on", desc: "敏感词表、宣传纪律、审核红线" },
    { id: "kb_c_enroll",scenario: "campus", name: "招生政策库", docs: 74, updated: "2026-07-12", status: "on", desc: "招生简章、收费标准、常见问答" },
    { id: "kb_c_edu",   scenario: "campus", name: "教务制度库", docs: 152, updated: "2026-07-11", status: "on", desc: "校历课表、请假/成绩流程、家校制度" },
    { id: "kb_e_care",  scenario: "eldercare", name: "照护规范库", docs: 210, updated: "2026-07-14", status: "on", desc: "分级照护标准、护理操作 SOP" },
    { id: "kb_e_health",scenario: "eldercare", name: "健康知识库", docs: 340, updated: "2026-07-13", status: "on", desc: "慢病管理、用药禁忌、体征标准" },
    { id: "kb_e_emerg", scenario: "eldercare", name: "应急处置库", docs: 58, updated: "2026-07-12", status: "on", desc: "跌倒/噎食/急症应急流程" },
    { id: "kb_d_ops",   scenario: "dining", name: "门店运营库", docs: 186, updated: "2026-07-13", status: "on", desc: "开闭店流程、6T 管理、督导标准" },
    { id: "kb_d_menu",  scenario: "dining", name: "菜品知识库", docs: 420, updated: "2026-07-14", status: "on", desc: "菜品配方、忌口过敏、套餐组合" },
    { id: "kb_d_food",  scenario: "dining", name: "食安规范库", docs: 88, updated: "2026-07-12", status: "on", desc: "食品安全法规、留样与追溯、巡检表" },
  ],

  // ---- SOP 库（trigger 触发条件 · priority 优先级 · mustAck 是否强制签收）----
  sops: [
    { id: "sop_m_senti",  scenario: "media", title: "突发舆情处置 SOP", trigger: "舆情热度≥红色/负面激增", priority: "P0", mustAck: true, pushCount: 24, status: "on", steps: ["10 分钟内核实信源与事实", "研判分级并上报总编/宣传口", "拟定统一回应口径", "监测二次传播、留存证据", "30 分钟内更新处置进展"] },
    { id: "sop_m_review", scenario: "media", title: "稿件三审三校 SOP", trigger: "稿件提交送审", priority: "P1", mustAck: true, pushCount: 156, status: "on", steps: ["初审：事实与体裁", "复审：政治与合规口径", "终审：总编签发", "三校：错别字/数据/署名", "归档并进入分发队列"] },
    { id: "sop_m_dist",   scenario: "media", title: "一键分发前合规检查 SOP", trigger: "点击一键分发", priority: "P1", mustAck: false, pushCount: 312, status: "on", steps: ["核对各平台文风与规格", "敏感词与口径终检", "确认发布时间与渠道", "发布并回收各平台回执"] },
    { id: "sop_c_enroll", scenario: "campus", title: "招生接待 SOP", trigger: "新招生咨询进线", priority: "P2", mustAck: false, pushCount: 88, status: "on", steps: ["问候与需求确认", "按政策库标准答复", "登记意向与联系方式", "24 小时内跟进回访"] },
    { id: "sop_c_complain",scenario: "campus", title: "家长投诉处置 SOP", trigger: "识别到投诉/负面情绪", priority: "P1", mustAck: true, pushCount: 41, status: "on", steps: ["安抚并记录诉求", "1 小时内响应", "责任科室处置", "结果回访闭环", "沉淀改进事项"] },
    { id: "sop_c_safe",   scenario: "campus", title: "校园突发事件 SOP", trigger: "上报安全事件", priority: "P0", mustAck: true, pushCount: 12, status: "on", steps: ["现场处置与保护", "上报校领导与相关部门", "通知家长", "记录与复盘"] },
    { id: "sop_e_daily",  scenario: "eldercare", title: "日常照护 SOP", trigger: "每日班次开始", priority: "P2", mustAck: false, pushCount: 640, status: "on", steps: ["晨间查房与体征记录", "按分级完成照护项", "三餐与用药核对", "晚间巡查与交班"] },
    { id: "sop_e_fall",   scenario: "eldercare", title: "跌倒/急症应急 SOP", trigger: "识别到跌倒/健康异常", priority: "P0", mustAck: true, pushCount: 36, status: "on", steps: ["就地评估、勿盲目搬动", "通知医护与主管", "必要时呼叫 120", "通知家属", "记录并复盘"] },
    { id: "sop_e_family", scenario: "eldercare", title: "家属沟通回访 SOP", trigger: "每周家属回访", priority: "P2", mustAck: false, pushCount: 210, status: "on", steps: ["播报本周健康与照护情况", "回应家属关切", "回收满意度", "登记诉求并转办"] },
    { id: "sop_d_open",   scenario: "dining", title: "营业前检查 SOP", trigger: "每日开店", priority: "P2", mustAck: false, pushCount: 520, status: "on", steps: ["设备与环境检查", "食材效期与留样核对", "员工健康与仪容", "系统与收银就绪", "拍照打卡上报"] },
    { id: "sop_d_food",   scenario: "dining", title: "食安突发处置 SOP", trigger: "食安异常/客诉涉食安", priority: "P0", mustAck: true, pushCount: 18, status: "on", steps: ["立即停售留样", "上报督导与食安负责人", "排查批次与追溯", "配合监管、安抚顾客", "复盘整改"] },
  ],

  // ---- 各场景业务数据 ----
  media: {
    channels: [
      { id: "ch_wx", name: "微信公众号", type: "图文", followers: "82.6万", status: "on" },
      { id: "ch_sph", name: "视频号", type: "视频", followers: "45.1万", status: "on" },
      { id: "ch_dy", name: "抖音", type: "视频", followers: "128万", status: "on" },
      { id: "ch_wb", name: "微博", type: "图文/短视频", followers: "63.4万", status: "on" },
      { id: "ch_tt", name: "今日头条", type: "图文", followers: "37.8万", status: "on" },
      { id: "ch_app", name: "客户端 App", type: "全媒体", followers: "自有", status: "on" },
      { id: "ch_web", name: "门户网站", type: "图文", followers: "自有", status: "off" },
    ],
    contents: [
      { id: "ct1", title: "全市数字经济大会今日召开 十条举措发布", status: "已发", author: "采编助理 Agent", channels: ["ch_wx", "ch_sph", "ch_dy", "ch_app"], publishAt: "2026-07-16 08:20", reads: "12.4万" },
      { id: "ct2", title: "台风蓝色预警：出行提示与避险指南", status: "待审", author: "采编助理 Agent", channels: ["ch_wx", "ch_wb", "ch_app"], publishAt: "—", reads: "—" },
      { id: "ct3", title: "本地非遗焕新：一条视频看懂千年古法", status: "草稿", author: "记者·林可", channels: [], publishAt: "—", reads: "—" },
      { id: "ct4", title: "民生实事进展速览（7 月第 3 周）", status: "已发", author: "内容分发 Agent", channels: ["ch_wx", "ch_tt", "ch_app"], publishAt: "2026-07-15 17:40", reads: "6.8万" },
    ],
    sentiment: {
      events: [
        { id: "se1", topic: "某小区停水投诉发酵", polarity: "负", heat: 92, source: "微博/本地论坛", level: "红", handled: false, ts: "2026-07-16 07:50" },
        { id: "se2", topic: "数字经济大会正面反响", polarity: "正", heat: 74, source: "全网", level: "蓝", handled: true, ts: "2026-07-16 09:10" },
        { id: "se3", topic: "公交调线引发讨论", polarity: "中", heat: 55, source: "抖音/评论区", level: "黄", handled: false, ts: "2026-07-15 20:30" },
        { id: "se4", topic: "食品抽检不合格传闻", polarity: "负", heat: 68, source: "微信群/短视频", level: "橙", handled: false, ts: "2026-07-15 15:12" },
      ],
      summary: { pos: 38, neu: 44, neg: 18, alerts: 3 },
    },
    keywords: [
      { word: "数字经济大会", heat: 9820, trend: "up", related: ["十条举措", "招商", "算力"] },
      { word: "停水", heat: 6410, trend: "up", related: ["某小区", "抢修", "投诉"] },
      { word: "台风预警", heat: 5230, trend: "up", related: ["避险", "停课", "航班"] },
      { word: "非遗焕新", heat: 2140, trend: "flat", related: ["古法", "文旅", "短视频"] },
      { word: "公交调线", heat: 1870, trend: "down", related: ["出行", "意见", "听证"] },
    ],
    board: {
      kpis: [
        { k: "本周发稿", v: "148", u: "篇", d: "+12%" },
        { k: "全网阅读", v: "326", u: "万", d: "+8%" },
        { k: "分发渠道", v: "6", u: "个", d: "覆盖率 92%" },
        { k: "舆情预警", v: "3", u: "起", d: "待处置" },
        { k: "正面率", v: "82", u: "%", d: "+3pt" },
      ],
      series: { reads: [42, 51, 48, 63, 58, 72, 66], dist: [{ n: "微信", v: 34 }, { n: "抖音", v: 28 }, { n: "视频号", v: 18 }, { n: "微博", v: 12 }, { n: "头条", v: 8 }] },
    },
  },

  campus: {
    leads: [
      { id: "cl1", name: "王同学家长", grade: "初一", intent: "高", channel: "招生咨询 Agent", status: "待回访", ts: "2026-07-16 09:20" },
      { id: "cl2", name: "李同学家长", grade: "高一", intent: "中", channel: "官网", status: "已登记", ts: "2026-07-15 16:00" },
      { id: "cl3", name: "赵同学家长", grade: "小升初", intent: "高", channel: "招生咨询 Agent", status: "已转化", ts: "2026-07-14 11:30" },
    ],
    notices: [
      { id: "cn1", title: "期末家长会通知", to: "全校家长", status: "已推送", read: "94%", ts: "2026-07-15 18:00" },
      { id: "cn2", title: "暑期安全告知书", to: "全校家长", status: "已推送", read: "88%", ts: "2026-07-14 17:00" },
    ],
    events: [
      { id: "cev1", type: "家长投诉", title: "食堂菜品建议", level: "黄", status: "处置中", ts: "2026-07-16 08:10" },
      { id: "cev2", type: "安全", title: "校门口交通疏导", level: "蓝", status: "已闭环", ts: "2026-07-15 07:40" },
    ],
    board: {
      kpis: [
        { k: "本周咨询", v: "64", u: "人次", d: "+9%" },
        { k: "意向转化", v: "38", u: "%", d: "+5pt" },
        { k: "家校触达", v: "92", u: "%", d: "阅读率" },
        { k: "安全事件", v: "2", u: "起", d: "均已响应" },
      ],
      series: { consult: [8, 12, 9, 14, 11, 16, 13], funnel: [{ n: "咨询", v: 64 }, { n: "登记", v: 41 }, { n: "到校", v: 28 }, { n: "报名", v: 19 }] },
    },
  },

  eldercare: {
    residents: [
      { id: "er1", name: "张秀兰", bed: "3-08", level: "半失能", risk: "跌倒中风险", status: "在护" },
      { id: "er2", name: "李国强", bed: "2-15", level: "失能", risk: "压疮高风险", status: "在护" },
      { id: "er3", name: "王桂芳", bed: "1-06", level: "自理", risk: "低", status: "在护" },
    ],
    tasks: [
      { id: "et1", bed: "3-08", item: "上午翻身+体征", owner: "护理员·刘敏", status: "已完成", ts: "2026-07-16 09:00" },
      { id: "et2", bed: "2-15", item: "压疮护理", owner: "护理员·陈涛", status: "进行中", ts: "2026-07-16 10:00" },
      { id: "et3", bed: "1-06", item: "用药提醒", owner: "健康提醒 Agent", status: "已推送", ts: "2026-07-16 08:30" },
    ],
    alerts: [
      { id: "ea1", bed: "2-15", type: "体征异常", detail: "血压偏高 162/98", level: "橙", status: "已通知医护", ts: "2026-07-16 07:20" },
      { id: "ea2", bed: "3-08", type: "跌倒预警", detail: "夜间离床未归", level: "红", status: "处置中", ts: "2026-07-16 03:10" },
    ],
    board: {
      kpis: [
        { k: "在护老人", v: "186", u: "人", d: "入住率 93%" },
        { k: "照护完成", v: "98.2", u: "%", d: "+1.4pt" },
        { k: "家属满意", v: "4.8", u: "/5", d: "回收 91%" },
        { k: "健康预警", v: "2", u: "起", d: "均已响应" },
      ],
      series: { done: [96, 97, 98, 98, 97, 99, 98], care: [{ n: "生活照护", v: 42 }, { n: "医疗护理", v: 26 }, { n: "康复", v: 16 }, { n: "精神慰藉", v: 16 }] },
    },
  },

  dining: {
    stores: [
      { id: "ds1", name: "旗舰店·中心广场", area: "华东", sales: "8.6万", status: "营业", check: "已巡" },
      { id: "ds2", name: "加盟店·科技园", area: "华东", sales: "4.2万", status: "营业", check: "待整改" },
      { id: "ds3", name: "直营店·老城区", area: "华南", sales: "5.1万", status: "营业", check: "已巡" },
    ],
    inspections: [
      { id: "di1", store: "科技园店", item: "冷藏温度超标", level: "橙", status: "整改中", ts: "2026-07-16 08:40" },
      { id: "di2", store: "中心广场店", item: "留样记录完整", level: "蓝", status: "合格", ts: "2026-07-16 08:00" },
    ],
    dishes: [
      { id: "dm1", name: "招牌牛肉套餐", price: 38, tag: "热销", stock: "充足" },
      { id: "dm2", name: "低卡轻食碗", price: 32, tag: "新品", stock: "充足" },
      { id: "dm3", name: "儿童营养餐", price: 28, tag: "推荐", stock: "临期提醒" },
    ],
    board: {
      kpis: [
        { k: "在营门店", v: "42", u: "家", d: "+3 家" },
        { k: "今日营业额", v: "186", u: "万", d: "+6%" },
        { k: "客单价", v: "43", u: "元", d: "+2 元" },
        { k: "食安合格", v: "96", u: "%", d: "待整改 2 家" },
      ],
      series: { sales: [120, 138, 132, 150, 146, 172, 186], cat: [{ n: "套餐", v: 46 }, { n: "单品", v: 30 }, { n: "饮品", v: 14 }, { n: "甜品", v: 10 }] },
    },
  },

  // 推送记录（sop.push 会 unshift 到这里）
  pushLog: [
    { ts: "2026-07-16 07:52", sopId: "sop_m_senti", title: "突发舆情处置 SOP", scenario: "media", by: "传媒场景管理员·周莹", to: "舆情值班组" },
    { ts: "2026-07-16 03:12", sopId: "sop_e_fall", title: "跌倒/急症应急 SOP", scenario: "eldercare", by: "机构管理 Agent", to: "2-15 床责任护理员" },
    { ts: "2026-07-16 08:41", sopId: "sop_d_food", title: "食安突发处置 SOP", scenario: "dining", by: "门店督导 Agent", to: "科技园店店长" },
  ],
};

/* ---- 语音留痕初始记录（落 traces 真表；transcript 为逐条会话）---- */
window.TRACE_SEED = [
  {
    ts: "2026-07-16 07:51", scenario: "media", agentId: "ag_m_senti", agentName: "舆情监测 Agent",
    actor: "media_seat", actorName: "传媒坐席·小编阿林", channel: "voice", intent: "舆情预警核实",
    sopId: "sop_m_senti", sopTitle: "突发舆情处置 SOP", duration: 96, result: "已上报总编·启动处置",
    transcript: [
      { who: "agent", text: "检测到「某小区停水投诉」1 小时内热度上涨 92，情绪偏负，已达红色预警。" },
      { who: "user", text: "信源核实了吗？先给我处置口径。" },
      { who: "agent", text: "信源：微博 3 条 + 本地论坛 1 帖。已按《突发舆情处置 SOP》推送 5 步流程，第一步 10 分钟内核实信源与事实。" },
      { who: "agent", text: "建议统一回应：已联系供水部门，抢修预计 11:00 恢复。是否生成简报报总编？" },
      { who: "user", text: "生成，抄送宣传口。" },
    ],
  },
  {
    ts: "2026-07-16 08:18", scenario: "media", agentId: "ag_m_edit", agentName: "采编助理 Agent",
    actor: "media_seat", actorName: "传媒坐席·小编阿林", channel: "voice", intent: "语音写稿+一键分发",
    sopId: "sop_m_dist", sopTitle: "一键分发前合规检查 SOP", duration: 142, result: "4 渠道发布成功",
    transcript: [
      { who: "user", text: "把数字经济大会的通稿改成公众号、视频号、抖音、客户端四个版本。" },
      { who: "agent", text: "已生成 4 版：公众号 1200 字图文、视频号 60 秒脚本、抖音竖版快剪、客户端全文。触发一键分发前合规检查。" },
      { who: "agent", text: "敏感词与口径终检通过，发布时间 08:20。确认发布？" },
      { who: "user", text: "确认。" },
      { who: "agent", text: "4 渠道发布成功，回执已回收，实时阅读 12.4 万。" },
    ],
  },
  {
    ts: "2026-07-16 03:11", scenario: "eldercare", agentId: "ag_e_care", agentName: "照护助理 Agent",
    actor: "media_seat", actorName: "护理员·刘敏", channel: "voice", intent: "跌倒预警处置",
    sopId: "sop_e_fall", sopTitle: "跌倒/急症应急 SOP", duration: 88, result: "已就地处置·通知家属",
    transcript: [
      { who: "agent", text: "3-08 床张秀兰夜间离床未归，触发跌倒预警。已推送《跌倒/急症应急 SOP》。" },
      { who: "user", text: "我到现场了，老人坐在卫生间地上，意识清醒。" },
      { who: "agent", text: "第一步：就地评估，勿盲目搬动。已同步通知值班医护。需要呼叫 120 吗？" },
      { who: "user", text: "暂时不用，医护马上到。" },
      { who: "agent", text: "好的，已登记事件并通知家属，稍后请补充处置记录。" },
    ],
  },
  {
    ts: "2026-07-16 09:22", scenario: "campus", agentId: "ag_c_enroll", agentName: "招生咨询 Agent",
    actor: "campus_admin", actorName: "校园场景管理员·蒋磊", channel: "voice", intent: "招生政策咨询",
    sopId: "sop_c_enroll", sopTitle: "招生接待 SOP", duration: 74, result: "登记高意向线索",
    transcript: [
      { who: "user", text: "初一转学插班还有名额吗？学费怎么算？" },
      { who: "agent", text: "初一年级尚有插班名额，学费与住宿标准我按政策库为您播报……已登记您的意向为「高」。" },
      { who: "agent", text: "已按招生接待 SOP 记录联系方式，招生老师将于 24 小时内回访。" },
    ],
  },
  {
    ts: "2026-07-16 08:42", scenario: "dining", agentId: "ag_d_super", agentName: "门店督导 Agent",
    actor: "dining_admin", actorName: "餐饮场景管理员·郭强健", channel: "voice", intent: "巡店食安整改",
    sopId: "sop_d_food", sopTitle: "食安突发处置 SOP", duration: 110, result: "冷藏整改·限时复检",
    transcript: [
      { who: "agent", text: "科技园店巡检发现冷藏温度 12℃ 超标，触发食安处置。已推送 SOP 给店长。" },
      { who: "user", text: "涉及哪些菜品？先停售。" },
      { who: "agent", text: "涉及 3 个冷藏批次，已建议立即停售留样。整改要求：2 小时内复检温度并上报，我会跟踪闭环。" },
    ],
  },
];
