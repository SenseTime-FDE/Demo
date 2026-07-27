// ============================================================================
//  声渡 VoxOne · DB —— node:sqlite(零依赖)
//   app(单行 JSON:业务与配置) + users(账号) + calls(语音/文本会话留痕,真表可增长)
//   + audit(审计) + integ(统一Agent平台对接事件) + meta(密钥/系统配置)
//  仅用 Node 内置 node:sqlite / node:crypto / node:fs / node:path
// ============================================================================
const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");
const fs = require("node:fs");
const auth = require("./auth.js");

const DB_PATH = path.join(__dirname, "voxone.db");
const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS app    (id INTEGER PRIMARY KEY CHECK (id = 1), json TEXT NOT NULL, ver INTEGER NOT NULL DEFAULT 1);
  CREATE TABLE IF NOT EXISTS users  (username TEXT PRIMARY KEY, pass TEXT NOT NULL, role TEXT NOT NULL, scenarios TEXT, name TEXT, title TEXT, mustChange INTEGER DEFAULT 0);
  CREATE TABLE IF NOT EXISTS meta   (k TEXT PRIMARY KEY, v TEXT);
  CREATE TABLE IF NOT EXISTS audit  (id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, actor TEXT, action TEXT, detail TEXT);
  CREATE TABLE IF NOT EXISTS integ  (id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, kind TEXT, target TEXT, ok INTEGER, detail TEXT);
  CREATE TABLE IF NOT EXISTS calls  (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT, scenario TEXT, mode TEXT, channel TEXT, lang TEXT,
    agentId TEXT, agentName TEXT, voiceId TEXT, voiceName TEXT,
    actor TEXT, actorName TEXT, customer TEXT,
    intent TEXT, outcome TEXT, resolvedBy TEXT,
    durationSec INTEGER, turns INTEGER, csat INTEGER, qaScore INTEGER,
    latencyMs INTEGER, bargeIn INTEGER, sopId TEXT, sopTitle TEXT,
    transcript TEXT, tags TEXT
  );
