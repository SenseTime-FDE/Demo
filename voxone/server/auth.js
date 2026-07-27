// ============================================================================
//  声渡 VoxOne · Auth —— scrypt 密码哈希 + HMAC 签名 token(JWT 风格)+ RBAC
//  RBAC 双维度:角色(role) × 业务场景(scenario)。仅用 node:crypto,零第三方依赖
// ============================================================================
const crypto = require("node:crypto");

// ---- 密码:scrypt(salt) ----------------------------------------------------
function hashPw(pw) {
  const salt = crypto.randomBytes(16);
  const dk = crypto.scryptSync(String(pw), salt, 32);
  return salt.toString("hex") + ":" + dk.toString("hex");
}
function verifyPw(pw, stored) {
  try {
    const [s, h] = String(stored).split(":");
    const dk = crypto.scryptSync(String(pw), Buffer.from(s, "hex"), 32);
    return crypto.timingSafeEqual(dk, Buffer.from(h, "hex"));
  } catch { return false; }
}

// ---- token:base64url(payload).hmacSHA256 -----------------------------------
const b64 = (buf) => Buffer.from(buf).toString("base64url");
function signToken(payload, secret, ttlSec = 60 * 60 * 12) {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSec };
  const p = b64(JSON.stringify(body));
  const sig = crypto.createHmac("sha256", secret).update(p).digest("base64url");
  return p + "." + sig;
}
function verifyToken(tok, secret) {
  if (!tok || tok.indexOf(".") < 0) return null;
  const [p, sig] = tok.split(".");
  const expect = crypto.createHmac("sha256", secret).update(p).digest("base64url");
  if (sig.length !== expect.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  let body;
  try { body = JSON.parse(Buffer.from(p, "base64url").toString("utf8")); } catch { return null; }
  if (!body.exp || body.exp < Math.floor(Date.now() / 1000)) return null;
  return body;
}

// ---- 业务场景(行业)—— VoxOne 服务的「各种场景」------------------------------
//  与《声渡VoxOne介绍》第 6 章「重点行业与场景」一致
const SCENARIOS = [
  { id: "ecom",   name: "跨境电商 / 零售",   emoji: "🛒", langs: "英/西/阿/东南亚" },
  { id: "app",    name: "出海 App / 游戏",   emoji: "🎮", langs: "多语种" },
  { id: "fintech",name: "金融科技 / 跨境支付", emoji: "💳", langs: "多语种(强合规)" },
  { id: "local",  name: "本地生活 / 教育",   emoji: "🏫", langs: "中/粤/英" },
  { id: "auto",   name: "汽车 / 保险",       emoji: "🚗", langs: "中/粤/多语种" },
];
const SCENARIO_IDS = SCENARIOS.map((s) => s.id);

// ---- RBAC 权限模型(角色)--------------------------------------------------
//  manageUsers   账号与权限管理
//  manageAgents  Agent 编排 / 上下架 / 绑定 知识库·话术·音色
//  editConfig    维护业务数据(知识库 / 话术 / 音色 / 外呼任务 / 号码线路)
//  runOutbound   发起 / 暂停 外呼任务
//  useWorkbench  坐席工作台:真实产生语音+文本会话、留痕
//  qa            会话质检、打分、洞察
//  manageModel   SenseAudio V2.0 模型接入与音色克隆配置
//  manageIntegration  统一 Agent 管理平台 对接配置
//  viewAll       跨场景可见(否则仅本人所属场景)
const PAGES_ALL = ["index", "omni", "workbench", "service", "sales", "outbound", "agents",
  "knowledge", "voices", "traces", "model", "integration", "users", "settings"];

const PERMS = {
  superadmin: {
    label: "平台管理员", pages: PAGES_ALL,
    manageUsers: true, manageAgents: true, editConfig: true, runOutbound: true,
    useWorkbench: true, qa: true, manageModel: true, manageIntegration: true, viewAll: true,
  },
  ops_admin: { // 运营 / 客户成功 —— 跨场景运营,不含账号与模型密钥管理
    label: "运营管理员", pages: ["index", "omni", "workbench", "service", "sales", "outbound", "agents", "knowledge", "voices", "traces", "integration", "settings"],
    manageUsers: false, manageAgents: true, editConfig: true, runOutbound: true,
    useWorkbench: true, qa: true, manageModel: false, manageIntegration: true, viewAll: true,
  },
  team_lead: { // 坐席主管 —— 仅本场景,可编排与质检
    label: "坐席主管", pages: ["index", "omni", "workbench", "service", "sales", "outbound", "agents", "knowledge", "voices", "traces", "settings"],
    manageUsers: false, manageAgents: true, editConfig: true, runOutbound: true,
    useWorkbench: true, qa: true, manageModel: false, manageIntegration: false, viewAll: false,
  },
  agent: { // 一线坐席 —— 使用工作台、看本人会话
    label: "坐席 / 一线", pages: ["index", "omni", "workbench", "service", "sales", "outbound", "traces", "settings"],
    manageUsers: false, manageAgents: false, editConfig: false, runOutbound: false,
    useWorkbench: true, qa: false, manageModel: false, manageIntegration: false, viewAll: false,
  },
  analyst: { // 质检 / 分析 —— 全局只读 + 质检
    label: "质检 / 分析", pages: ["index", "omni", "service", "sales", "outbound", "traces", "settings"],
    manageUsers: false, manageAgents: false, editConfig: false, runOutbound: false,
    useWorkbench: false, qa: true, manageModel: false, manageIntegration: false, viewAll: true,
  },
  viewer: { // 观察员 —— 只读
    label: "观察员", pages: ["index", "omni", "service", "sales", "outbound", "agents", "knowledge", "voices", "traces", "integration", "settings"],
    manageUsers: false, manageAgents: false, editConfig: false, runOutbound: false,
    useWorkbench: false, qa: false, manageModel: false, manageIntegration: false, viewAll: true,
  },
};
function permsFor(role) { return PERMS[role] || PERMS["agent"]; }

// 该用户是否可操作某场景:'*' 或 场景在其 scenarios 列表内
function inScenario(userScenarios, scenario) {
  const arr = Array.isArray(userScenarios) ? userScenarios : [];
  return arr.includes("*") || arr.includes(scenario);
}

module.exports = {
  hashPw, verifyPw, signToken, verifyToken,
  permsFor, inScenario, PERMS, PAGES_ALL, SCENARIOS, SCENARIO_IDS,
};
