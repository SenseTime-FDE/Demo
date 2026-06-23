/* ============================================================
   FDE Demo Hub · 数据配置
   —— 团队成员只需编辑这个文件即可增删 Demo，无需改动其它代码 ——
   ============================================================ */

/* 顶部分类筛选标签。
   每一项的 key 必须与下方 PROJECTS 里 cat 字段对应；
   key 为 "all" 的是「全部」按钮，请保留在第一位。 */
const CATEGORIES = [
  { key: "all",  label: "全部 All" },
  { key: "expo", label: "会展 Expo" },
  { key: "food", label: "餐饮 F&B" },
  { key: "hr",   label: "人力 HR" },
];

/* 顶部统计数字。
   count 为目标数字，会做滚动动画；suffix 是后缀（如 % ）；
   如果想显示符号（如 ∞），用 text 字段代替 count。 */
const STATS = [
  { count: 4,   suffix: "",  label: "Live Demos" },
  { count: 3,   suffix: "",  label: "Industries" },
  { count: 100, suffix: "%", label: "Agent Powered" },
  { text: "∞",               label: "Possibilities" },
];

/* Demo 作品列表。新增一个 Demo = 在数组里加一个对象。
   字段说明：
     cat   —— 所属分类，对应上面 CATEGORIES 的 key
     badge —— 卡片左上角角标文字
     title —— 作品名称
     desc  —— 一句话简介（HR 这类需要密码的可写在这里）
     tags  —— 技术/能力标签数组
     url   —— 线上地址（含中文的链接请先做 encodeURI 编码）
     hue   —— 兜底封面的色相（0-360），仅在预览无法加载时显示
     live  —— 是否显示右上角「Live」实时标识 */
const PROJECTS = [
  {
    cat: "expo",
    badge: "会展 Expo",
    title: "展位推荐 Agent",
    desc: "为参展商智能匹配最优展位，提升招商效率。",
    tags: ["Agent", "推荐系统"],
    url: "https://sensetime-fde.github.io/Demo/%E4%B8%87%E8%80%80%E4%BC%81%E9%BE%99%E5%B1%95%E4%BD%8D%E6%8E%A8%E8%8D%90",
    hue: 210,
    live: true,
  },
  {
    cat: "expo",
    badge: "会展 Expo",
    title: "展位动态定价与推荐 Agent",
    desc: "基于供需的展位动态定价与智能推荐引擎。",
    tags: ["Agent", "动态定价"],
    url: "https://hey-0320-hey.github.io/booth-agent-demo/",
    hue: 268,
    live: true,
  },
  {
    cat: "food",
    badge: "餐饮 F&B",
    title: "点餐推荐助手 Agent",
    desc: "小程序点餐场景下的个性化菜品推荐助手。",
    tags: ["Agent", "小程序"],
    url: "https://sensetime-fde.github.io/Demo/%E7%82%B9%E9%A4%90%E5%8A%A9%E6%89%8B%E5%B0%8F%E7%A8%8B%E5%BA%8FAgent",
    hue: 160,
    live: true,
  },
  {
    cat: "hr",
    badge: "人力 HR",
    title: "HR 招聘 Agent",
    desc: "面向招聘全流程的智能助手。访问密码：ai2026",
    tags: ["Agent", "招聘"],
    url: "https://dashing-narwhal-d1b201.netlify.app/social",
    hue: 286,
    live: true,
  },
];

// 暴露给 main.js（普通 <script> 引入，无需打包工具）
window.FDE_DATA = { CATEGORIES, STATS, PROJECTS };