`);

// ---- token 密钥(首次随机生成并持久化)-------------------------------------
function secret() {
  const row = db.prepare("SELECT v FROM meta WHERE k='secret'").get();
  if (row) return row.v;
  const s = require("node:crypto").randomBytes(32).toString("hex");
  db.prepare("INSERT INTO meta (k, v) VALUES ('secret', ?)").run(s);
  return s;
}

// ---- meta 键值(系统配置,如模型密钥/对接令牌)------------------------------
function getMeta(k, def) { const r = db.prepare("SELECT v FROM meta WHERE k=?").get(k); return r ? r.v : (def ?? null); }
function setMeta(k, v) { db.prepare("INSERT INTO meta (k,v) VALUES (?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v").run(k, String(v)); }

// ---- 业务数据种子(复用前端 assets/seed.js,单一数据源)---------------------
function loadSeed() {
  const g = { window: {} };
  const code = fs.readFileSync(path.join(__dirname, "..", "assets", "seed.js"), "utf8");
  new Function("window", code)(g.window);
  return g.window.VX_SEED;
}
function loadSeedData() { return loadSeed().data; }
function loadCallSeed() { return loadSeed().calls || []; }

// ---- 账号种子(默认密码 voxone@2026,首登建议改)---------------------------
const DEFAULT_PW = "voxone@2026";
//        username     role          scenarios                                   name            title
const USER_SEED = [
  ["admin",     "superadmin", ["*"],                                      "韩启微",  "平台管理员 · 大模型生态渠道部"],
  ["ops",       "ops_admin",  ["*"],                                      "周莹",    "运营管理员 · 客户成功"],
  ["lead_ecom", "team_lead",  ["ecom"],                                   "蒋磊",    "跨境电商坐席主管"],
  ["lead_fin",  "team_lead",  ["fintech"],                                "郭强健",  "金融科技坐席主管"],
  ["seat_en",   "agent",      ["ecom", "app"],                            "Aisha",   "多语言坐席 · EN/AR/ID" ],
  ["seat_zh",   "agent",      ["local", "auto"],                          "林向晚",  "中文/粤语坐席"],
  ["qa",        "analyst",    ["*"],                                      "薛佳欣",  "会话质检 / 分析"],
  ["viewer",    "viewer",     ["*"],                                      "访客",    "观察员"],
];

function seedIfEmpty() {
  if (!db.prepare("SELECT 1 FROM app WHERE id=1").get())
    db.prepare("INSERT INTO app (id, json, ver) VALUES (1, ?, 1)").run(JSON.stringify(loadSeedData()));

  if (db.prepare("SELECT COUNT(*) c FROM users").get().c === 0) {
    const ins = db.prepare("INSERT INTO users (username,pass,role,scenarios,name,title,mustChange) VALUES (?,?,?,?,?,?,0)");
    for (const [u, role, sc, name, title] of USER_SEED) ins.run(u, auth.hashPw(DEFAULT_PW), role, JSON.stringify(sc), name, title);
  }

  if (db.prepare("SELECT COUNT(*) c FROM calls").get().c === 0)
    for (const c of loadCallSeed()) insertCall(c);
}

// ---- 业务/配置数据读写 -----------------------------------------------------
function getData() { const r = db.prepare("SELECT json, ver FROM app WHERE id=1").get(); return { data: JSON.parse(r.json), ver: r.ver }; }
function setData(obj, actor, action) {
  const cur = db.prepare("SELECT ver FROM app WHERE id=1").get();
  const ver = (cur ? cur.ver : 0) + 1;
  db.prepare("UPDATE app SET json=?, ver=? WHERE id=1").run(JSON.stringify(obj), ver);
  logAudit(actor, action || "data.replace", "");
  return ver;
}
// 事务式局部改:读→回调改→写
function mutate(actor, action, fn) {
  const { data } = getData();
  const detail = fn(data) || "";
  const ver = setData(data, actor, action);
  return { data, ver, detail };
}

// ---- 会话留痕(真表,可持续增长)------------------------------------------
function insertCall(c) {
  db.prepare(`INSERT INTO calls
    (ts,scenario,mode,channel,lang,agentId,agentName,voiceId,voiceName,actor,actorName,customer,
     intent,outcome,resolvedBy,durationSec,turns,csat,qaScore,latencyMs,bargeIn,sopId,sopTitle,transcript,tags)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(c.ts || new Date().toISOString(), c.scenario || "", c.mode || "service", c.channel || "voice", c.lang || "zh",
      c.agentId || "", c.agentName || "", c.voiceId || "", c.voiceName || "", c.actor || "", c.actorName || "", c.customer || "",
      c.intent || "", c.outcome || "", c.resolvedBy || "ai", Number(c.durationSec || 0), Number(c.turns || 0),
      c.csat == null ? null : Number(c.csat), c.qaScore == null ? null : Number(c.qaScore),
      Number(c.latencyMs || 0), c.bargeIn ? 1 : 0, c.sopId || "", c.sopTitle || "",
      JSON.stringify(c.transcript || []), JSON.stringify(c.tags || []));
  return db.prepare("SELECT last_insert_rowid() id").get().id;
}
function updateCallQA(id, qaScore, tags) {
  db.prepare("UPDATE calls SET qaScore=?, tags=? WHERE id=?").run(Number(qaScore), JSON.stringify(tags || []), Number(id));
}
function listCalls({ scenario, mode, channel, agentId, resolvedBy, q, limit = 200 } = {}) {
  const where = [], args = [];
  if (scenario && scenario !== "*") { where.push("scenario=?"); args.push(scenario); }
  if (mode) { where.push("mode=?"); args.push(mode); }
  if (channel) { where.push("channel=?"); args.push(channel); }
  if (agentId) { where.push("agentId=?"); args.push(agentId); }
  if (resolvedBy) { where.push("resolvedBy=?"); args.push(resolvedBy); }
  if (q) { where.push("(intent LIKE ? OR customer LIKE ? OR transcript LIKE ? OR actorName LIKE ? OR outcome LIKE ?)"); const l = "%" + q + "%"; args.push(l, l, l, l, l); }
  const sql = "SELECT * FROM calls" + (where.length ? " WHERE " + where.join(" AND ") : "") + " ORDER BY id DESC LIMIT ?";
  args.push(Number(limit) || 200);
  return db.prepare(sql).all(...args).map(rowToCall);
}
function getCall(id) { const r = db.prepare("SELECT * FROM calls WHERE id=?").get(Number(id)); return r ? rowToCall(r) : null; }
const rowToCall = (r) => ({ ...r, bargeIn: !!r.bargeIn, transcript: safeParse(r.transcript, []), tags: safeParse(r.tags, []) });

