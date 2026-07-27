// ============================================================================
//  DB · node:sqlite —— app(单行 JSON 业务/配置) + users(账号) + traces(语音留痕)
//                      + audit(审计) + meta(密钥)
//  零依赖：仅用 Node 内置 node:sqlite / node:crypto / node:fs / node:path
// ============================================================================
const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");
const fs = require("node:fs");
const auth = require("./auth.js");

const DB_PATH = path.join(__dirname, "hub.db");
const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS app    (id INTEGER PRIMARY KEY CHECK (id = 1), json TEXT NOT NULL, ver INTEGER NOT NULL DEFAULT 1);
  CREATE TABLE IF NOT EXISTS users  (username TEXT PRIMARY KEY, pass TEXT NOT NULL, role TEXT NOT NULL, scenarios TEXT, tenantId TEXT, name TEXT, mustChange INTEGER DEFAULT 0);
  CREATE TABLE IF NOT EXISTS meta   (k TEXT PRIMARY KEY, v TEXT);
  CREATE TABLE IF NOT EXISTS audit  (id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, actor TEXT, action TEXT, detail TEXT);
  CREATE TABLE IF NOT EXISTS traces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT, scenario TEXT, agentId TEXT, agentName TEXT, actor TEXT, actorName TEXT,
    channel TEXT, intent TEXT, sopId TEXT, sopTitle TEXT, duration INTEGER,
    result TEXT, transcript TEXT
  );
