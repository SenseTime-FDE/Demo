// ============================================================================
//  声渡 VoxOne · 语音原生 AI 客服 / 销售 / 外呼 一体化平台 —— 后端(Node 内置,零依赖)
//  启动:node server/server.js   (端口默认 5190,可用 PORT 覆盖)
//  能力:静态托管 · 账号登录鉴权 · RBAC(角色×场景) · 共享 SQLite ·
//        SenseAudio V2.0 全双工对话 · 会话留痕与质检 · 统一 Agent 平台对接网关
// ============================================================================
const http = require("node:http");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const db = require("./db.js");
const auth = require("./auth.js");
const rt = require("./realtime.js");

const ROOT = path.join(__dirname, "..");
const PORT = Number(process.env.PORT || 5190);
const SECRET = db.secret();
// 网关令牌:统一 Agent 平台调用 VoxOne 时使用(首启生成并持久化)
if (!db.getMeta("gw_token")) db.setMeta("gw_token", "vx_" + crypto.randomBytes(18).toString("hex"));

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".webp": "image/webp", ".woff2": "font/woff2" };

const send = (res, code, obj, headers) => {
  const body = typeof obj === "string" ? obj : JSON.stringify(obj);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...(headers || {}) });
  res.end(body);
};
// 请求体上限:~12MB 足够容纳一段 15s 语音的 base64,同时挡住(令牌鉴权的语音网关)超大体积滥用
const MAX_BODY = 12 * 1024 * 1024;
const readBody = (req) => new Promise((resolve) => {
  let d = "", len = 0, done = false;
  const finish = (v) => { if (!done) { done = true; resolve(v); } };
  req.on("data", (c) => { if (done) return; len += c.length; if (len > MAX_BODY) { try { req.destroy(); } catch {} return finish({}); } d += c; });
  req.on("end", () => { try { finish(d ? JSON.parse(d) : {}); } catch { finish({}); } });
  req.on("error", () => finish({}));
});

// ---- 鉴权上下文 ------------------------------------------------------------
function ctxOf(req) {
  const h = req.headers["authorization"] || "";
  const tok = h.startsWith("Bearer ") ? h.slice(7) : "";
  const payload = auth.verifyToken(tok, SECRET);
  if (!payload) return null;
  const u = db.getUser(payload.u);
  if (!u) return null;
  return { username: u.username, role: u.role, name: u.name, title: u.title, scenarios: u.scenarios || [], mustChange: !!u.mustChange, perms: auth.permsFor(u.role) };
}
const canScene = (ctx, scenario) => !scenario || scenario === "*" || auth.inScenario(ctx.scenarios, scenario);
const meOf = (ctx) => ({ username: ctx.username, role: ctx.role, roleLabel: ctx.perms.label, name: ctx.name || ctx.username, title: ctx.title || "", scenarios: ctx.scenarios, mustChange: ctx.mustChange, perms: ctx.perms });
const firstScene = (ctx) => (ctx.scenarios || []).filter((x) => x !== "*")[0] || null;
const scopeFilter = (ctx) => (ctx.perms.viewAll ? null : firstScene(ctx));

// ---- 局部改:按 kind 做 RBAC 校验 ------------------------------------------
//  每个 kind → 所需权限 + 是否场景内 + 目标数组 + 主键
const CHANGE = {
  "agent.upsert":   { perm: "manageAgents", list: "agents",    scene: (p) => p.agent?.scenario },
  "agent.toggle":   { perm: "manageAgents", list: "agents" },
  "agent.delete":   { perm: "manageAgents", list: "agents" },
  "kb.upsert":      { perm: "editConfig",   list: "knowledge", scene: (p) => p.kb?.scenario },
  "kb.delete":      { perm: "editConfig",   list: "knowledge" },
  "script.upsert":  { perm: "editConfig",   list: "scripts",   scene: (p) => p.script?.scenario },
  "script.delete":  { perm: "editConfig",   list: "scripts" },
  "script.push":    { perm: "editConfig",   list: "scripts" },
  "voice.upsert":   { perm: "editConfig",   list: "voices" },
  "voice.delete":   { perm: "editConfig",   list: "voices" },
  "campaign.upsert":{ perm: "runOutbound",  list: "campaigns", scene: (p) => p.campaign?.scenario },
  "campaign.toggle":{ perm: "runOutbound",  list: "campaigns" },
  "campaign.delete":{ perm: "runOutbound",  list: "campaigns" },
  "number.upsert":  { perm: "editConfig",   list: "numbers" },
  "number.delete":  { perm: "editConfig",   list: "numbers" },
};