// 会话统计:总量、AI 自主解决率、平均时长/延迟/CSAT/质检、按场景/模式/渠道分布
function callStats(scenarioFilter) {
  const all = listCalls({ scenario: scenarioFilter, limit: 100000 });
  const s = { total: all.length, aiResolved: 0, transferred: 0, byScene: {}, byMode: {}, byChannel: {}, byLang: {},
    sumDur: 0, sumLat: 0, csatN: 0, csatSum: 0, qaN: 0, qaSum: 0, bargeIn: 0 };
  for (const c of all) {
    if (c.resolvedBy === "ai") s.aiResolved++; else if (c.resolvedBy === "human") s.transferred++;
    s.byScene[c.scenario] = (s.byScene[c.scenario] || 0) + 1;
    s.byMode[c.mode] = (s.byMode[c.mode] || 0) + 1;
    s.byChannel[c.channel] = (s.byChannel[c.channel] || 0) + 1;
    s.byLang[c.lang] = (s.byLang[c.lang] || 0) + 1;
    s.sumDur += c.durationSec || 0; s.sumLat += c.latencyMs || 0;
    if (c.csat != null) { s.csatN++; s.csatSum += c.csat; }
    if (c.qaScore != null) { s.qaN++; s.qaSum += c.qaScore; }
    if (c.bargeIn) s.bargeIn++;
  }
  return {
    total: s.total, aiResolved: s.aiResolved, transferred: s.transferred,
    aiResolveRate: s.total ? Math.round((s.aiResolved / s.total) * 1000) / 10 : 0,
    avgDurationSec: s.total ? Math.round(s.sumDur / s.total) : 0,
    avgLatencyMs: s.total ? Math.round(s.sumLat / s.total) : 0,
    avgCsat: s.csatN ? Math.round((s.csatSum / s.csatN) * 10) / 10 : 0,
    avgQa: s.qaN ? Math.round(s.qaSum / s.qaN) : 0,
    bargeIn: s.bargeIn,
    byScene: s.byScene, byMode: s.byMode, byChannel: s.byChannel, byLang: s.byLang,
  };
}
const safeParse = (s, d) => { try { return JSON.parse(s); } catch { return d ?? []; } };

// ---- 用户 ------------------------------------------------------------------
function getUser(username) { const u = db.prepare("SELECT * FROM users WHERE username=?").get(username); if (u) u.scenarios = safeParse(u.scenarios, []); return u; }
function listUsers() {
  return db.prepare("SELECT username,role,scenarios,name,title,mustChange FROM users ORDER BY role, username").all()
    .map((u) => ({ ...u, scenarios: safeParse(u.scenarios, []) }));
}
function setPassword(username, pw, mustChange = 0) { db.prepare("UPDATE users SET pass=?, mustChange=? WHERE username=?").run(auth.hashPw(pw), mustChange ? 1 : 0, username); }
function upsertUser(u) {
  db.prepare(`INSERT INTO users (username,pass,role,scenarios,name,title,mustChange) VALUES (?,?,?,?,?,?,1)
     ON CONFLICT(username) DO UPDATE SET role=excluded.role, scenarios=excluded.scenarios, name=excluded.name, title=excluded.title`)
    .run(u.username, auth.hashPw(u.password || DEFAULT_PW), u.role, JSON.stringify(u.scenarios || []), u.name || null, u.title || null);
}
function deleteUser(username) { db.prepare("DELETE FROM users WHERE username=?").run(username); }

// ---- 审计 & 对接事件 -------------------------------------------------------
function logAudit(actor, action, detail) { db.prepare("INSERT INTO audit (ts,actor,action,detail) VALUES (?,?,?,?)").run(new Date().toISOString(), actor || "?", action || "", detail || ""); }
function recentAudit(n) { return db.prepare("SELECT ts,actor,action,detail FROM audit ORDER BY id DESC LIMIT ?").all(n || 50); }
function logInteg(kind, target, ok, detail) { db.prepare("INSERT INTO integ (ts,kind,target,ok,detail) VALUES (?,?,?,?,?)").run(new Date().toISOString(), kind || "", target || "", ok ? 1 : 0, detail || ""); }
function recentInteg(n) { return db.prepare("SELECT ts,kind,target,ok,detail FROM integ ORDER BY id DESC LIMIT ?").all(n || 50).map((r) => ({ ...r, ok: !!r.ok })); }

seedIfEmpty();

module.exports = {
  secret, getMeta, setMeta, getData, setData, mutate,
  insertCall, updateCallQA, listCalls, getCall, callStats,
  getUser, listUsers, setPassword, upsertUser, deleteUser,
  logAudit, recentAudit, logInteg, recentInteg,
  DEFAULT_PW, USER_SEED,
  resetData: () => { setData(loadSeedData(), "system", "data.reset"); db.exec("DELETE FROM calls"); for (const c of loadCallSeed()) insertCall(c); return getData().ver; },
};