`);

// ---- token 密钥（首次随机生成并持久化）-------------------------------------
function secret() {
  const row = db.prepare("SELECT v FROM meta WHERE k='secret'").get();
  if (row) return row.v;
  const s = require("node:crypto").randomBytes(32).toString("hex");
  db.prepare("INSERT INTO meta (k, v) VALUES ('secret', ?)").run(s);
  return s;
}
// 通用 meta 键值(用于外部平台对接的接入密钥等)
function getMeta(k, def) { const r = db.prepare("SELECT v FROM meta WHERE k=?").get(k); return r ? r.v : (def ?? null); }
function setMeta(k, v) { db.prepare("INSERT INTO meta (k,v) VALUES (?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v").run(k, String(v)); }

// ---- 载入业务数据种子（复用前端 assets/seed.js，单一数据源）-----------------
function loadSeedData() {
  const g = { window: {} };
  const code = fs.readFileSync(path.join(__dirname, "..", "assets", "seed.js"), "utf8");
  new Function("window", code)(g.window);
  return g.window.SEED;
}
function loadTraceSeed() {
  const g = { window: {} };
  const code = fs.readFileSync(path.join(__dirname, "..", "assets", "seed.js"), "utf8");
  new Function("window", code)(g.window);
  return g.window.TRACE_SEED || [];
}
// 多租户 SaaS 数据层（assets/saas.js）
function loadSaas() {
  const g = { window: {} };
  const code = fs.readFileSync(path.join(__dirname, "..", "assets", "saas.js"), "utf8");
  new Function("window", code)(g.window);
  return g.window.SAAS;
}

// ---- 账号种子（默认密码 hub@2026，首登建议改）------------------------------
const DEFAULT_PW = "hub@2026";
//        username        role          scenarios              name
const USER_SEED = [
  ["admin",       "superadmin",  ["*"],                        "平台管理员·韩启微"],
  ["media_admin", "scene_admin", ["media"],                    "传媒场景管理员·周莹"],
  ["media_op",    "operator",    ["media"],                    "传媒运营·丘晓涵"],
  ["media_seat",  "agent_user",  ["media"],                    "传媒坐席·小编阿林"],
  ["campus_admin","scene_admin", ["campus"],                   "校园场景管理员·蒋磊"],
  ["elder_admin", "scene_admin", ["eldercare"],                "养老场景管理员·马强"],
  ["dining_admin","scene_admin", ["dining"],                   "餐饮场景管理员·郭强健"],
  ["ops_all",     "operator",    ["media","campus","eldercare","dining"], "跨场景运营·王新源"],
  ["viewer",      "viewer",      ["*"],                        "观察员·访客"],
];

// 多租户账号种子（业务×租户×角色）—— 覆盖旧账号，v2 统一口径
//        username        role             scenarios(业务域)          tenantId       name
const SAAS_USER_SEED = [
  ["admin",       "platform_op",   ["*"],                     null,        "灵犀平台运营 · 韩启微"],
  ["campus_biz",  "business_admin",["campus"],                null,        "数字校园 业务管理员 · 蒋磊"],
  ["media_biz",   "business_admin",["media"],                 null,        "数字传媒 业务管理员 · 周莹"],
  ["elder_biz",   "business_admin",["eldercare"],             null,        "智慧养老 业务管理员 · 马强"],
  ["dining_biz",  "business_admin",["dining"],                null,        "数字餐饮 业务管理员 · 郭强健"],
  ["media_t1",    "tenant_admin",  ["media"],                 "t_media_1", "江城日报社 · 融媒中心周主任"],
  ["campus_t1",   "tenant_admin",  ["campus"],                "t_campus_1","北京市第一中学 · 德育处王主任"],
  ["elder_t1",    "tenant_admin",  ["eldercare"],             "t_elder_1", "晚晴颐养社区 · 马院长"],
  ["dining_t1",   "tenant_admin",  ["dining"],                "t_dining_1","巷子里餐饮连锁 · 郭总"],
  ["media_seat",  "frontline",     ["media"],                 "t_media_1", "江城日报 · 记者林可"],
  ["campus_seat", "frontline",     ["campus"],                "t_campus_1","北京一中 · 李老师"],
  ["elder_seat",  "frontline",     ["eldercare"],             "t_elder_1", "晚晴社区 · 护理员刘敏"],
  ["dining_seat", "frontline",     ["dining"],                "t_dining_1","巷子里门店 · 店员小张"],
  ["viewer",      "viewer",        ["*"],                     null,        "观察员 · 访客"],
];

function seedIfEmpty() {
  const hasApp = db.prepare("SELECT 1 FROM app WHERE id=1").get();
  if (!hasApp) db.prepare("INSERT INTO app (id, json, ver) VALUES (1, ?, 1)").run(JSON.stringify(loadSeedData()));

  const tCount = db.prepare("SELECT COUNT(*) c FROM traces").get().c;
  if (tCount === 0) {
    for (const t of loadTraceSeed()) insertTrace(t);
  }
}

// —— v2 多租户迁移（幂等）：加 businesses/tenants 层、把 Agent 归属到租户、统一账号 ——
function migrateSaas() {
  try { db.exec("ALTER TABLE users ADD COLUMN tenantId TEXT"); } catch (e) { /* 已有列 */ }
  const { data } = getData();
  if (!data.businesses) {
    const S = loadSaas();
    data.businesses = S.businesses;
    data.tenants = S.tenants;
    const flag = {};
    S.tenants.forEach((t) => { if (t.flagship) flag[t.businessId] = t.id; });
    S.businesses.forEach((b) => { if (!flag[b.id]) { const f = S.tenants.find((t) => t.businessId === b.id); if (f) flag[b.id] = f.id; } });
    (data.agents || []).forEach((a) => { a.businessId = a.businessId || a.scenario; if (!a.tenantId) a.tenantId = flag[a.scenario] || null; });
    if (!data.modelConfig) data.modelConfig = { enabled: {}, default: "" };
    setData(data, "system", "saas.migrate");
  }
  if (getMeta("saas_users_v") !== "2") {
    db.exec("DELETE FROM users");
    const ins = db.prepare("INSERT INTO users (username, pass, role, scenarios, tenantId, name, mustChange) VALUES (?,?,?,?,?,?,1)");
    for (const [u, role, sc, tid, name] of SAAS_USER_SEED) ins.run(u, auth.hashPw(DEFAULT_PW), role, JSON.stringify(sc), tid, name);
    setMeta("saas_users_v", "2");
  }
}

// ---- 业务/配置数据读写 -----------------------------------------------------
function getData() {
  const row = db.prepare("SELECT json, ver FROM app WHERE id=1").get();
  return { data: JSON.parse(row.json), ver: row.ver };
}
function setData(obj, actor, action) {
  const cur = db.prepare("SELECT ver FROM app WHERE id=1").get();
  const ver = (cur ? cur.ver : 0) + 1;
  db.prepare("UPDATE app SET json=?, ver=? WHERE id=1").run(JSON.stringify(obj), ver);
  logAudit(actor, action || "data.replace", "");
  return ver;
}
// 事务式局部改：读→回调改→写
function mutate(actor, action, fn) {
  const { data } = getData();
  const detail = fn(data) || "";
  const ver = setData(data, actor, action);
  return { data, ver, detail };
}

// ---- 语音留痕（真表，可持续增长）------------------------------------------
function insertTrace(t) {
  db.prepare(`INSERT INTO traces
     (ts, scenario, agentId, agentName, actor, actorName, channel, intent, sopId, sopTitle, duration, result, transcript)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(t.ts || new Date().toISOString(), t.scenario || "", t.agentId || "", t.agentName || "",
      t.actor || "", t.actorName || "", t.channel || "voice", t.intent || "",
      t.sopId || "", t.sopTitle || "", Number(t.duration || 0), t.result || "",
      JSON.stringify(t.transcript || []));
  return db.prepare("SELECT last_insert_rowid() id").get().id;
}
function listTraces({ scenario, agentId, actor, q, limit = 200 } = {}) {
  const where = [], args = [];
  if (scenario && scenario !== "*") { where.push("scenario=?"); args.push(scenario); }
  if (agentId) { where.push("agentId=?"); args.push(agentId); }
  if (actor) { where.push("actor=?"); args.push(actor); }
  if (q) { where.push("(intent LIKE ? OR transcript LIKE ? OR sopTitle LIKE ? OR actorName LIKE ?)"); const like = "%" + q + "%"; args.push(like, like, like, like); }
  const sql = "SELECT * FROM traces" + (where.length ? " WHERE " + where.join(" AND ") : "") + " ORDER BY id DESC LIMIT ?";
  args.push(Number(limit) || 200);
  return db.prepare(sql).all(...args).map((r) => ({ ...r, transcript: safeParse(r.transcript) }));
}
function traceStats(scenarioFilter) {
  const all = listTraces({ scenario: scenarioFilter, limit: 100000 });
  const byScene = {}, bySop = {};
  let sopHits = 0;
  for (const t of all) {
    byScene[t.scenario] = (byScene[t.scenario] || 0) + 1;
    if (t.sopId) { sopHits++; bySop[t.sopTitle] = (bySop[t.sopTitle] || 0) + 1; }
  }
  return { total: all.length, sopHits, byScene, bySop };
}
const safeParse = (s) => { try { return JSON.parse(s); } catch { return []; } };