function applyChange(ctx, kind, payload) {
  const spec = CHANGE[kind];
  if (!spec) throw { code: 400, msg: "未知操作 " + kind };
  if (!ctx.perms[spec.perm]) throw { code: 403, msg: "无「" + spec.perm + "」权限" };

  return db.mutate(ctx.username, "change:" + kind, (D) => {
    const arr = D[spec.list] = D[spec.list] || [];
    const isUpsert = kind.endsWith(".upsert");
    const isPush = kind.endsWith(".push");
    const rec = payload[spec.list.replace(/s$/, "")] || null; // agent/kb/script/voice/campaign/number

    // 上架/修改:校验记录归属场景
    if (isUpsert) {
      const sc = spec.scene ? spec.scene(payload) : null;
      if (sc && !canScene(ctx, sc)) throw { code: 403, msg: "无权维护该场景数据" };
      const ex = arr.find((x) => x.id === rec.id);
      if (ex) Object.assign(ex, rec); else arr.unshift({ calls: 0, ...rec });
      return rec.name || rec.title || rec.id;
    }
    // 其余操作按 id 定位并校验其场景
    const id = payload.id;
    const target = arr.find((x) => x.id === id);
    if (kind.endsWith(".delete")) {
      if (target && target.scenario && !canScene(ctx, target.scenario)) throw { code: 403, msg: "无权操作该场景数据" };
      D[spec.list] = arr.filter((x) => x.id !== id);
      return target ? (target.name || target.title || id) : "";
    }
    if (!target) throw { code: 404, msg: "记录不存在" };
    if (target.scenario && !canScene(ctx, target.scenario)) throw { code: 403, msg: "无权操作该场景数据" };
    if (kind === "agent.toggle" || kind === "campaign.toggle") {
      if (kind === "campaign.toggle") target.status = target.status === "running" ? "paused" : "running";
      else target.status = target.status === "on" ? "off" : "on";
      return (target.name || target.title) + "→" + target.status;
    }
    if (isPush) {
      target.pushCount = (target.pushCount || 0) + 1;
      target.pushedAt = new Date().toISOString();
      return target.title;
    }
    throw { code: 400, msg: "未处理 " + kind };
  });
}

// ---- 统一 Agent 平台 · 对接网关(inbound:外部平台调用 VoxOne)-------------
function gwAuth(req, url) {
  const t = req.headers["x-voxone-key"] || url.searchParams.get("token") || "";
  return t && t === db.getMeta("gw_token");
}
function exposedAgents() {
  const { data } = db.getData();
  return (data.agents || []).filter((a) => a.status === "on").map((a) => ({
    id: a.id, name: a.name, scenario: a.scenario, mode: a.mode, channels: a.channel,
    langs: a.langs || [], voice: a.voiceId,
    capability: (a.mode === "outbound" ? "voice.outbound" : a.mode === "sales" ? "conversation.sales" : "conversation.service"),
    endpoint: "/api/agent-gateway/invoke",
    schema: { input: { text: "string", scenario: "string", mode: "string", history: "array", lang: "string" }, output: { text: "string", intent: "string", transfer: "boolean" } },
  }));
}

// ---- 路由 ------------------------------------------------------------------
// 网关跨域头(供嵌入式 widget / 外部统一平台跨源调用)
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, X-Voxone-Key, Authorization", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };

async function api(req, res, url) {
  const p = url.pathname;

  // —— 网关(令牌鉴权,不走登录会话;支持跨源)——
  if (p.startsWith("/api/agent-gateway/") && req.method === "OPTIONS") { res.writeHead(204, CORS); return res.end(); }
  if (p === "/api/agent-gateway/agents" && req.method === "GET") {
    if (!gwAuth(req, url)) return send(res, 401, { error: "gateway token invalid" }, CORS);
    return send(res, 200, { platform: "声渡 VoxOne", version: "1.0", agents: exposedAgents() }, CORS);
  }
  if (p === "/api/agent-gateway/invoke" && req.method === "POST") {
    if (!gwAuth(req, url)) return send(res, 401, { error: "gateway token invalid" }, CORS);
    const b = await readBody(req);
    const r = await rt.reply({ scenario: b.scenario || "ecom", mode: b.mode || "service", agentName: b.agentName || "统一平台调用", history: b.history || [], text: b.text || "", lang: b.lang });
    db.logInteg("invoke", b.from || "统一Agent平台", true, (b.scenario || "") + "/" + (b.mode || "") + " · " + (r.intent || ""));
    return send(res, 200, { reply: r }, CORS);
  }
  // 语音能力自述:嵌入式 widget 用来决定「真实 SenseAudio 语音」还是「浏览器本地语音」
  if (p === "/api/agent-gateway/capabilities" && req.method === "GET") {
    if (!gwAuth(req, url)) return send(res, 401, { error: "gateway token invalid" }, CORS);
    return send(res, 200, { platform: "声渡 VoxOne", version: "1.0", voice: rt.voiceCaps() }, CORS);
  }
  // 真实 TTS:文字 → 语音(令牌鉴权,供嵌入式 widget 跨源调用)
  if (p === "/api/agent-gateway/tts" && req.method === "POST") {
    if (!gwAuth(req, url)) return send(res, 401, { error: "gateway token invalid" }, CORS);
    const b = await readBody(req);
    return send(res, 200, await rt.tts({ text: b.text, voice: b.voice, model: b.model, format: b.format, lang: b.lang }), CORS);
  }
  // 真实 ASR:语音 → 文字(令牌鉴权)
  if (p === "/api/agent-gateway/asr" && req.method === "POST") {
    if (!gwAuth(req, url)) return send(res, 401, { error: "gateway token invalid" }, CORS);
    const b = await readBody(req);
    return send(res, 200, await rt.asr({ audioBase64: b.audioBase64, contentType: b.contentType, filename: b.filename, model: b.model, lang: b.lang }), CORS);
  }

  if (p === "/api/login" && req.method === "POST") {
    const { username, password } = await readBody(req);
    const u = db.getUser(String(username || "").trim());
    if (!u || !auth.verifyPw(password, u.pass)) return send(res, 401, { error: "账号或密码错误" });
    const token = auth.signToken({ u: u.username, r: u.role }, SECRET);
    db.logAudit(u.username, "login", "");
    return send(res, 200, { token, me: meOf({ username: u.username, role: u.role, name: u.name, title: u.title, scenarios: u.scenarios, mustChange: !!u.mustChange, perms: auth.permsFor(u.role) }) });
  }

  const ctx = ctxOf(req);
  if (!ctx) return send(res, 401, { error: "未登录或会话过期" });

  if (p === "/api/bootstrap" && req.method === "GET") {
    const { data, ver } = db.getData();
    const out = { me: meOf(ctx), data, ver, scenarios: auth.SCENARIOS, model: rt.modelConfig(), stats: db.callStats(scopeFilter(ctx)) };
    if (ctx.perms.manageUsers) out.users = db.listUsers();
    if (ctx.perms.manageIntegration || ctx.perms.viewAll) out.gwToken = db.getMeta("gw_token");
    return send(res, 200, out);
  }

  if (p === "/api/password" && req.method === "POST") {
    const { current, next } = await readBody(req);
    const u = db.getUser(ctx.username);
    if (!auth.verifyPw(current, u.pass)) return send(res, 400, { error: "当前密码不正确" });
    if (!next || String(next).length < 6) return send(res, 400, { error: "新密码至少 6 位" });
    if (next === db.DEFAULT_PW) return send(res, 400, { error: "新密码不能与初始密码相同" });
    db.setPassword(ctx.username, next, 0); db.logAudit(ctx.username, "password.change", "");
    return send(res, 200, { ok: true });
  }

  if (p === "/api/change" && req.method === "POST") {
    const { kind, payload } = await readBody(req);
    try { const r = applyChange(ctx, kind, payload || {}); return send(res, 200, { ok: true, ver: r.ver, detail: r.detail }); }
    catch (e) { return send(res, e.code || 500, { error: e.msg || String(e.message || e) }); }
  }

  // —— 全双工对话大脑(SenseAudio V2.0)——
  if (p === "/api/rt/reply" && req.method === "POST") {
    if (!ctx.perms.useWorkbench) return send(res, 403, { error: "无权使用坐席工作台" });
    const b = await readBody(req);
    if (b.scenario && !canScene(ctx, b.scenario)) return send(res, 403, { error: "无权在该场景对话" });
    return send(res, 200, { reply: await rt.reply({ ...b, agentName: b.agentName || ctx.name }) });
  }
  if (p === "/api/rt/health" && req.method === "GET") return send(res, 200, await rt.health());

  // —— 会话留痕 ——
  if (p === "/api/call" && req.method === "POST") {
    if (!ctx.perms.useWorkbench) return send(res, 403, { error: "无权产生会话留痕" });
    const c = await readBody(req);
    if (c.scenario && !canScene(ctx, c.scenario)) return send(res, 403, { error: "无权在该场景留痕" });
    const id = db.insertCall({ ...c, actor: ctx.username, actorName: ctx.name || ctx.username });
    db.logAudit(ctx.username, "call.add", (c.scenario || "") + "/" + (c.intent || ""));
    return send(res, 200, { ok: true, id });
  }
  if (p === "/api/calls" && req.method === "GET") {
    const scenario = url.searchParams.get("scenario") || null;
    if (scenario && !ctx.perms.viewAll && !canScene(ctx, scenario)) return send(res, 403, { error: "无权查看该场景" });
    let rows = db.listCalls({ scenario, mode: url.searchParams.get("mode"), channel: url.searchParams.get("channel"), resolvedBy: url.searchParams.get("resolvedBy"), q: url.searchParams.get("q"), limit: 300 });
    if (!ctx.perms.viewAll) rows = rows.filter((r) => canScene(ctx, r.scenario));
    return send(res, 200, { calls: rows, stats: db.callStats(scopeFilter(ctx)) });
  }
  if (p === "/api/call" && req.method === "GET") {
    const c = db.getCall(url.searchParams.get("id"));
    if (!c) return send(res, 404, { error: "会话不存在" });
    if (!ctx.perms.viewAll && !canScene(ctx, c.scenario)) return send(res, 403, { error: "无权查看" });
    return send(res, 200, { call: c });
  }
  if (p === "/api/qa" && req.method === "POST") {
    if (!ctx.perms.qa) return send(res, 403, { error: "无质检权限" });
    const { id, qaScore, tags } = await readBody(req);
    db.updateCallQA(id, qaScore, tags); db.logAudit(ctx.username, "qa.score", id + "=" + qaScore);
    return send(res, 200, { ok: true });
  }

  // —— SenseAudio V2.0 模型接入 ——
  if (p === "/api/model" && req.method === "POST") {
    if (!ctx.perms.manageModel) return send(res, 403, { error: "无权配置模型接入" });
    const b = await readBody(req); rt.setModelCreds(b); db.logAudit(ctx.username, "model.config", b.endpoint || "");
    return send(res, 200, { ok: true, model: rt.modelConfig() });
  }
  // 货架连通:拉取端点在线模型列表
  if (p === "/api/model/models" && req.method === "GET") {
    if (!(ctx.perms.manageModel || ctx.perms.useWorkbench)) return send(res, 403, { error: "无权限" });
    return send(res, 200, await rt.listModels());
  }
  // 真实 TTS / ASR(接同一端点)
  if (p === "/api/tts" && req.method === "POST") {
    if (!ctx.perms.useWorkbench) return send(res, 403, { error: "无权限" });
    return send(res, 200, await rt.tts(await readBody(req)));
  }
  if (p === "/api/asr" && req.method === "POST") {
    if (!ctx.perms.useWorkbench) return send(res, 403, { error: "无权限" });
    return send(res, 200, await rt.asr(await readBody(req)));
  }

  // —— 统一 Agent 平台对接(outbound:VoxOne → Hub)——
  if (p === "/api/integration" && req.method === "GET") {
    if (!(ctx.perms.manageIntegration || ctx.perms.viewAll)) return send(res, 403, { error: "无权限" });
    const { data } = db.getData();
    return send(res, 200, {
      config: { hubName: (data.integration || {}).hubName || "统一 Agent 管理平台", hubEndpoint: db.getMeta("hub_endpoint", ""), hubTokenSet: !!db.getMeta("hub_token"), selfBase: db.getMeta("self_base", "http://localhost:" + PORT) },
      gateway: { token: db.getMeta("gw_token"), agentsUrl: "/api/agent-gateway/agents", invokeUrl: "/api/agent-gateway/invoke" },
      exposed: exposedAgents(), events: db.recentInteg(40),
    });
  }
  if (p === "/api/integration/config" && req.method === "POST") {
    if (!ctx.perms.manageIntegration) return send(res, 403, { error: "无权限" });
    const b = await readBody(req);
    if (b.hubEndpoint != null) db.setMeta("hub_endpoint", b.hubEndpoint);
    if (b.hubToken) db.setMeta("hub_token", b.hubToken);
    if (b.selfBase != null) db.setMeta("self_base", b.selfBase);
    if (b.hubName) db.mutate(ctx.username, "integration.name", (D) => { D.integration = D.integration || {}; D.integration.hubName = b.hubName; });
    if (b.rotateGw) db.setMeta("gw_token", "vx_" + crypto.randomBytes(18).toString("hex"));
    db.logInteg("config", b.hubEndpoint || "hub", true, "更新对接配置");
    return send(res, 200, { ok: true, gwToken: db.getMeta("gw_token") });
  }
  if (p === "/api/integration/sync" && req.method === "POST") {
    if (!ctx.perms.manageIntegration) return send(res, 403, { error: "无权限" });
    const endpoint = db.getMeta("hub_endpoint", ""); const token = db.getMeta("hub_token", "");
    const selfBase = db.getMeta("self_base", "http://localhost:" + PORT);
    const gwToken = db.getMeta("gw_token");
    const agents = exposedAgents();
    let results = [], hubOk = false, note = "";
    if (!endpoint) {
      note = "未配置 Hub 端点,已本地登记"; results = agents.map((a) => ({ id: a.id, ok: false, note }));
    } else {
      try {
        const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 8000);
        const r = await fetch(endpoint.replace(/\/$/, "") + "/api/external/register", {
          method: "POST", signal: ctrl.signal,
          headers: { "Content-Type": "application/json", "x-ingest-key": token },
          body: JSON.stringify({ source: "voxone", platform: "声渡 VoxOne", callbackBase: selfBase, gwToken, agents }),
        });
        clearTimeout(timer);
        const j = await r.json().catch(() => ({}));
        hubOk = r.ok; note = r.ok ? ("已注册到统一平台 · HTTP " + r.status) : (j.error || ("HTTP " + r.status));
        results = agents.map((a) => ({ id: a.id, ok: r.ok, note }));
      } catch (e) { note = String(e.message || e); results = agents.map((a) => ({ id: a.id, ok: false, note })); }
    }
    db.logInteg("sync", endpoint || "本地登记", hubOk || !endpoint, `注册 ${agents.length} 个 Agent → ${note}`);
    db.mutate(ctx.username, "integration.sync", (D) => { D.integration = D.integration || {}; D.integration.lastSync = new Date().toISOString(); D.integration.exposedCount = agents.length; });
    return send(res, 200, { ok: true, count: agents.length, results });
  }

  if (p === "/api/reset" && req.method === "POST") {
    if (ctx.role !== "superadmin") return send(res, 403, { error: "仅平台管理员可重置" });
    return send(res, 200, { ok: true, ver: db.resetData() });
  }

  // —— 账号与权限 ——
  if (p === "/api/users" && req.method === "GET") { if (!ctx.perms.manageUsers) return send(res, 403, { error: "无权限" }); return send(res, 200, { users: db.listUsers() }); }
  if (p === "/api/users" && req.method === "POST") { if (!ctx.perms.manageUsers) return send(res, 403, { error: "无权限" }); const u = await readBody(req); db.upsertUser(u); db.logAudit(ctx.username, "user.upsert", u.username); return send(res, 200, { ok: true, users: db.listUsers() }); }
  if (p === "/api/users/delete" && req.method === "POST") { if (!ctx.perms.manageUsers) return send(res, 403, { error: "无权限" }); const { username } = await readBody(req); if (username === "admin") return send(res, 400, { error: "不可删除平台管理员" }); db.deleteUser(username); db.logAudit(ctx.username, "user.delete", username); return send(res, 200, { ok: true, users: db.listUsers() }); }
  if (p === "/api/users/resetpw" && req.method === "POST") { if (!ctx.perms.manageUsers) return send(res, 403, { error: "无权限" }); const { username } = await readBody(req); db.setPassword(username, db.DEFAULT_PW, 1); db.logAudit(ctx.username, "user.resetpw", username); return send(res, 200, { ok: true, defaultPw: db.DEFAULT_PW }); }
  if (p === "/api/audit" && req.method === "GET") { if (!(ctx.perms.manageUsers || ctx.perms.viewAll)) return send(res, 403, { error: "无权限" }); return send(res, 200, { audit: db.recentAudit(100) }); }

  return send(res, 404, { error: "未知接口 " + p });
}

