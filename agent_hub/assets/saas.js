/* ============================================================================
   商汤灵犀 · 多租户 SaaS 数据层（业务 Business → 租户 Tenant）
   —— 作为「加层」引入：不改动既有 scenarios/agents/场景业务数据，
      仅新增 businesses / tenants，并把 agent 归属到租户（db 侧规范化）。
   window.SAAS = { businesses:[4], tenants:[N] }
   ============================================================================ */
window.SAAS = {
  product: { name: "商汤灵犀", en: "SenseAgent", org: "商汤科技 · 大模型生态渠道部",
    desc: "一套 AI 产品，搭建 N 个 SaaS 业务；每个业务多租户运营，统一后台管理，声渡提供拟真人 AI 语音。" },

  // ---- 4 个 SaaS 业务（business.id 与既有 scenario.id 对齐：campus/media/eldercare/dining）----
  businesses: [
    { id: "campus", name: "数字校园", product: "商汤灵犀 · 数字校园", icon: "🎓", accent: "#3E7BFA",
      tenantNoun: "学校", tagline: "招生 · 教务 · 家校 · 安全",
      assistant: { name: "校园 AI 助理", persona: "面向师生家长的个人助理" },
      voxone: { enabled: true, platform: "商汤声渡 VoxOne", endpoint: "http://localhost:5190", gwToken: "vox_campus_****", voice: "温柔女声 · 校园客服（拟真人）", latency: "≈480ms", status: "已接入" } },
    { id: "media", name: "数字传媒", product: "商汤灵犀 · 数字传媒", icon: "📡", accent: "#F2603C",
      tenantNoun: "媒体机构", tagline: "采编 · 分发 · 舆情 · 知识库",
      assistant: { name: "采编 AI 助理", persona: "面向记者编辑的个人助理" },
      voxone: { enabled: true, platform: "商汤声渡 VoxOne", endpoint: "http://localhost:5190", gwToken: "见 external", voice: "专业男声 · 新闻播报（拟真人）", latency: "≈420ms", status: "已接入" } },
    { id: "eldercare", name: "智慧养老", product: "商汤灵犀 · 智慧养老", icon: "🧓", accent: "#17B8A6",
      tenantNoun: "养老社区", tagline: "照护 · 家属 · 机构 · 健康",
      assistant: { name: "照护 AI 助理", persona: "面向护理员与家属的个人助理" },
      voxone: { enabled: true, platform: "商汤声渡 VoxOne", endpoint: "http://localhost:5190", gwToken: "vox_elder_****", voice: "亲切女声 · 适老慢速（拟真人）", latency: "≈510ms", status: "已接入" } },
    { id: "dining", name: "数字餐饮", product: "商汤灵犀 · 数字餐饮", icon: "🍽️", accent: "#F5A524",
      tenantNoun: "餐饮企业", tagline: "门店 · 督导 · 点餐 · 食安",
      assistant: { name: "门店 AI 助理", persona: "面向店长店员的个人助理" },
      voxone: { enabled: true, platform: "商汤声渡 VoxOne", endpoint: "http://localhost:5190", gwToken: "vox_dining_****", voice: "热情女声 · 点餐引导（拟真人）", latency: "≈450ms", status: "已接入" } },
  ],

  // ---- 各业务下的企业租户（flagship = 每业务第 1 个，既有 Agent 默认归属它）----
  tenants: [
    // 数字校园
    { id: "t_campus_1", businessId: "campus", name: "北京市第一中学", type: "K12 中学", plan: "旗舰版", status: "在用", region: "北京", contact: "德育处 · 王主任", since: "2026-03", flagship: true },
    { id: "t_campus_2", businessId: "campus", name: "江城实验小学", type: "K12 小学", plan: "专业版", status: "在用", region: "武汉", contact: "教务处 · 李老师", since: "2026-05" },
    { id: "t_campus_3", businessId: "campus", name: "华东理工大学 继续教育学院", type: "高校", plan: "试用", status: "试用", region: "上海", contact: "招生办 · 陈老师", since: "2026-07" },
    // 数字传媒
    { id: "t_media_1", businessId: "media", name: "江城日报社", type: "报业集团", plan: "旗舰版", status: "在用", region: "武汉", contact: "融媒中心 · 周主任", since: "2026-02", flagship: true },
    { id: "t_media_2", businessId: "media", name: "星海广播电视台", type: "广电", plan: "专业版", status: "在用", region: "青岛", contact: "新媒体部 · 林编辑", since: "2026-04" },
    { id: "t_media_3", businessId: "media", name: "都市快讯新媒体", type: "新媒体", plan: "基础版", status: "试用", region: "深圳", contact: "内容运营 · 赵", since: "2026-06" },
    // 智慧养老
    { id: "t_elder_1", businessId: "eldercare", name: "晚晴颐养社区", type: "养老机构", plan: "旗舰版", status: "在用", region: "杭州", contact: "院长 · 马院长", since: "2026-01", flagship: true },
    { id: "t_elder_2", businessId: "eldercare", name: "康乐居家养老中心", type: "居家养老", plan: "专业版", status: "在用", region: "成都", contact: "运营 · 刘主管", since: "2026-04" },
    { id: "t_elder_3", businessId: "eldercare", name: "阳光护理院", type: "护理院", plan: "试用", status: "试用", region: "南京", contact: "护理部 · 陈护士长", since: "2026-07" },
    // 数字餐饮
    { id: "t_dining_1", businessId: "dining", name: "巷子里餐饮连锁", type: "连锁餐饮", plan: "旗舰版", status: "在用", region: "长沙", contact: "运营总监 · 郭总", since: "2026-03", flagship: true },
    { id: "t_dining_2", businessId: "dining", name: "鲜丰轻食", type: "轻食品牌", plan: "专业版", status: "在用", region: "上海", contact: "品牌部 · 孙", since: "2026-05" },
    { id: "t_dining_3", businessId: "dining", name: "老城区中央厨房", type: "中央厨房", plan: "基础版", status: "停用", region: "西安", contact: "厂长 · 张", since: "2026-06" },
  ],
};

// 便捷：某业务的租户 / 旗舰租户
window.SAAS.tenantsOf = (bid) => window.SAAS.tenants.filter((t) => t.businessId === bid);
window.SAAS.flagshipOf = (bid) => (window.SAAS.tenants.find((t) => t.businessId === bid && t.flagship) || window.SAAS.tenantsOf(bid)[0] || {});