// ---- 用户 ------------------------------------------------------------------
function getUser(username) {
  const u = db.prepare("SELECT * FROM users WHERE username=?").get(username);
  if (u) u.scenarios = safeParse(u.scenarios);
  return u;
}
function listUsers() {
  return db.prepare("SELECT username, role, scenarios, tenantId, name, mustChange FROM users ORDER BY role, username").all()
    .map((u) => ({ ...u, scenarios: safeParse(u.scenarios) }));
}
function setPassword(username, pw, mustChange = 0) { db.prepare("UPDATE users SET pass=?, mustChange=? WHERE username=?").run(auth.hashPw(pw), mustChange ? 1 : 0, username); }
function upsertUser(u) {
  db.prepare(`INSERT INTO users (username,pass,role,scenarios,tenantId,name,mustChange) VALUES (?,?,?,?,?,?,1)
     ON CONFLICT(username) DO UPDATE SET role=excluded.role, scenarios=excluded.scenarios, tenantId=excluded.tenantId, name=excluded.name`)
    .run(u.username, auth.hashPw(u.password || DEFAULT_PW), u.role, JSON.stringify(u.scenarios || []), u.tenantId || null, u.name || null);
}
function deleteUser(username) { db.prepare("DELETE FROM users WHERE username=?").run(username); }

function logAudit(actor, action, detail) {
  db.prepare("INSERT INTO audit (ts, actor, action, detail) VALUES (?,?,?,?)")
    .run(new Date().toISOString(), actor || "?", action || "", detail || "");
}
function recentAudit(n) { return db.prepare("SELECT ts, actor, action, detail FROM audit ORDER BY id DESC LIMIT ?").all(n || 50); }

seedIfEmpty();
migrateSaas();

module.exports = {
  secret, getMeta, setMeta, getData, setData, mutate,
  insertTrace, listTraces, traceStats,
  getUser, listUsers, setPassword, upsertUser, deleteUser,
  logAudit, recentAudit, DEFAULT_PW, USER_SEED, SAAS_USER_SEED,
  resetData: () => { setData(loadSeedData(), "system", "data.reset"); db.exec("DELETE FROM traces"); for (const t of loadTraceSeed()) insertTrace(t); migrateSaas(); return getData().ver; },
};