// ---- 静态托管(cleanUrls:无扩展名回退 .html)------------------------------
function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === "/") rel = "/login.html";
  if (rel.indexOf("..") >= 0 || rel.startsWith("/server")) return send(res, 403, { error: "forbidden" });
  // 嵌入演示页:注入当前真实网关令牌,避免 DB 重置后 data-token 失效
  const isEmbed = rel === "/embed-demo" || rel === "/embed-demo.html";
  const sendHtml = (buf) => {
    let html = buf.toString("utf8");
    if (isEmbed) html = html.replace(/data-token="[^"]*"/, 'data-token="' + db.getMeta("gw_token") + '"');
    res.writeHead(200, { "Content-Type": MIME[".html"], "Cache-Control": "no-store" });
    res.end(html);
  };
  const file = path.join(ROOT, rel);
  fs.readFile(file, (err, buf) => {
    if (err) {
      if (!path.extname(rel)) return fs.readFile(path.join(ROOT, rel + ".html"), (e2, b2) => { if (e2) return send(res, 404, "Not found"); return sendHtml(b2); });
      return send(res, 404, "Not found");
    }
    if (isEmbed) return sendHtml(buf);
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(buf);
  });
}

http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname.startsWith("/api/")) return api(req, res, url).catch((e) => send(res, 500, { error: String(e.message || e) }));
  serveStatic(req, res, url);
}).listen(PORT, () => {
  console.log(`\n  声渡 VoxOne · 语音原生 AI 平台  →  http://localhost:${PORT}`);
  console.log(`  DB: server/voxone.db  ·  默认密码 ${db.DEFAULT_PW}  ·  网关令牌 ${db.getMeta("gw_token")}\n`);
});
