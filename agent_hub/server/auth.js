// ============================================================================
//  Auth · scrypt 密码哈希 + HMAC 签名 token（JWT 风格）+ RBAC（角色 × 场景）
//  仅用 node:crypto，无第三方依赖
// ============================================================================
const crypto = require("node:crypto");

// ---- 密码：scrypt(salt) ----------------------------------------------------
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

// ---- token：base64url(payload).hmacSHA256 ----------------------------------
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

// ---- RBAC v2 权限模型（角色 × 业务 Business × 租户 Tenant）------------------
//  scope           platform(全平台) / business(单业务) / tenant(单租户) / frontline(一线)
//  home            登录后落地页
//  manageBusinesses  开通/停用业务（仅平台运营）
//  manageTenants   增删改租户、给租户分配 Agent
//  manageAgents    Agent 编排 / 上下架 / 绑定
//  manageUsers     账号与权限管理
//  manageVoxone    配置声渡（拟真人语音）接入
//  editConfig      编辑业务/场景数据、知识库、SOP
//  pushSop         推送 SOP；useAgent 使用 Agent/AI助理并留痕；viewAll 跨业务只读
//  业务归属：user.scenarios（['*'] 或 ['media']）；租户归属：user.tenantId
const SCENE_PAGES = ["media", "media_agent", "media_miniapp", "media_board",
  "campus", "campus_agent", "campus_miniapp", "campus_board",
  "eldercare", "eldercare_agent", "eldercare_miniapp", "eldercare_board",
  "dining", "dining_agent", "dining_miniapp", "dining_board"];
const OP_PAGES = ["operator", "businesses", "tenants", "voxone", "models", "trace", "kb", "sop", "integration", "settings"];
const BIZ_PAGES = ["business", "voxone", "models", "trace", "kb", "sop", "integration", "assistant"];
const TEN_PAGES = ["tenant", "assistant", "trace"];
const FRONT_SCENE = SCENE_PAGES.filter((p) => /_agent$|_miniapp$/.test(p));
const ALL_PAGES = [...new Set([...OP_PAGES, ...BIZ_PAGES, "business", "tenant", "assistant", ...SCENE_PAGES])];

const PERMS = {
  platform_op: { label: "平台运营", scope: "platform", home: "operator", pages: ALL_PAGES,
    manageBusinesses: true, manageTenants: true, manageAgents: true, manageUsers: true, manageVoxone: true, editConfig: true, pushSop: true, useAgent: true, viewAll: true },
  business_admin: { label: "业务管理员", scope: "business", home: "business", pages: [...BIZ_PAGES, ...SCENE_PAGES],
    manageBusinesses: false, manageTenants: true, manageAgents: true, manageUsers: false, manageVoxone: true, editConfig: true, pushSop: true, useAgent: true, viewAll: false },
  tenant_admin: { label: "租户管理员", scope: "tenant", home: "tenant", pages: [...TEN_PAGES, ...SCENE_PAGES],
    manageBusinesses: false, manageTenants: false, manageAgents: true, manageUsers: false, manageTenantUsers: true, manageVoxone: false, editConfig: false, pushSop: false, useAgent: true, viewAll: false },
  frontline: { label: "一线用户", scope: "frontline", home: "assistant", pages: ["assistant", ...FRONT_SCENE],
    manageBusinesses: false, manageTenants: false, manageAgents: false, manageUsers: false, manageVoxone: false, editConfig: false, pushSop: false, useAgent: true, viewAll: false },
  viewer: { label: "观察员", scope: "platform", home: "operator", pages: [...OP_PAGES, "business", "tenant", "assistant", ...SCENE_PAGES],
    manageBusinesses: false, manageTenants: false, manageAgents: false, manageUsers: false, manageVoxone: false, editConfig: false, pushSop: false, useAgent: false, viewAll: true },
};
function permsFor(role) { return PERMS[role] || PERMS["frontline"]; }

// 业务归属：'*' 或 业务在其 scenarios 列表内（scenario.id === business.id）
function inScenario(userScenarios, scenario) {
  const arr = Array.isArray(userScenarios) ? userScenarios : [];
  return arr.includes("*") || arr.includes(scenario);
}
const inBusiness = inScenario;

module.exports = { hashPw, verifyPw, signToken, verifyToken, permsFor, inScenario, inBusiness, PERMS, ALL_PAGES, SCENE_PAGES, OP_PAGES };
